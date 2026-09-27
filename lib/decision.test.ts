import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

import { buildDecisionContext, classifyCase, readReleaseRecommendation, recommendRelease, type DecisionContextInput } from "./decision";
import { requiredDocuments } from "./rules/checklist";
import { mergeClassification } from "./rules/merge";
import { calculateRisk } from "./rules/risk";
import { NO_FLAGS } from "./rules/services";

const risk = calculateRisk(["ELECTRICAL", "MASONRY_DEMOLITION"], NO_FLAGS); // ALTO, 70, exige ART
const rules = { ...risk, requiredDocs: requiredDocuments(risk) };

const input: DecisionContextInput = {
  services: ["Elétrica", "Demolição de alvenaria"],
  flags: NO_FLAGS,
  description: "Integrar cozinha e sala derrubando a parede.",
  plannedStart: new Date("2026-10-20"),
  plannedEnd: null,
  contractorName: "Construtora Bom Lar",
  condominium: { city: "São Paulo", state: "SP" },
  rules,
  professional: { name: "Eng. Carla", type: "ENGINEER", registration: "CREA-SP 1", artNumber: "123" },
  documents: [{ type: "ART_RRT", status: "PENDING", fileName: "art.pdf", reviewNote: null }],
  history: [{ type: "status_changed", fromStatus: null, toStatus: "DRAFT", message: "Obra criada", createdAt: new Date("2026-09-27") }],
};

const originalFetch = globalThis.fetch;
let calls: { url: string; body: { questions: Record<string, unknown> } }[] = [];

function fakeJulia(handler: (body: { questions: Record<string, unknown> }) => unknown, status = 200) {
  globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    calls.push({ url: String(url), body });
    return new Response(JSON.stringify(handler(body)), { status, headers: { "Content-Type": "application/json" } });
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  calls = [];
  process.env.JULIA_URL = "http://julia.test/";
  process.env.JULIA_TIMEOUT_MS = "200";
  process.env.JULIA_MIN_CONFIDENCE = "0.6";
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.JULIA_URL;
});

describe("buildDecisionContext", () => {
  it("manda o piso da tabela e nada de PII do morador", () => {
    const ctx = buildDecisionContext(input);
    expect(ctx.piso_da_tabela).toEqual({
      nivel_de_risco: "Alto",
      pontuacao: 70,
      exige_art_rrt: true,
      documentos_obrigatorios: ["Termo de responsabilidade", "ART/RRT", "Memorial descritivo"],
    });
    expect(JSON.stringify(ctx)).not.toMatch(/email|telefone|cpf/i);
    expect(ctx.documentos[0]).toEqual({ tipo: "ART/RRT", situacao: "aguardando conferência", arquivo: "art.pdf", nota: null });
  });
});

describe("classifyCase", () => {
  it("sem JULIA_URL não chama nada e devolve só as regras", async () => {
    delete process.env.JULIA_URL;
    fakeJulia(() => ({}));
    const d = await classifyCase(input);
    expect(d.ok).toBe(false);
    expect(d.julia).toBeNull();
    expect(calls).toHaveLength(0);
    expect(mergeClassification(rules, d.julia).classifiedBy).toBe("rules");
  });

  it("faz as perguntas certas: nível, ART e um noul por documento que a tabela não pede", async () => {
    fakeJulia(() => ({ answers: {} }));
    await classifyCase(input);
    expect(calls[0]!.url).toBe("http://julia.test/v1/decide");
    expect(Object.keys(calls[0]!.body.questions)).toEqual(["risk_level", "requires_art", "doc_PROJECT", "doc_SCHEDULE", "doc_TEAM_LIST"]);
    expect(calls[0]!.body.questions.risk_level).toMatchObject({ type: "score", criteria: ["Baixo", "Médio", "Alto", "Crítico"] });
  });

  it("resposta válida: sobe o nível, acrescenta documento e a justificativa traz as probabilidades", async () => {
    fakeJulia(() => ({
      answers: {
        risk_level: { type: "score", probabilities: { Baixo: 0.01, Médio: 0.04, Alto: 0.25, Crítico: 0.7 }, score: 2.64, max_probability: 0.7 },
        requires_art: { type: "noul", probabilities: { false: 0.05, true: 0.95 }, noul: 0.95 },
        doc_PROJECT: { type: "noul", probabilities: [0.3, 0.7], noul: 0.7 },
        doc_SCHEDULE: { type: "noul", probabilities: [0.6, 0.4], noul: 0.4 },
        doc_TEAM_LIST: { type: "noul", probabilities: [0.45, 0.55], noul: 0.55 }, // abaixo da confiança mínima
      },
    }));
    const d = await classifyCase(input);
    expect(d.ok).toBe(true);
    expect(d.julia).toEqual({
      level: "CRITICAL",
      requiresArt: true,
      requiredDocs: ["RESPONSIBILITY_TERM", "ART_RRT", "DESCRIPTIVE_MEMORIAL", "PROJECT"],
      guidance: [],
      reason: "nível Crítico (70%); exige ART/RRT: sim (95%); exigir Projeto (70%)",
    });
    const merged = mergeClassification(rules, d.julia);
    expect(merged.level).toBe("CRITICAL");
    expect(merged.addedByJulia?.docs).toEqual(["PROJECT"]);
  });

  it("abaixo da confiança mínima, registra mas não aplica", async () => {
    fakeJulia(() => ({
      answers: { risk_level: { type: "score", probabilities: { Baixo: 0.1, Médio: 0.2, Alto: 0.3, Crítico: 0.4 } } },
    }));
    const d = await classifyCase(input);
    expect(d.julia?.level).toBe("HIGH");
    expect(d.justification).toBe("nível Crítico (40%)");
  });

  it("tentativa de dispensar ART e reduzir o nível é ignorada pelo merge", async () => {
    fakeJulia(() => ({
      answers: {
        risk_level: { type: "score", probabilities: { Baixo: 0.9, Médio: 0.05, Alto: 0.03, Crítico: 0.02 } },
        requires_art: { type: "noul", probabilities: { false: 0.97, true: 0.03 }, noul: 0.03 },
      },
    }));
    const d = await classifyCase(input);
    expect(d.julia?.requiresArt).toBe(true); // a Julia só pode ligar, nunca desligar
    expect(d.julia?.level).toBe("LOW"); // o que ela disse…
    const merged = mergeClassification(rules, d.julia); // …mas o piso vale
    expect(merged.level).toBe("HIGH");
    expect(merged.requiresArt).toBe(true);
    expect(merged.requiredDocs).toContain("ART_RRT");
  });

  it("resposta inválida (não passa no Zod) é ignorada com erro", async () => {
    fakeJulia(() => ({ answers: { risk_level: { type: "score", probabilities: "muitas" } } }));
    const d = await classifyCase(input);
    expect(d.ok).toBe(false);
    expect(d.error).toMatch(/resposta inválida/);
    expect(d.julia).toBeNull();
  });

  it("HTTP 500 é ignorado com erro", async () => {
    fakeJulia(() => ({ detail: "boom" }), 500);
    const d = await classifyCase(input);
    expect(d.ok).toBe(false);
    expect(d.error).toBe("HTTP 500");
  });

  it("timeout é ignorado com erro e não trava", async () => {
    globalThis.fetch = mock(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
        }),
    ) as unknown as typeof fetch;
    const d = await classifyCase(input);
    expect(d.ok).toBe(false);
    expect(d.error).toMatch(/timeout após 200 ms/);
    expect(d.julia).toBeNull();
  });
});

describe("recommendRelease", () => {
  it("devolve a opção mais provável com as probabilidades", async () => {
    fakeJulia(() => ({
      answers: {
        release: { type: "choice", probabilities: { approve: 0.2, approve_with_conditions: 0.61, request_changes: 0.15, reject: 0.04 }, choice: "approve_with_conditions", max_probability: 0.61 },
      },
    }));
    const d = await recommendRelease(input);
    expect(d.ok).toBe(true);
    expect(d.recommendation).toMatchObject({ recommendation: "approve_with_conditions", confidence: 0.61, justification: "Liberar c/ condições (61%)" });
    expect(Object.keys(calls[0]!.body.questions)).toEqual(["release"]);
    // o que foi gravado volta a ser lido do JSON
    expect(readReleaseRecommendation(JSON.parse(JSON.stringify(d.recommendation)))).toEqual(d.recommendation);
    expect(readReleaseRecommendation({ foo: 1 })).toBeNull();
  });

  it("resposta sem a pergunta é erro", async () => {
    fakeJulia(() => ({ answers: {} }));
    const d = await recommendRelease(input);
    expect(d.ok).toBe(false);
    expect(d.recommendation).toBeNull();
  });
});

describe("judgeDocument (Decisão 2)", () => {
  const doc = { type: "ART_RRT" as const, fileName: "art.pdf", text: "ART Nº 123 Carla Nunes elétrica", problems: ['Serviço "Demolição de alvenaria" não aparece na ART/RRT'] };

  it("manda texto e problemas no contexto e devolve o parecer com probabilidades", async () => {
    fakeJulia(() => ({ answers: { verdict: { type: "choice", probabilities: { approve: 0.3, reject: 0.7 }, choice: "reject", max_probability: 0.7 } } }));
    const { judgeDocument } = await import("./decision");
    const d = await judgeDocument({ ...input, document: doc });
    expect(d.ok).toBe(true);
    expect(d.verdict).toMatchObject({ verdict: "reject", confidence: 0.7, justification: "reprovar (70%)" });
    const body = calls[0]!.body as unknown as { state: { documento_em_analise: { texto: string; problemas_encontrados: string[] } } };
    expect(body.state.documento_em_analise.texto).toBe(doc.text);
    expect(body.state.documento_em_analise.problemas_encontrados).toEqual(doc.problems);
    expect(Object.keys(calls[0]!.body.questions)).toEqual(["verdict"]);
  });

  it("sem texto legível, avisa no contexto em vez de mandar vazio", async () => {
    fakeJulia(() => ({ answers: { verdict: { type: "choice", probabilities: [0.8, 0.2], choice: "approve" } } }));
    const { judgeDocument } = await import("./decision");
    const d = await judgeDocument({ ...input, document: { ...doc, text: null } });
    const body = calls[0]!.body as unknown as { state: { documento_em_analise: { texto: string } } };
    expect(body.state.documento_em_analise.texto).toMatch(/não foi possível ler/);
    expect(d.verdict?.verdict).toBe("approve"); // lista por índice também funciona
  });

  it("Julia fora do ar: sem parecer, com erro", async () => {
    fakeJulia(() => ({}), 503);
    const { judgeDocument } = await import("./decision");
    const d = await judgeDocument({ ...input, document: doc });
    expect(d.ok).toBe(false);
    expect(d.verdict).toBeNull();
  });
});

describe("suggestServices", () => {
  const catalog = [{ key: "ELECTRICAL", label: "Elétrica" }, { key: "GAS", label: "Gás" }, { key: "PAINTING", label: "Pintura simples" }];
  const flags = [{ key: "affectsStructure" as const, label: "Afeta a estrutura" }];

  it("um noul por serviço e por flag; marca só os que passam da confiança mínima", async () => {
    fakeJulia(() => ({
      answers: {
        service_ELECTRICAL: { type: "noul", probabilities: { false: 0.1, true: 0.9 }, noul: 0.9 },
        service_GAS: { type: "noul", probabilities: { false: 0.55, true: 0.45 }, noul: 0.45 },
        service_PAINTING: { type: "noul", probabilities: { false: 0.9, true: 0.1 }, noul: 0.1 },
        flag_affectsStructure: { type: "noul", probabilities: { false: 0.3, true: 0.7 }, noul: 0.7 },
      },
    }));
    const { suggestServices } = await import("./decision");
    const r = await suggestServices("Refazer a elétrica e abrir a viga", catalog, flags);
    expect(Object.keys(calls[0]!.body.questions)).toEqual(["service_ELECTRICAL", "service_GAS", "service_PAINTING", "flag_affectsStructure"]);
    expect(r.suggestion).toMatchObject({ services: ["ELECTRICAL"], flags: { affectsCommonArea: false, affectsFacade: false, affectsStructure: true } });
  });

  it("sem Julia: sem sugestão", async () => {
    delete process.env.JULIA_URL;
    const { suggestServices } = await import("./decision");
    const r = await suggestServices("x", catalog, flags);
    expect(r.ok).toBe(false);
    expect(r.suggestion).toBeNull();
  });
});
