// Checklist de documentos por nível de risco (PLAN.md §8.3). Puro.

import type { RiskLevel } from "./risk";

export type DocumentType =
  | "RESPONSIBILITY_TERM"
  | "ART_RRT"
  | "DESCRIPTIVE_MEMORIAL"
  | "PROJECT"
  | "SCHEDULE"
  | "TEAM_LIST";

/** Ordem canônica em que os documentos aparecem nas telas. */
export const DOCUMENT_TYPES: readonly DocumentType[] = [
  "RESPONSIBILITY_TERM",
  "ART_RRT",
  "DESCRIPTIVE_MEMORIAL",
  "PROJECT",
  "SCHEDULE",
  "TEAM_LIST",
];

export const DOCUMENT_LABEL: Readonly<Record<DocumentType, string>> = {
  RESPONSIBILITY_TERM: "Termo de responsabilidade",
  ART_RRT: "ART/RRT",
  DESCRIPTIVE_MEMORIAL: "Memorial descritivo",
  PROJECT: "Projeto",
  SCHEDULE: "Cronograma",
  TEAM_LIST: "Relação da equipe",
};

export function isDocumentType(value: string): value is DocumentType {
  return (DOCUMENT_TYPES as readonly string[]).includes(value);
}

const BY_LEVEL: Readonly<Record<RiskLevel, readonly DocumentType[]>> = {
  LOW: [],
  MEDIUM: ["RESPONSIBILITY_TERM"],
  HIGH: ["RESPONSIBILITY_TERM", "ART_RRT", "DESCRIPTIVE_MEMORIAL"],
  CRITICAL: ["RESPONSIBILITY_TERM", "ART_RRT", "DESCRIPTIVE_MEMORIAL", "PROJECT", "SCHEDULE", "TEAM_LIST"],
};

/** Documentos obrigatórios. Sempre que exige ART/RRT, ela entra, mesmo em nível baixo. */
export function requiredDocuments(risk: { level: RiskLevel; requiresArt: boolean }): DocumentType[] {
  const docs = new Set<DocumentType>(BY_LEVEL[risk.level]);
  if (risk.requiresArt) docs.add("ART_RRT");
  return sortDocuments([...docs]);
}

/** Devolve os tipos na ordem canônica, sem repetição. */
export function sortDocuments(types: readonly DocumentType[]): DocumentType[] {
  return DOCUMENT_TYPES.filter((t) => types.includes(t));
}
