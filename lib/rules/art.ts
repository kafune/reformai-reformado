// Situação da ART/RRT de uma obra a partir dos documentos (PLAN.md Fase 5). Puro.

import type { CaseStatus, DocStatus } from "./status";

export type ArtSituation = "MISSING" | "SENT" | "APPROVED" | "REJECTED";

export const ART_SITUATION_LABEL: Readonly<Record<ArtSituation, string>> = {
  MISSING: "Faltando",
  SENT: "Enviada",
  APPROVED: "Aprovada",
  REJECTED: "Reprovada",
};

export type DocForArt = { type: string; status: DocStatus; createdAt: Date };

/**
 * Coerente com a guarda de liberação: qualquer ART aprovada conta como aprovada.
 * Senão vale o documento mais recente: pendente = enviada, reprovado = reprovada; nenhum = faltando.
 */
export function artSituation(docs: readonly DocForArt[]): ArtSituation {
  const art = docs.filter((d) => d.type === "ART_RRT");
  if (art.some((d) => d.status === "APPROVED")) return "APPROVED";
  const latest = art.reduce<DocForArt | null>((acc, d) => (!acc || d.createdAt > acc.createdAt ? d : acc), null);
  if (!latest) return "MISSING";
  return latest.status === "PENDING" ? "SENT" : "REJECTED";
}

/** O alarme do painel: obra em execução (ou já liberada) que exige ART e não tem ART aprovada. */
export function isArtAlarm(c: { status: CaseStatus; requiresArt: boolean }, situation: ArtSituation): boolean {
  return c.requiresArt && (c.status === "IN_PROGRESS" || c.status === "APPROVED") && situation !== "APPROVED";
}
