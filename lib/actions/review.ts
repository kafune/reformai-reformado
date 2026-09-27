"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/events";
import { assertCan, getCaseForUser } from "@/lib/permissions";
import { GuardError, assertCanApprove, assertCanComplete, assertTransition } from "@/lib/rules/status";
import { fromZodError, type ActionState } from "@/lib/actions/state";
import { readReleaseRecommendation, type ReleaseOption } from "@/lib/decision";
import { maybeRecommendRelease } from "@/lib/julia";

const ReviewDocumentSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"]),
    note: z.string().trim().max(1000).optional(),
  })
  .refine((d) => d.status === "APPROVED" || (d.note && d.note.length > 0), {
    message: "Diga ao morador o que está errado.",
    path: ["note"],
  });

/** Síndico/admin aprova ou reprova um documento, com nota. Humano decide (PLAN.md §10). */
export async function reviewDocument(documentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  const doc = await db.document.findUnique({ where: { id: documentId } });
  if (!doc) return { error: "Documento não encontrado." };
  const c = await getCaseForUser(user, doc.caseId);
  assertCan(user, "review", c);

  const parsed = ReviewDocumentSchema.safeParse({ status: formData.get("status"), note: formData.get("note") || undefined });
  if (!parsed.success) return fromZodError(parsed.error);
  const { status, note } = parsed.data;

  await db.$transaction(async (tx) => {
    await tx.document.update({ where: { id: documentId }, data: { status, reviewNote: note ?? null } });
    await logEvent(tx, {
      caseId: c.id,
      userId: user.id,
      type: "document_reviewed",
      message: note ?? null,
      data: { documentId, type: doc.type, status },
    });
  });
  await maybeRecommendRelease(c.id); // Decisão 3 da Julia-1, quando todos os documentos foram avaliados

  revalidatePath(`/obras/${c.id}`);
  return { ok: true };
}

/** Registra se o humano aceitou ou alterou a recomendação da Julia-1 (base para medir qualidade). */
function juliaOutcome(c: { releaseRecommendation: unknown }, action: ReleaseOption) {
  const rec = readReleaseRecommendation(c.releaseRecommendation);
  if (!rec) return {};
  const accepted = rec.recommendation === action || (action === "approve" && rec.recommendation === "approve_with_conditions");
  return { juliaRecommendation: rec.recommendation, juliaConfidence: rec.confidence, juliaAccepted: accepted };
}

const MessageSchema = z.object({ message: z.string().trim().min(5, "Explique o motivo (mínimo de 5 caracteres).").max(2000) });

export async function requestChanges(caseId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  const c = await getCaseForUser(user, caseId);
  assertCan(user, "review", c);
  assertTransition(c.status, "CHANGES_REQUESTED");

  const parsed = MessageSchema.safeParse({ message: formData.get("message") });
  if (!parsed.success) return fromZodError(parsed.error);

  await db.$transaction(async (tx) => {
    await tx.case.update({ where: { id: caseId }, data: { status: "CHANGES_REQUESTED" } });
    await logEvent(tx, {
      caseId,
      userId: user.id,
      type: "status_changed",
      fromStatus: c.status,
      toStatus: "CHANGES_REQUESTED",
      message: parsed.data.message,
      data: juliaOutcome(c, "request_changes"),
    });
  });

  revalidatePath(`/obras/${caseId}`);
  revalidatePath("/obras");
  return { ok: true };
}

const ApproveSchema = z.object({
  conditions: z.string().trim().max(2000).optional(),
  artConfirmed: z.boolean(),
});

/** Liberar: clique humano. A guarda pura confere documentos aprovados e a conferência da ART/RRT. */
export async function approveCase(caseId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  const c = await getCaseForUser(user, caseId);
  assertCan(user, "review", c);

  const parsed = ApproveSchema.safeParse({
    conditions: formData.get("conditions") || undefined,
    artConfirmed: formData.get("artConfirmed") === "on",
  });
  if (!parsed.success) return fromZodError(parsed.error);
  const { conditions, artConfirmed } = parsed.data;

  const docs = await db.document.findMany({ where: { caseId }, select: { type: true, status: true } });
  try {
    assertCanApprove(c, docs, artConfirmed);
  } catch (error) {
    if (error instanceof GuardError) return { error: error.message };
    throw error;
  }

  await db.$transaction(async (tx) => {
    await tx.case.update({ where: { id: caseId }, data: { status: "APPROVED", approvalConditions: conditions ?? null } });
    if (c.requiresArt) {
      await logEvent(tx, {
        caseId,
        userId: user.id,
        type: "art_confirmed",
        data: { artNumber: c.artNumber, professionalReg: c.professionalReg },
      });
    }
    await logEvent(tx, {
      caseId,
      userId: user.id,
      type: "status_changed",
      fromStatus: c.status,
      toStatus: "APPROVED",
      message: conditions ?? null,
      data: { artConfirmed, conditions: conditions ?? null, ...juliaOutcome(c, conditions ? "approve_with_conditions" : "approve") },
    });
  });

  revalidatePath(`/obras/${caseId}`);
  revalidatePath("/obras");
  return { ok: true };
}

export async function rejectCase(caseId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  const c = await getCaseForUser(user, caseId);
  assertCan(user, "review", c);
  assertTransition(c.status, "REJECTED");

  const parsed = MessageSchema.safeParse({ message: formData.get("message") });
  if (!parsed.success) return fromZodError(parsed.error);

  await db.$transaction(async (tx) => {
    await tx.case.update({ where: { id: caseId }, data: { status: "REJECTED" } });
    await logEvent(tx, {
      caseId,
      userId: user.id,
      type: "status_changed",
      fromStatus: c.status,
      toStatus: "REJECTED",
      message: parsed.data.message,
      data: juliaOutcome(c, "reject"),
    });
  });

  revalidatePath(`/obras/${caseId}`);
  revalidatePath("/obras");
  return { ok: true };
}

/** Síndico/admin confirma a conclusão informada pelo morador. */
export async function confirmCompletion(caseId: string): Promise<ActionState> {
  const user = await getCurrentUser();
  const c = await getCaseForUser(user, caseId);
  assertCan(user, "confirm_completion", c);
  try {
    assertCanComplete(c);
  } catch (error) {
    if (error instanceof GuardError) return { error: error.message };
    throw error;
  }

  await db.$transaction(async (tx) => {
    await tx.case.update({ where: { id: caseId }, data: { status: "COMPLETED" } });
    await logEvent(tx, { caseId, userId: user.id, type: "status_changed", fromStatus: c.status, toStatus: "COMPLETED" });
  });

  revalidatePath(`/obras/${caseId}`);
  revalidatePath("/obras");
  return { ok: true };
}
