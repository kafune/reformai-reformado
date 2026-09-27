// Status da obra, transições e guardas (PLAN.md §7). Puro: sem Prisma, sem Next.

import { DOCUMENT_LABEL, type DocumentType } from "./checklist";

export type CaseStatus =
  | "DRAFT"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export const CASE_STATUSES: readonly CaseStatus[] = [
  "DRAFT",
  "UNDER_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "REJECTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

export const STATUS_LABEL: Readonly<Record<CaseStatus, string>> = {
  DRAFT: "Rascunho",
  UNDER_REVIEW: "Em análise",
  CHANGES_REQUESTED: "Correção solicitada",
  APPROVED: "Liberada",
  REJECTED: "Recusada",
  IN_PROGRESS: "Em execução",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

export const TRANSITIONS: Readonly<Record<CaseStatus, readonly CaseStatus[]>> = {
  DRAFT: ["UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: ["CHANGES_REQUESTED", "APPROVED", "REJECTED", "CANCELLED"],
  CHANGES_REQUESTED: ["UNDER_REVIEW", "CANCELLED"],
  APPROVED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  REJECTED: [],
  COMPLETED: [],
  CANCELLED: [],
};

/** Status finais: a obra não sai mais deles. */
export function isFinalStatus(status: CaseStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

export function canTransition(from: CaseStatus, to: CaseStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: CaseStatus,
    public readonly to: CaseStatus,
  ) {
    super(`Transição inválida: ${STATUS_LABEL[from]} → ${STATUS_LABEL[to]}`);
    this.name = "InvalidTransitionError";
  }
}

/** Transição inválida lança erro — nunca é ignorada em silêncio. */
export function assertTransition(from: CaseStatus, to: CaseStatus): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}

// ── Guardas ──────────────────────────────────────────────────────────────────

export type DocStatus = "PENDING" | "APPROVED" | "REJECTED";

/** O que as guardas precisam saber da obra. */
export type CaseForGuards = {
  status: CaseStatus;
  requiresArt: boolean;
  requiredDocs: readonly DocumentType[];
  professionalName: string | null;
  professionalReg: string | null;
  artNumber: string | null;
  /** Data de conclusão informada pelo morador. */
  completedAt: Date | null;
};

export type DocForGuards = { type: DocumentType; status: DocStatus };

export type Blocker =
  | { kind: "missing_document"; docType: DocumentType }
  | { kind: "document_not_approved"; docType: DocumentType }
  | { kind: "missing_professional" }
  | { kind: "missing_art_number" }
  | { kind: "art_not_confirmed" }
  | { kind: "completion_not_reported" }
  | { kind: "invalid_status"; from: CaseStatus; to: CaseStatus };

/** Texto do bloqueio para a tela: o botão bloqueado sempre diz o que falta. */
export function blockerMessage(b: Blocker): string {
  switch (b.kind) {
    case "missing_document":
      return `Falta anexar: ${DOCUMENT_LABEL[b.docType]}`;
    case "document_not_approved":
      return `Documento ainda não aprovado: ${DOCUMENT_LABEL[b.docType]}`;
    case "missing_professional":
      return "Falta informar o responsável técnico (nome e registro CREA/CAU)";
    case "missing_art_number":
      return "Falta informar o número da ART/RRT";
    case "art_not_confirmed":
      return "Confirme que a ART/RRT cobre todos os serviços declarados";
    case "completion_not_reported":
      return "O morador ainda não informou a conclusão da obra";
    case "invalid_status":
      return `Transição inválida: ${STATUS_LABEL[b.from]} → ${STATUS_LABEL[b.to]}`;
  }
}

export class GuardError extends Error {
  constructor(public readonly blockers: readonly Blocker[]) {
    super(blockers.map(blockerMessage).join("; "));
    this.name = "GuardError";
  }
}

function isBlank(value: string | null): boolean {
  return value === null || value.trim() === "";
}

/** Documento conta como anexado se existe e não foi reprovado. */
function hasAttached(docs: readonly DocForGuards[], type: DocumentType): boolean {
  return docs.some((d) => d.type === type && d.status !== "REJECTED");
}

function hasApproved(docs: readonly DocForGuards[], type: DocumentType): boolean {
  return docs.some((d) => d.type === type && d.status === "APPROVED");
}

/**
 * Enviar para análise (DRAFT | CHANGES_REQUESTED → UNDER_REVIEW): todos os documentos
 * obrigatórios anexados e, se exige ART/RRT, profissional, registro e nº da ART/RRT preenchidos.
 */
export function submissionBlockers(c: CaseForGuards, docs: readonly DocForGuards[]): Blocker[] {
  const blockers: Blocker[] = [];
  if (!canTransition(c.status, "UNDER_REVIEW")) {
    blockers.push({ kind: "invalid_status", from: c.status, to: "UNDER_REVIEW" });
  }
  for (const docType of c.requiredDocs) {
    if (!hasAttached(docs, docType)) blockers.push({ kind: "missing_document", docType });
  }
  if (c.requiresArt) {
    if (isBlank(c.professionalName) || isBlank(c.professionalReg)) {
      blockers.push({ kind: "missing_professional" });
    }
    if (isBlank(c.artNumber)) blockers.push({ kind: "missing_art_number" });
  }
  return blockers;
}

export function assertCanSubmit(c: CaseForGuards, docs: readonly DocForGuards[]): void {
  const blockers = submissionBlockers(c, docs);
  if (blockers.length > 0) throw new GuardError(blockers);
}

/**
 * Liberar (UNDER_REVIEW → APPROVED): todos os documentos obrigatórios APROVADOS e, se exige
 * ART/RRT, quem libera confirma "Conferi que a ART/RRT cobre todos os serviços declarados".
 */
export function approvalBlockers(
  c: CaseForGuards,
  docs: readonly DocForGuards[],
  artConfirmed: boolean,
): Blocker[] {
  const blockers: Blocker[] = [];
  if (!canTransition(c.status, "APPROVED")) {
    blockers.push({ kind: "invalid_status", from: c.status, to: "APPROVED" });
  }
  for (const docType of c.requiredDocs) {
    if (!hasAttached(docs, docType)) blockers.push({ kind: "missing_document", docType });
    else if (!hasApproved(docs, docType)) blockers.push({ kind: "document_not_approved", docType });
  }
  if (c.requiresArt && !artConfirmed) blockers.push({ kind: "art_not_confirmed" });
  return blockers;
}

export function assertCanApprove(
  c: CaseForGuards,
  docs: readonly DocForGuards[],
  artConfirmed: boolean,
): void {
  const blockers = approvalBlockers(c, docs, artConfirmed);
  if (blockers.length > 0) throw new GuardError(blockers);
}

/** Concluir (IN_PROGRESS → COMPLETED): o morador informou a conclusão. */
export function completionBlockers(c: CaseForGuards): Blocker[] {
  const blockers: Blocker[] = [];
  if (!canTransition(c.status, "COMPLETED")) {
    blockers.push({ kind: "invalid_status", from: c.status, to: "COMPLETED" });
  }
  if (c.completedAt === null) blockers.push({ kind: "completion_not_reported" });
  return blockers;
}

export function assertCanComplete(c: CaseForGuards): void {
  const blockers = completionBlockers(c);
  if (blockers.length > 0) throw new GuardError(blockers);
}
