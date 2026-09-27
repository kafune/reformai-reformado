// Permissão sempre no servidor (PLAN.md §4.5). As funções `canViewCase`, `can` e
// `assertCan` são puras (com teste); `getCaseForUser` é a única que fala com o banco.

import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import type { CaseStatus } from "@/lib/rules/status";

export type Role = "ADMIN" | "SYNDIC" | "RESIDENT";

/** O que as permissões precisam saber do usuário. */
export type UserForPermissions = {
  id: string;
  role: Role;
  condominiumId: string | null;
};

/** O que as permissões precisam saber da obra. */
export type CaseForPermissions = {
  residentId: string;
  condominiumId: string;
  status: CaseStatus;
};

export type CaseAction =
  | "edit" // morador: alterar serviços/descrição (rascunho ou correção solicitada)
  | "upload" // morador: anexar documento / informar responsável técnico
  | "submit" // morador: enviar para análise
  | "cancel" // morador (antes de iniciar) ou admin (antes de finalizar)
  | "start" // morador: informar início
  | "report_completion" // morador: informar conclusão
  | "review" // síndico/admin: conferir documentos, pedir correção, liberar, recusar
  | "confirm_completion"; // síndico/admin: confirmar conclusão

const RESIDENT_EDITABLE: readonly CaseStatus[] = ["DRAFT", "CHANGES_REQUESTED"];
const NOT_STARTED: readonly CaseStatus[] = ["DRAFT", "UNDER_REVIEW", "CHANGES_REQUESTED", "APPROVED"];
const NOT_FINAL: readonly CaseStatus[] = [...NOT_STARTED, "IN_PROGRESS"];

/** Morador só vê as próprias obras; síndico só as do seu condomínio; admin vê tudo. */
export function canViewCase(user: UserForPermissions, c: CaseForPermissions): boolean {
  switch (user.role) {
    case "ADMIN":
      return true;
    case "SYNDIC":
      return user.condominiumId !== null && c.condominiumId === user.condominiumId;
    case "RESIDENT":
      return c.residentId === user.id;
  }
}

export function isReviewer(user: UserForPermissions): boolean {
  return user.role === "ADMIN" || user.role === "SYNDIC";
}

export function can(user: UserForPermissions, action: CaseAction, c: CaseForPermissions): boolean {
  if (!canViewCase(user, c)) return false;
  const owner = user.role === "RESIDENT" && c.residentId === user.id;
  const reviewer = isReviewer(user);

  switch (action) {
    case "edit":
    case "upload":
    case "submit":
      return owner && RESIDENT_EDITABLE.includes(c.status);
    case "start":
      return owner && c.status === "APPROVED";
    case "report_completion":
      return owner && c.status === "IN_PROGRESS";
    case "cancel":
      if (owner) return NOT_STARTED.includes(c.status);
      if (user.role === "ADMIN") return NOT_FINAL.includes(c.status);
      return false;
    case "review":
      return reviewer && c.status === "UNDER_REVIEW";
    case "confirm_completion":
      return reviewer && c.status === "IN_PROGRESS";
  }
}

export class ForbiddenError extends Error {
  constructor(action: CaseAction) {
    super(`Você não pode executar esta ação (${action}) nesta obra.`);
    this.name = "ForbiddenError";
  }
}

export function assertCan(user: UserForPermissions, action: CaseAction, c: CaseForPermissions): void {
  if (!can(user, action, c)) throw new ForbiddenError(action);
}

/** Filtro Prisma das obras que o usuário pode ver (para listas). */
export function caseFilterForUser(user: UserForPermissions) {
  switch (user.role) {
    case "ADMIN":
      return {};
    case "SYNDIC":
      return { condominiumId: user.condominiumId ?? "__none__" };
    case "RESIDENT":
      return { residentId: user.id };
  }
}

/** Carrega a obra; 404 se não existe ou o usuário não pode vê-la (não revela existência). */
export async function getCaseForUser(user: UserForPermissions, caseId: string) {
  const c = await db.case.findUnique({
    where: { id: caseId },
    include: {
      condominium: true,
      unit: true,
      resident: { select: { id: true, name: true, email: true, phone: true } },
    },
  });
  if (!c || !canViewCase(user, c)) notFound();
  return c;
}
