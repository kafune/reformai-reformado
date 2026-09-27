// Tudo que muda uma obra gera um CaseEvent (PLAN.md §4.6). Uma tabela: histórico + auditoria.
import type { Prisma } from "@/lib/generated/prisma/client";
import type { Tx } from "@/lib/db";
import type { CaseStatus } from "@/lib/rules/status";

export type CaseEventType =
  | "status_changed"
  | "case_updated"
  | "document_uploaded"
  | "document_reviewed"
  | "professional_updated"
  | "completion_reported"
  | "art_confirmed"
  | "comment"
  | "ai_suggestion"
  | "julia_decision";

export async function logEvent(
  tx: Tx,
  event: {
    caseId: string;
    userId: string | null; // null = sistema
    type: CaseEventType;
    fromStatus?: CaseStatus | null;
    toStatus?: CaseStatus | null;
    message?: string | null;
    data?: Prisma.InputJsonValue;
  },
) {
  return tx.caseEvent.create({
    data: {
      caseId: event.caseId,
      userId: event.userId,
      type: event.type,
      fromStatus: event.fromStatus ?? null,
      toStatus: event.toStatus ?? null,
      message: event.message ?? null,
      data: event.data,
    },
  });
}
