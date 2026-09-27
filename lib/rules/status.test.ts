import { describe, expect, it } from "bun:test";

import {
  CASE_STATUSES,
  GuardError,
  InvalidTransitionError,
  TRANSITIONS,
  approvalBlockers,
  assertCanApprove,
  assertCanComplete,
  assertCanSubmit,
  assertTransition,
  blockerMessage,
  canTransition,
  completionBlockers,
  isFinalStatus,
  submissionBlockers,
  type CaseForGuards,
  type CaseStatus,
  type DocForGuards,
} from "./status";

describe("transições", () => {
  const valid: [CaseStatus, CaseStatus][] = [
    ["DRAFT", "UNDER_REVIEW"],
    ["DRAFT", "CANCELLED"],
    ["UNDER_REVIEW", "CHANGES_REQUESTED"],
    ["UNDER_REVIEW", "APPROVED"],
    ["UNDER_REVIEW", "REJECTED"],
    ["UNDER_REVIEW", "CANCELLED"],
    ["CHANGES_REQUESTED", "UNDER_REVIEW"],
    ["CHANGES_REQUESTED", "CANCELLED"],
    ["APPROVED", "IN_PROGRESS"],
    ["APPROVED", "CANCELLED"],
    ["IN_PROGRESS", "COMPLETED"],
  ];

  it.each(valid)("%s → %s é válida", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
    expect(() => assertTransition(from, to)).not.toThrow();
  });

  it("o mapa tem exatamente as transições do PLAN.md §7", () => {
    const all = CASE_STATUSES.flatMap((from) => TRANSITIONS[from].map((to) => [from, to]));
    expect(all).toEqual(valid);
  });

  it.each([
    ["DRAFT", "APPROVED"],
    ["DRAFT", "IN_PROGRESS"],
    ["UNDER_REVIEW", "IN_PROGRESS"],
    ["APPROVED", "UNDER_REVIEW"],
    ["APPROVED", "COMPLETED"],
    ["IN_PROGRESS", "CANCELLED"],
    ["REJECTED", "UNDER_REVIEW"],
    ["COMPLETED", "IN_PROGRESS"],
    ["CANCELLED", "DRAFT"],
    ["DRAFT", "DRAFT"],
  ] as [CaseStatus, CaseStatus][])("%s → %s é inválida e lança erro", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
    expect(() => assertTransition(from, to)).toThrow(InvalidTransitionError);
  });

  it("REJECTED, COMPLETED e CANCELLED são finais", () => {
    expect(CASE_STATUSES.filter(isFinalStatus)).toEqual(["REJECTED", "COMPLETED", "CANCELLED"]);
  });
});

const baseCase: CaseForGuards = {
  status: "DRAFT",
  requiresArt: true,
  requiredDocs: ["RESPONSIBILITY_TERM", "ART_RRT", "DESCRIPTIVE_MEMORIAL"],
  professionalName: "Eng. Carla Nunes",
  professionalReg: "CREA-SP 123456",
  artNumber: "2620251234567",
  completedAt: null,
};

const doc = (type: DocForGuards["type"], status: DocForGuards["status"] = "PENDING"): DocForGuards => ({
  type,
  status,
});

const allDocs = (status: DocForGuards["status"]): DocForGuards[] =>
  baseCase.requiredDocs.map((t) => doc(t, status));

describe("guarda: enviar para análise", () => {
  it("passa com todos os documentos anexados e profissional preenchido", () => {
    expect(submissionBlockers(baseCase, allDocs("PENDING"))).toEqual([]);
    expect(() => assertCanSubmit(baseCase, allDocs("PENDING"))).not.toThrow();
  });

  it("também passa a partir de CHANGES_REQUESTED", () => {
    expect(submissionBlockers({ ...baseCase, status: "CHANGES_REQUESTED" }, allDocs("APPROVED"))).toEqual([]);
  });

  it("diz exatamente quais documentos faltam", () => {
    const docs = [doc("RESPONSIBILITY_TERM"), doc("ART_RRT")];
    const blockers = submissionBlockers(baseCase, docs);
    expect(blockers).toEqual([{ kind: "missing_document", docType: "DESCRIPTIVE_MEMORIAL" }]);
    expect(blockers.map(blockerMessage)).toEqual(["Falta anexar: Memorial descritivo"]);
  });

  it("documento reprovado não conta como anexado", () => {
    const docs = [doc("RESPONSIBILITY_TERM"), doc("ART_RRT", "REJECTED"), doc("DESCRIPTIVE_MEMORIAL")];
    expect(submissionBlockers(baseCase, docs)).toEqual([{ kind: "missing_document", docType: "ART_RRT" }]);
  });

  it("exige nome, registro e nº da ART/RRT quando a obra exige ART", () => {
    const c = { ...baseCase, professionalName: "", professionalReg: null, artNumber: "  " };
    expect(submissionBlockers(c, allDocs("PENDING"))).toEqual([
      { kind: "missing_professional" },
      { kind: "missing_art_number" },
    ]);
    expect(() => assertCanSubmit(c, allDocs("PENDING"))).toThrow(GuardError);
  });

  it("registro faltando sozinho já bloqueia", () => {
    const c = { ...baseCase, professionalReg: null };
    expect(submissionBlockers(c, allDocs("PENDING"))).toEqual([{ kind: "missing_professional" }]);
  });

  it("não pede profissional quando a obra não exige ART", () => {
    const c: CaseForGuards = {
      ...baseCase,
      requiresArt: false,
      requiredDocs: ["RESPONSIBILITY_TERM"],
      professionalName: null,
      professionalReg: null,
      artNumber: null,
    };
    expect(submissionBlockers(c, [doc("RESPONSIBILITY_TERM")])).toEqual([]);
  });

  it("obra de risco baixo sem documentos pode ser enviada", () => {
    const c: CaseForGuards = { ...baseCase, requiresArt: false, requiredDocs: [] };
    expect(submissionBlockers(c, [])).toEqual([]);
  });

  it("bloqueia se o status não permite enviar", () => {
    const c = { ...baseCase, status: "APPROVED" as const };
    expect(submissionBlockers(c, allDocs("APPROVED"))).toEqual([
      { kind: "invalid_status", from: "APPROVED", to: "UNDER_REVIEW" },
    ]);
  });

  it("a mensagem do GuardError lista tudo que falta", () => {
    const c = { ...baseCase, artNumber: null };
    expect(() => assertCanSubmit(c, [doc("ART_RRT")])).toThrow(
      "Falta anexar: Termo de responsabilidade; Falta anexar: Memorial descritivo; Falta informar o número da ART/RRT",
    );
  });
});

describe("guarda: liberar", () => {
  const underReview = { ...baseCase, status: "UNDER_REVIEW" as const };

  it("passa com todos os documentos aprovados e ART conferida", () => {
    expect(approvalBlockers(underReview, allDocs("APPROVED"), true)).toEqual([]);
    expect(() => assertCanApprove(underReview, allDocs("APPROVED"), true)).not.toThrow();
  });

  it("bloqueia enquanto algum documento obrigatório está pendente", () => {
    const docs = [doc("RESPONSIBILITY_TERM", "APPROVED"), doc("ART_RRT", "PENDING"), doc("DESCRIPTIVE_MEMORIAL", "APPROVED")];
    expect(approvalBlockers(underReview, docs, true)).toEqual([{ kind: "document_not_approved", docType: "ART_RRT" }]);
  });

  it("documento reprovado aparece como faltando (precisa reenviar)", () => {
    const docs = [doc("RESPONSIBILITY_TERM", "APPROVED"), doc("ART_RRT", "REJECTED"), doc("DESCRIPTIVE_MEMORIAL", "APPROVED")];
    expect(approvalBlockers(underReview, docs, true)).toEqual([{ kind: "missing_document", docType: "ART_RRT" }]);
  });

  it("uma versão aprovada basta, mesmo com outra reprovada do mesmo tipo", () => {
    const docs = [...allDocs("APPROVED"), doc("ART_RRT", "REJECTED")];
    expect(approvalBlockers(underReview, docs, true)).toEqual([]);
  });

  it("exige a confirmação da ART/RRT quando a obra exige ART", () => {
    expect(approvalBlockers(underReview, allDocs("APPROVED"), false)).toEqual([{ kind: "art_not_confirmed" }]);
    expect(() => assertCanApprove(underReview, allDocs("APPROVED"), false)).toThrow(GuardError);
  });

  it("não exige a confirmação quando a obra não exige ART", () => {
    const c: CaseForGuards = { ...underReview, requiresArt: false, requiredDocs: ["RESPONSIBILITY_TERM"] };
    expect(approvalBlockers(c, [doc("RESPONSIBILITY_TERM", "APPROVED")], false)).toEqual([]);
  });

  it("só libera a partir de UNDER_REVIEW", () => {
    expect(approvalBlockers(baseCase, allDocs("APPROVED"), true)).toEqual([
      { kind: "invalid_status", from: "DRAFT", to: "APPROVED" },
    ]);
  });
});

describe("guarda: concluir", () => {
  it("passa quando em execução e o morador informou a conclusão", () => {
    const c = { ...baseCase, status: "IN_PROGRESS" as const, completedAt: new Date("2026-11-30") };
    expect(completionBlockers(c)).toEqual([]);
    expect(() => assertCanComplete(c)).not.toThrow();
  });

  it("bloqueia sem a conclusão informada", () => {
    const c = { ...baseCase, status: "IN_PROGRESS" as const };
    expect(completionBlockers(c)).toEqual([{ kind: "completion_not_reported" }]);
    expect(() => assertCanComplete(c)).toThrow(GuardError);
  });

  it("bloqueia se a obra não está em execução", () => {
    const c = { ...baseCase, status: "APPROVED" as const, completedAt: new Date() };
    expect(completionBlockers(c)).toEqual([{ kind: "invalid_status", from: "APPROVED", to: "COMPLETED" }]);
  });
});
