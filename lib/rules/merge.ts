// Combinação das regras (piso) com a decisão da Julia-1 (PLAN.md §8.4). Puro.
//
// A Julia só pode AUMENTAR exigências: nunca reduz o nível, nunca dispensa ART/RRT
// nem documento exigido pela tabela. Sem resposta válida, vale só a regra.

import { sortDocuments, type DocumentType } from "./checklist";
import { riskRank, type RiskLevel } from "./risk";

/** Resultado das regras: calculateRisk + requiredDocuments. */
export type RulesClassification = {
  score: number;
  level: RiskLevel;
  requiresArt: boolean;
  requiredDocs: readonly DocumentType[];
  guidance: readonly string[];
};

/** Resposta da Julia-1 já validada (Zod em lib/decision.ts — não aqui). */
export type JuliaClassification = {
  level: RiskLevel;
  requiresArt: boolean;
  requiredDocs: readonly DocumentType[];
  guidance: readonly string[];
  reason: string;
};

export type ClassifiedBy = "rules" | "rules+julia";

export type Classification = {
  score: number;
  level: RiskLevel;
  requiresArt: boolean;
  requiredDocs: DocumentType[];
  guidance: string[];
  classifiedBy: ClassifiedBy;
  /** O que a Julia-1 acrescentou em relação à tabela (a tela mostra "pela Julia-1: motivo"). */
  addedByJulia: {
    level: boolean;
    requiresArt: boolean;
    docs: DocumentType[];
    guidance: string[];
    reason: string;
  } | null;
};

export function mergeClassification(
  rules: RulesClassification,
  julia: JuliaClassification | null,
): Classification {
  if (julia === null) {
    return {
      score: rules.score,
      level: rules.level,
      requiresArt: rules.requiresArt,
      requiredDocs: [...rules.requiredDocs],
      guidance: [...rules.guidance],
      classifiedBy: "rules",
      addedByJulia: null,
    };
  }

  const level = riskRank(julia.level) > riskRank(rules.level) ? julia.level : rules.level;
  const requiresArt = rules.requiresArt || julia.requiresArt;

  const extraDocs = sortDocuments(julia.requiredDocs.filter((d) => !rules.requiredDocs.includes(d)));
  const requiredDocs = sortDocuments([...rules.requiredDocs, ...extraDocs]);

  const extraGuidance = [...new Set(julia.guidance)].filter((g) => !rules.guidance.includes(g));
  const guidance = [...rules.guidance, ...extraGuidance];

  return {
    score: rules.score,
    level,
    requiresArt,
    requiredDocs,
    guidance,
    classifiedBy: "rules+julia",
    addedByJulia: {
      level: level !== rules.level,
      requiresArt: requiresArt && !rules.requiresArt,
      docs: extraDocs,
      guidance: extraGuidance,
      reason: julia.reason,
    },
  };
}
