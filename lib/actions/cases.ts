"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/events";
import { assertCan, getCaseForUser } from "@/lib/permissions";
import { nextProtocol } from "@/lib/protocol";
import { requiredDocuments } from "@/lib/rules/checklist";
import { calculateRisk } from "@/lib/rules/risk";
import { SERVICE_KEYS, type ServiceKey } from "@/lib/rules/services";
import { assertCanSubmit, assertTransition } from "@/lib/rules/status";
import { fromZodError, type ActionState } from "@/lib/actions/state";

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s ? new Date(`${s}T12:00:00`) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), "Data inválida.");

const CaseSchema = z
  .object({
    services: z
      .array(z.enum(SERVICE_KEYS as [ServiceKey, ...ServiceKey[]]))
      .min(1, "Selecione pelo menos um serviço."),
    affectsCommonArea: z.boolean(),
    affectsFacade: z.boolean(),
    affectsStructure: z.boolean(),
    description: z.string().trim().min(10, "Descreva a obra com pelo menos 10 caracteres.").max(4000),
    plannedStart: optionalDate,
    plannedEnd: optionalDate,
    contractorName: z.string().trim().max(200).optional(),
  })
  .refine((d) => !d.plannedStart || !d.plannedEnd || d.plannedEnd >= d.plannedStart, {
    message: "O término deve ser depois do início.",
    path: ["plannedEnd"],
  });

function parseCaseForm(formData: FormData) {
  return CaseSchema.safeParse({
    services: formData.getAll("services"),
    affectsCommonArea: formData.get("affectsCommonArea") === "on",
    affectsFacade: formData.get("affectsFacade") === "on",
    affectsStructure: formData.get("affectsStructure") === "on",
    description: formData.get("description"),
    plannedStart: formData.get("plannedStart") ?? undefined,
    plannedEnd: formData.get("plannedEnd") ?? undefined,
    contractorName: formData.get("contractorName") || undefined,
  });
}

/** Classificação pelas regras (piso). A Julia-1 entra na Fase 6 via mergeClassification. */
function classify(data: z.infer<typeof CaseSchema>) {
  const risk = calculateRisk(data.services, data);
  return {
    riskScore: risk.score,
    riskLevel: risk.level,
    requiresArt: risk.requiresArt,
    requiredDocs: requiredDocuments(risk),
    classifiedBy: "rules",
  };
}

export async function createCase(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (user.role !== "RESIDENT") return { error: "Só moradores criam obras." };
  const unit = await db.unit.findFirst({ where: { residentId: user.id } });
  if (!unit) return { error: "Sua conta não está vinculada a uma unidade. Fale com o síndico." };

  const parsed = parseCaseForm(formData);
  if (!parsed.success) return fromZodError(parsed.error);
  const data = parsed.data;

  const created = await db.$transaction(async (tx) => {
    const c = await tx.case.create({
      data: {
        protocol: await nextProtocol(tx),
        condominiumId: unit.condominiumId,
        unitId: unit.id,
        residentId: user.id,
        status: "DRAFT",
        services: data.services,
        affectsCommonArea: data.affectsCommonArea,
        affectsFacade: data.affectsFacade,
        affectsStructure: data.affectsStructure,
        description: data.description,
        plannedStart: data.plannedStart,
        plannedEnd: data.plannedEnd,
        contractorName: data.contractorName ?? null,
        ...classify(data),
      },
    });
    await logEvent(tx, { caseId: c.id, userId: user.id, type: "status_changed", toStatus: "DRAFT", message: "Obra criada" });
    return c;
  });

  redirect(`/obras/${created.id}`);
}

export async function updateCase(caseId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  const c = await getCaseForUser(user, caseId);
  assertCan(user, "edit", c);

  const parsed = parseCaseForm(formData);
  if (!parsed.success) return fromZodError(parsed.error);
  const data = parsed.data;
  const classification = classify(data);

  await db.$transaction(async (tx) => {
    await tx.case.update({
      where: { id: caseId },
      data: {
        services: data.services,
        affectsCommonArea: data.affectsCommonArea,
        affectsFacade: data.affectsFacade,
        affectsStructure: data.affectsStructure,
        description: data.description,
        plannedStart: data.plannedStart,
        plannedEnd: data.plannedEnd,
        contractorName: data.contractorName ?? null,
        ...classification,
      },
    });
    await logEvent(tx, {
      caseId,
      userId: user.id,
      type: "case_updated",
      message: "Obra editada",
      data: { services: data.services, riskLevel: classification.riskLevel, requiresArt: classification.requiresArt },
    });
  });

  revalidatePath(`/obras/${caseId}`);
  redirect(`/obras/${caseId}`);
}

const ProfessionalSchema = z.object({
  professionalName: z.string().trim().min(3, "Informe o nome do profissional.").max(200),
  professionalType: z.enum(["ENGINEER", "ARCHITECT"], { error: "Escolha a profissão." }),
  professionalReg: z.string().trim().min(3, "Informe o registro CREA/CAU.").max(50),
  artNumber: z.string().trim().min(3, "Informe o número da ART/RRT.").max(50),
});

export async function updateProfessional(caseId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  const c = await getCaseForUser(user, caseId);
  assertCan(user, "upload", c);

  const parsed = ProfessionalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  await db.$transaction(async (tx) => {
    await tx.case.update({ where: { id: caseId }, data: parsed.data });
    await logEvent(tx, {
      caseId,
      userId: user.id,
      type: "professional_updated",
      data: { name: parsed.data.professionalName, reg: parsed.data.professionalReg, artNumber: parsed.data.artNumber },
    });
  });

  revalidatePath(`/obras/${caseId}`);
  return { ok: true };
}

export async function submitCase(caseId: string): Promise<ActionState> {
  const user = await getCurrentUser();
  const c = await getCaseForUser(user, caseId);
  assertCan(user, "submit", c);
  const docs = await db.document.findMany({ where: { caseId }, select: { type: true, status: true } });
  assertCanSubmit(c, docs); // regra pura: lança GuardError com o que falta

  await db.$transaction(async (tx) => {
    await tx.case.update({ where: { id: caseId }, data: { status: "UNDER_REVIEW" } });
    await logEvent(tx, { caseId, userId: user.id, type: "status_changed", fromStatus: c.status, toStatus: "UNDER_REVIEW" });
  });

  revalidatePath(`/obras/${caseId}`);
  revalidatePath("/obras");
  return { ok: true };
}

export async function cancelCase(caseId: string): Promise<ActionState> {
  const user = await getCurrentUser();
  const c = await getCaseForUser(user, caseId);
  assertCan(user, "cancel", c);
  assertTransition(c.status, "CANCELLED");

  await db.$transaction(async (tx) => {
    await tx.case.update({ where: { id: caseId }, data: { status: "CANCELLED" } });
    await logEvent(tx, { caseId, userId: user.id, type: "status_changed", fromStatus: c.status, toStatus: "CANCELLED" });
  });

  revalidatePath(`/obras/${caseId}`);
  revalidatePath("/obras");
  return { ok: true };
}
