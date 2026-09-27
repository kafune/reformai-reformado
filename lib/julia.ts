// Cola entre o banco e lib/decision.ts: monta o contexto da obra, chama a Julia-1 e grava
// resultado + CaseEvent. Chamado pelas server actions. Sem JULIA_URL, tudo aqui é no-op.
import { Prisma } from "@/lib/generated/prisma/client";
import { db, type Tx } from "@/lib/db";
import {
  classifyCase,
  juliaConfig,
  recommendRelease,
  type ClassificationDecision,
  type DecisionContextInput,
} from "@/lib/decision";
import { logEvent } from "@/lib/events";
import { type DocumentType } from "@/lib/rules/checklist";
import { mergeClassification, type Classification, type RulesClassification } from "@/lib/rules/merge";
import { SERVICE_BY_KEY, isServiceKey, type Flags } from "@/lib/rules/services";

const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

type CaseFields = {
  services: string[];
  affectsCommonArea: boolean;
  affectsFacade: boolean;
  affectsStructure: boolean;
  description: string;
  plannedStart: Date | null;
  plannedEnd: Date | null;
  contractorName: string | null;
  professionalName?: string | null;
  professionalType?: string | null;
  professionalReg?: string | null;
  artNumber?: string | null;
};

async function decisionInput(
  fields: CaseFields,
  condominiumId: string,
  rules: RulesClassification,
  caseId: string | null,
): Promise<DecisionContextInput> {
  const [condominium, documents, history] = await Promise.all([
    db.condominium.findUniqueOrThrow({ where: { id: condominiumId }, select: { city: true, state: true } }),
    caseId ? db.document.findMany({ where: { caseId }, orderBy: { createdAt: "desc" } }) : [],
    caseId
      ? db.caseEvent.findMany({
          where: { caseId, type: { in: ["status_changed", "document_reviewed", "case_updated"] } },
          orderBy: { createdAt: "desc" },
          take: 15,
        })
      : [],
  ]);
  const flags: Flags = { affectsCommonArea: fields.affectsCommonArea, affectsFacade: fields.affectsFacade, affectsStructure: fields.affectsStructure };
  return {
    services: fields.services.filter(isServiceKey).map((k) => SERVICE_BY_KEY[k].label),
    flags,
    description: fields.description,
    plannedStart: fields.plannedStart,
    plannedEnd: fields.plannedEnd,
    contractorName: fields.contractorName,
    condominium,
    rules,
    professional: fields.professionalName
      ? { name: fields.professionalName, type: fields.professionalType ?? null, registration: fields.professionalReg ?? null, artNumber: fields.artNumber ?? null }
      : null,
    documents: documents.map((d) => ({ type: d.type as DocumentType, status: d.status, fileName: d.fileName, reviewNote: d.reviewNote })),
    history,
  };
}

export type ClassificationOutcome = {
  classification: Classification;
  /** Colunas da obra derivadas da classificação final. */
  columns: {
    riskScore: number;
    riskLevel: Classification["level"];
    requiresArt: boolean;
    requiredDocs: DocumentType[];
    classifiedBy: string;
    juliaDecision: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  };
  decision: ClassificationDecision | null;
};

/**
 * Decisão 1: classifica com as regras (piso) e, se a Julia estiver configurada, pede a
 * classificação dela e faz o merge (só aumenta). Chamada HTTP fora da transação.
 */
export async function classifyWithRules(
  fields: CaseFields,
  condominiumId: string,
  rules: RulesClassification,
  caseId: string | null,
): Promise<ClassificationOutcome> {
  const decision = juliaConfig().enabled ? await classifyCase(await decisionInput(fields, condominiumId, rules, caseId)) : null;
  const classification = mergeClassification(rules, decision?.julia ?? null);
  const juliaDecision =
    decision?.ok && classification.addedByJulia
      ? json({ level: classification.level, addedByJulia: classification.addedByJulia, justification: decision.justification, at: new Date().toISOString() })
      : Prisma.JsonNull;
  return {
    classification,
    columns: {
      riskScore: classification.score,
      riskLevel: classification.level,
      requiresArt: classification.requiresArt,
      requiredDocs: classification.requiredDocs,
      classifiedBy: classification.classifiedBy,
      juliaDecision,
    },
    decision,
  };
}

/** Grava o CaseEvent julia_decision da classificação (dentro da transação que salva a obra). */
export async function logClassificationDecision(tx: Tx, caseId: string, outcome: ClassificationOutcome) {
  const { decision, classification } = outcome;
  if (!decision) return;
  await logEvent(tx, {
    caseId,
    userId: null,
    type: "julia_decision",
    message: decision.ok
      ? `classificou: ${decision.justification || "concorda com a tabela"}`
      : `indisponível (${decision.error}); valeu a tabela`,
    data: json({
      kind: "classification",
      ok: decision.ok,
      error: decision.error ?? null,
      context: decision.context,
      questions: decision.questions,
      response: decision.raw ?? null,
      justification: decision.justification,
      applied: classification.addedByJulia,
      elapsedMs: decision.elapsedMs,
      model: "SupersonicLabs/Julia-1",
    }),
  });
}

/**
 * Decisão 3: se a obra está em análise e todos os documentos obrigatórios foram avaliados,
 * pede a recomendação de liberação e pré-preenche Case.releaseRecommendation.
 * Nunca muda o status: liberar/recusar é clique humano.
 */
export async function maybeRecommendRelease(caseId: string): Promise<void> {
  if (!juliaConfig().enabled) return;
  const c = await db.case.findUnique({ where: { id: caseId } });
  if (!c || c.status !== "UNDER_REVIEW") return;
  const documents = await db.document.findMany({ where: { caseId }, orderBy: { createdAt: "desc" } });
  const allEvaluated = c.requiredDocs.every((t) => {
    const latest = documents.find((d) => d.type === t);
    return latest && latest.status !== "PENDING";
  });
  if (!allEvaluated) return;

  const rules: RulesClassification = {
    score: c.riskScore,
    level: c.riskLevel,
    requiresArt: c.requiresArt,
    requiredDocs: c.requiredDocs,
    guidance: [],
  };
  const decision = await recommendRelease(await decisionInput(c, c.condominiumId, rules, caseId));

  await db.$transaction(async (tx) => {
    if (decision.recommendation) {
      await tx.case.update({ where: { id: caseId }, data: { releaseRecommendation: json(decision.recommendation) } });
    }
    await logEvent(tx, {
      caseId,
      userId: null,
      type: "julia_decision",
      message: decision.ok ? `recomendou: ${decision.recommendation?.justification}` : `indisponível (${decision.error}); sem recomendação`,
      data: json({
        kind: "release",
        ok: decision.ok,
        error: decision.error ?? null,
        context: decision.context,
        questions: decision.questions,
        response: decision.raw ?? null,
        recommendation: decision.recommendation,
        elapsedMs: decision.elapsedMs,
        model: "SupersonicLabs/Julia-1",
      }),
    });
  });
}
