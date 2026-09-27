// Julia-1 (Supersonic Labs): modelo de decisão tipado, chamado por HTTP. Só fetch + Zod;
// nenhuma regra de negócio aqui (o piso está em lib/rules/, e o merge em lib/rules/merge.ts).
// Contrato da API: docs/julia-1-api.md. Sem JULIA_URL, nada é chamado e o app segue só com regras.
//
// Trilhos: a Julia nunca leva a obra a APPROVED/REJECTED/COMPLETED e nunca dispensa exigência
// da tabela (garantido por mergeClassification). Toda chamada vira CaseEvent (nas actions).

import { z } from "zod";

import { DOCUMENT_LABEL, DOCUMENT_TYPES, type DocumentType } from "@/lib/rules/checklist";
import type { JuliaClassification, RulesClassification } from "@/lib/rules/merge";
import { RISK_LABEL, RISK_LEVELS, type RiskLevel } from "@/lib/rules/risk";

// ── Configuração ─────────────────────────────────────────────────────────────

export function juliaConfig() {
  const url = process.env.JULIA_URL?.replace(/\/+$/, "");
  return {
    enabled: !!url,
    url: url ?? "",
    timeoutMs: Number(process.env.JULIA_TIMEOUT_MS ?? 3000),
    /** Abaixo disso a resposta é registrada, mas não aplicada. */
    minConfidence: Number(process.env.JULIA_MIN_CONFIDENCE ?? 0.6),
  };
}

// ── Contrato HTTP (docs/julia-1-api.md) ──────────────────────────────────────

export type Question =
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  | { type: "score"; instructions: string; criteria: string[] }
  | { type: "noul"; instructions: string; criteria?: { false: string; true: string } };

const AnswerSchema = z.object({
  type: z.enum(["choice", "score", "noul"]),
  probabilities: z.union([z.record(z.string(), z.number()), z.array(z.number())]),
  choice: z.string().optional(),
  score: z.number().optional(),
  noul: z.number().optional(),
  max_probability: z.number().optional(),
});
export type Answer = z.infer<typeof AnswerSchema>;

const DecideResponseSchema = z.object({ answers: z.record(z.string(), AnswerSchema) });

export type DecideResult =
  | { ok: true; answers: Record<string, Answer>; raw: unknown; elapsedMs: number }
  | { ok: false; error: string; raw?: unknown; elapsedMs: number };

/** Uma chamada: POST {JULIA_URL}/v1/decide com timeout curto. Nunca lança. */
export async function decide(state: unknown, questions: Record<string, Question>): Promise<DecideResult> {
  const cfg = juliaConfig();
  const started = Date.now();
  const elapsed = () => Date.now() - started;
  if (!cfg.enabled) return { ok: false, error: "JULIA_URL não configurada", elapsedMs: 0 };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const res = await fetch(`${cfg.url}/v1/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state, questions }),
      signal: controller.signal,
    });
    const raw: unknown = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, raw, elapsedMs: elapsed() };
    const parsed = DecideResponseSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: `resposta inválida: ${parsed.error.issues[0]?.message ?? "?"}`, raw, elapsedMs: elapsed() };
    return { ok: true, answers: parsed.data.answers, raw, elapsedMs: elapsed() };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return { ok: false, error: aborted ? `timeout após ${cfg.timeoutMs} ms` : String(error), elapsedMs: elapsed() };
  } finally {
    clearTimeout(timer);
  }
}

/** Probabilidade de uma opção, aceitando lista (por índice) ou objeto (por chave). */
export function probabilityOf(answer: Answer, key: string, index: number): number {
  return Array.isArray(answer.probabilities) ? (answer.probabilities[index] ?? 0) : (answer.probabilities[key] ?? 0);
}

function argmax(answer: Answer, keys: readonly string[]): { key: string; p: number } {
  return keys.reduce(
    (best, key, i) => {
      const p = probabilityOf(answer, key, i);
      return p > best.p ? { key, p } : best;
    },
    { key: keys[0]!, p: -1 },
  );
}

const pct = (p: number) => `${Math.round(p * 100)}%`;

// ── Contexto (sem PII desnecessária: nada de e-mail, telefone ou CPF) ────────

export type DecisionContextInput = {
  services: string[]; // rótulos
  flags: { affectsCommonArea: boolean; affectsFacade: boolean; affectsStructure: boolean };
  description: string;
  plannedStart: Date | null;
  plannedEnd: Date | null;
  contractorName: string | null;
  condominium: { city: string; state: string };
  rules: RulesClassification;
  professional: { name: string | null; type: string | null; registration: string | null; artNumber: string | null } | null;
  documents: { type: DocumentType; status: string; fileName: string; reviewNote: string | null }[];
  history: { type: string; fromStatus: string | null; toStatus: string | null; message: string | null; createdAt: Date }[];
};

export function buildDecisionContext(input: DecisionContextInput) {
  const date = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
  return {
    obra: {
      servicos: input.services,
      afeta_area_comum: input.flags.affectsCommonArea,
      afeta_fachada: input.flags.affectsFacade,
      afeta_estrutura: input.flags.affectsStructure,
      descricao: input.description.slice(0, 2000),
      inicio_previsto: date(input.plannedStart),
      termino_previsto: date(input.plannedEnd),
      executor: input.contractorName,
    },
    condominio: { cidade: input.condominium.city, uf: input.condominium.state },
    // Resultado da tabela, informado como piso: a Julia só pode exigir mais.
    piso_da_tabela: {
      nivel_de_risco: RISK_LABEL[input.rules.level],
      pontuacao: input.rules.score,
      exige_art_rrt: input.rules.requiresArt,
      documentos_obrigatorios: input.rules.requiredDocs.map((d) => DOCUMENT_LABEL[d]),
    },
    responsavel_tecnico: input.professional
      ? {
          nome: input.professional.name,
          profissao: input.professional.type === "ARCHITECT" ? "arquiteto (CAU)" : input.professional.type === "ENGINEER" ? "engenheiro (CREA)" : null,
          registro: input.professional.registration,
          numero_art_rrt: input.professional.artNumber,
        }
      : null,
    documentos: input.documents.map((d) => ({
      tipo: DOCUMENT_LABEL[d.type],
      situacao: d.status === "APPROVED" ? "aprovado" : d.status === "REJECTED" ? "reprovado" : "aguardando conferência",
      arquivo: d.fileName,
      nota: d.reviewNote,
    })),
    historico: input.history.slice(0, 15).map((h) => ({
      evento: h.type,
      de: h.fromStatus,
      para: h.toStatus,
      mensagem: h.message,
      em: h.createdAt.toISOString().slice(0, 10),
    })),
  };
}

// ── Decisão 1: classificação (ao salvar a obra) ──────────────────────────────

export type ClassificationDecision = {
  ok: boolean;
  error?: string;
  /** Resposta já validada e traduzida para o merge (null se falhou ou nada passou da confiança). */
  julia: JuliaClassification | null;
  /** Justificativa legível: pergunta → opção → probabilidade. */
  justification: string;
  questions: Record<string, Question>;
  context: unknown;
  raw: unknown;
  elapsedMs: number;
};

export function classificationQuestions(rules: RulesClassification): Record<string, Question> {
  const questions: Record<string, Question> = {
    risk_level: {
      type: "score",
      instructions:
        "Considerando os serviços, a descrição e o contexto, qual o nível de risco desta reforma para o condomínio? A tabela já classificou como piso; só faz sentido subir.",
      criteria: RISK_LEVELS.map((l) => RISK_LABEL[l]),
    },
    requires_art: {
      type: "noul",
      instructions: "Esta reforma exige ART (CREA) ou RRT (CAU) de um profissional habilitado?",
      criteria: { false: "não exige responsável técnico", true: "exige ART/RRT de responsável técnico" },
    },
  };
  for (const doc of DOCUMENT_TYPES) {
    if (rules.requiredDocs.includes(doc)) continue; // a tabela já pede
    questions[`doc_${doc}`] = {
      type: "noul",
      instructions: `Além dos documentos obrigatórios pela tabela, o condomínio deve exigir também "${DOCUMENT_LABEL[doc]}" para esta reforma?`,
      criteria: { false: "não é necessário", true: "deve ser exigido" },
    };
  }
  return questions;
}

export async function classifyCase(input: DecisionContextInput): Promise<ClassificationDecision> {
  const context = buildDecisionContext(input);
  const questions = classificationQuestions(input.rules);
  const result = await decide(context, questions);
  if (!result.ok) {
    return { ok: false, error: result.error, julia: null, justification: `Julia-1 indisponível: ${result.error}`, questions, context, raw: result.raw, elapsedMs: result.elapsedMs };
  }
  const { minConfidence } = juliaConfig();
  const parts: string[] = [];
  const rules = input.rules;

  let level: RiskLevel = rules.level;
  const levelAnswer = result.answers.risk_level;
  if (levelAnswer) {
    const best = argmax(levelAnswer, RISK_LEVELS.map((l) => RISK_LABEL[l]));
    const chosen = RISK_LEVELS[RISK_LEVELS.findIndex((l) => RISK_LABEL[l] === best.key)] ?? rules.level;
    parts.push(`nível ${RISK_LABEL[chosen]} (${pct(best.p)})`);
    if (best.p >= minConfidence) level = chosen;
  }

  let requiresArt = rules.requiresArt;
  const artAnswer = result.answers.requires_art;
  if (artAnswer) {
    const p = artAnswer.noul ?? probabilityOf(artAnswer, "true", 1);
    parts.push(`exige ART/RRT: ${p >= 0.5 ? "sim" : "não"} (${pct(p >= 0.5 ? p : 1 - p)})`);
    if (p >= minConfidence) requiresArt = true;
  }

  const requiredDocs: DocumentType[] = [...rules.requiredDocs];
  for (const doc of DOCUMENT_TYPES) {
    const answer = result.answers[`doc_${doc}`];
    if (!answer) continue;
    const p = answer.noul ?? probabilityOf(answer, "true", 1);
    if (p >= minConfidence) {
      requiredDocs.push(doc);
      parts.push(`exigir ${DOCUMENT_LABEL[doc]} (${pct(p)})`);
    }
  }

  return {
    ok: true,
    julia: { level, requiresArt, requiredDocs, guidance: [], reason: parts.join("; ") },
    justification: parts.join("; "),
    questions,
    context,
    raw: result.raw,
    elapsedMs: result.elapsedMs,
  };
}

// ── Decisão 3: recomendação de liberação (obra em análise, documentos avaliados) ──

export const RELEASE_OPTIONS = {
  approve: "liberar a obra",
  approve_with_conditions: "liberar a obra com condições (horário, avisos, cuidados)",
  request_changes: "devolver ao morador pedindo correção",
  reject: "recusar a obra",
} as const;
export type ReleaseOption = keyof typeof RELEASE_OPTIONS;

export const RELEASE_LABEL: Record<ReleaseOption, string> = {
  approve: "Liberar",
  approve_with_conditions: "Liberar c/ condições",
  request_changes: "Pedir correção",
  reject: "Recusar",
};

export type ReleaseRecommendation = {
  recommendation: ReleaseOption;
  confidence: number;
  probabilities: Record<ReleaseOption, number>;
  justification: string;
  at: string;
};

export type ReleaseDecision = {
  ok: boolean;
  error?: string;
  recommendation: ReleaseRecommendation | null;
  questions: Record<string, Question>;
  context: unknown;
  raw: unknown;
  elapsedMs: number;
};

export async function recommendRelease(input: DecisionContextInput): Promise<ReleaseDecision> {
  const context = buildDecisionContext(input);
  const questions: Record<string, Question> = {
    release: {
      type: "choice",
      instructions:
        "A obra está em análise e os documentos foram conferidos (veja a situação e as notas de cada um). O que o síndico deve fazer?",
      criteria: { ...RELEASE_OPTIONS },
    },
  };
  const result = await decide(context, questions);
  if (!result.ok) return { ok: false, error: result.error, recommendation: null, questions, context, raw: result.raw, elapsedMs: result.elapsedMs };

  const answer = result.answers.release;
  if (!answer) return { ok: false, error: "resposta sem a pergunta 'release'", recommendation: null, questions, context, raw: result.raw, elapsedMs: result.elapsedMs };
  const keys = Object.keys(RELEASE_OPTIONS) as ReleaseOption[];
  const best = argmax(answer, keys);
  const probabilities = Object.fromEntries(keys.map((k, i) => [k, probabilityOf(answer, k, i)])) as Record<ReleaseOption, number>;
  const recommendation = best.key as ReleaseOption;
  return {
    ok: true,
    recommendation: {
      recommendation,
      confidence: best.p,
      probabilities,
      justification: `${RELEASE_LABEL[recommendation]} (${pct(best.p)})`,
      at: new Date().toISOString(),
    },
    questions,
    context,
    raw: result.raw,
    elapsedMs: result.elapsedMs,
  };
}

/** Lê a recomendação gravada em Case.releaseRecommendation (JSON), validando. */
const StoredRecommendationSchema = z.object({
  recommendation: z.enum(["approve", "approve_with_conditions", "request_changes", "reject"]),
  confidence: z.number(),
  probabilities: z.record(z.string(), z.number()),
  justification: z.string(),
  at: z.string(),
});
export function readReleaseRecommendation(json: unknown): ReleaseRecommendation | null {
  const parsed = StoredRecommendationSchema.safeParse(json);
  return parsed.success ? (parsed.data as ReleaseRecommendation) : null;
}

/** Lê a classificação gravada em Case.juliaDecision (JSON), validando. */
const StoredClassificationSchema = z.object({
  justification: z.string(),
  addedByJulia: z.object({
    level: z.boolean(),
    requiresArt: z.boolean(),
    docs: z.array(z.string()),
    guidance: z.array(z.string()),
    reason: z.string(),
  }),
  level: z.string(),
  at: z.string(),
});
export type StoredClassification = z.infer<typeof StoredClassificationSchema>;
export function readJuliaClassification(json: unknown): StoredClassification | null {
  const parsed = StoredClassificationSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

// ── Decisão 2: parecer do documento (ao anexar, com o texto extraído) ────────

export type DocumentVerdict = {
  verdict: "approve" | "reject";
  confidence: number;
  probabilities: { approve: number; reject: number };
  justification: string;
  at: string;
};

export type DocumentDecision = {
  ok: boolean;
  error?: string;
  verdict: DocumentVerdict | null;
  questions: Record<string, Question>;
  context: unknown;
  raw: unknown;
  elapsedMs: number;
};

export type DocumentDecisionInput = DecisionContextInput & {
  document: {
    type: DocumentType;
    fileName: string;
    /** Texto extraído (camada de texto ou OCR), já recortado. null = não deu para ler. */
    text: string | null;
    /** Problemas apontados pelas checagens puras (lib/rules/document-checks.ts). */
    problems: string[];
  };
};

/** Quanto do texto do documento vai no contexto (o resto do contexto também precisa caber). */
const MAX_DOCUMENT_TEXT_IN_CONTEXT = 6_000;

export async function judgeDocument(input: DocumentDecisionInput): Promise<DocumentDecision> {
  const context = {
    ...buildDecisionContext(input),
    documento_em_analise: {
      tipo: DOCUMENT_LABEL[input.document.type],
      arquivo: input.document.fileName,
      problemas_encontrados: input.document.problems,
      texto: input.document.text ? input.document.text.slice(0, MAX_DOCUMENT_TEXT_IN_CONTEXT) : "(não foi possível ler o texto do arquivo)",
    },
  };
  const questions: Record<string, Question> = {
    verdict: {
      type: "choice",
      instructions: `O documento em análise (${DOCUMENT_LABEL[input.document.type]}) está correto e completo para esta reforma? Considere o texto do documento, os problemas encontrados e os dados da obra.`,
      criteria: { approve: "aprovar o documento", reject: "reprovar o documento e pedir ao morador para corrigir" },
    },
  };
  const result = await decide(context, questions);
  if (!result.ok) return { ok: false, error: result.error, verdict: null, questions, context, raw: result.raw, elapsedMs: result.elapsedMs };
  const answer = result.answers.verdict;
  if (!answer) return { ok: false, error: "resposta sem a pergunta 'verdict'", verdict: null, questions, context, raw: result.raw, elapsedMs: result.elapsedMs };
  const approve = probabilityOf(answer, "approve", 0);
  const reject = probabilityOf(answer, "reject", 1);
  const verdict = approve >= reject ? "approve" : "reject";
  const confidence = Math.max(approve, reject);
  return {
    ok: true,
    verdict: {
      verdict,
      confidence,
      probabilities: { approve, reject },
      justification: `${verdict === "approve" ? "aprovar" : "reprovar"} (${pct(confidence)})`,
      at: new Date().toISOString(),
    },
    questions,
    context,
    raw: result.raw,
    elapsedMs: result.elapsedMs,
  };
}

const StoredVerdictSchema = z.object({
  verdict: z.enum(["approve", "reject"]),
  confidence: z.number(),
  probabilities: z.object({ approve: z.number(), reject: z.number() }),
  justification: z.string(),
  at: z.string(),
});
export function readDocumentVerdict(json: unknown): DocumentVerdict | null {
  const parsed = StoredVerdictSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

// ── Apoio: sugerir serviços a partir da descrição (um noul por serviço) ──────

export type ServiceSuggestion = {
  services: string[]; // ServiceKey com p(true) ≥ confiança mínima
  flags: { affectsCommonArea: boolean; affectsFacade: boolean; affectsStructure: boolean };
  probabilities: Record<string, number>;
};

export async function suggestServices(
  description: string,
  catalog: { key: string; label: string }[],
  flagCatalog: { key: "affectsCommonArea" | "affectsFacade" | "affectsStructure"; label: string }[],
): Promise<{ ok: boolean; error?: string; suggestion: ServiceSuggestion | null }> {
  const questions: Record<string, Question> = {};
  for (const s of catalog) {
    questions[`service_${s.key}`] = {
      type: "noul",
      instructions: `Pela descrição do morador, a reforma inclui o serviço "${s.label}"?`,
      criteria: { false: "não inclui", true: "inclui" },
    };
  }
  for (const f of flagCatalog) {
    questions[`flag_${f.key}`] = {
      type: "noul",
      instructions: `Pela descrição do morador, a reforma ${f.label.toLowerCase()}?`,
      criteria: { false: "não", true: "sim" },
    };
  }
  const result = await decide({ descricao_do_morador: description.slice(0, 4000) }, questions);
  if (!result.ok) return { ok: false, error: result.error, suggestion: null };
  const { minConfidence } = juliaConfig();
  const probabilities: Record<string, number> = {};
  const p = (id: string) => {
    const a = result.answers[id];
    const v = a ? (a.noul ?? probabilityOf(a, "true", 1)) : 0;
    probabilities[id] = v;
    return v;
  };
  return {
    ok: true,
    suggestion: {
      services: catalog.filter((s) => p(`service_${s.key}`) >= minConfidence).map((s) => s.key),
      flags: {
        affectsCommonArea: p("flag_affectsCommonArea") >= minConfidence,
        affectsFacade: p("flag_affectsFacade") >= minConfidence,
        affectsStructure: p("flag_affectsStructure") >= minConfidence,
      },
      probabilities,
    },
  };
}
