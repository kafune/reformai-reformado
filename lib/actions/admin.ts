"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { assertAdmin } from "@/lib/permissions";
import { fromZodError, type ActionState } from "@/lib/actions/state";
import { generateSignupCode, parseUnitLines } from "@/lib/admin-helpers";

// ── Condomínios ──────────────────────────────────────────────────────────────

const SIGNUP_CODE = /^[A-Z0-9][A-Z0-9-]{2,28}[A-Z0-9]$/;

const CondominiumSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome.").max(120),
  address: z.string().trim().min(3, "Informe o endereço.").max(200),
  city: z.string().trim().min(2, "Informe a cidade.").max(80),
  state: z.string().trim().toUpperCase().length(2, "UF com 2 letras."),
  signupCode: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .transform((v) => v || undefined)
    .refine((v) => v === undefined || SIGNUP_CODE.test(v), "Use letras, números e hífen (4 a 30 caracteres)."),
});

export async function createCondominium(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  assertAdmin(user);
  const parsed = CondominiumSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const data = parsed.data;
  const signupCode = data.signupCode ?? (generateSignupCode(data.name));
  if (await db.condominium.findUnique({ where: { signupCode } })) {
    return { error: "Já existe um condomínio com este código de cadastro.", fieldErrors: { signupCode: ["Escolha outro."] } };
  }
  const created = await db.condominium.create({ data: { ...data, signupCode } });
  revalidatePath("/admin/condominios");
  redirect(`/admin/condominios/${created.id}`);
}

export async function updateCondominium(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  assertAdmin(user);
  const parsed = CondominiumSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const data = parsed.data;
  if (data.signupCode) {
    const other = await db.condominium.findUnique({ where: { signupCode: data.signupCode } });
    if (other && other.id !== id) return { error: "Já existe um condomínio com este código.", fieldErrors: { signupCode: ["Escolha outro."] } };
  }
  await db.condominium.update({ where: { id }, data: { ...data, signupCode: data.signupCode ?? undefined } });
  revalidatePath(`/admin/condominios/${id}`);
  revalidatePath("/admin/condominios");
  return { ok: true };
}

export async function setCondominiumActive(id: string, active: boolean): Promise<ActionState> {
  const user = await getCurrentUser();
  assertAdmin(user);
  await db.condominium.update({ where: { id }, data: { active } });
  revalidatePath(`/admin/condominios/${id}`);
  revalidatePath("/admin/condominios");
  return { ok: true };
}

/** Gerar novo código invalida o link/QR antigo. */
export async function regenerateSignupCode(id: string): Promise<ActionState> {
  const user = await getCurrentUser();
  assertAdmin(user);
  const c = await db.condominium.findUniqueOrThrow({ where: { id } });
  await db.condominium.update({ where: { id }, data: { signupCode: generateSignupCode(c.name) } });
  revalidatePath(`/admin/condominios/${id}`);
  return { ok: true };
}

// ── Unidades ─────────────────────────────────────────────────────────────────

const UnitSchema = z.object({
  block: z.string().trim().toUpperCase().max(10).default(""),
  number: z.string().trim().min(1, "Informe o número.").max(10),
});

export async function createUnit(condominiumId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  assertAdmin(user);
  const parsed = UnitSchema.safeParse({ block: formData.get("block") ?? "", number: formData.get("number") });
  if (!parsed.success) return fromZodError(parsed.error);
  const key = { condominiumId, ...parsed.data };
  if (await db.unit.findUnique({ where: { condominiumId_block_number: key } })) return { error: "Esta unidade já existe." };
  await db.unit.create({ data: key });
  revalidatePath(`/admin/condominios/${condominiumId}`);
  return { ok: true };
}

export async function importUnits(condominiumId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  assertAdmin(user);
  const text = z.string().max(50_000).safeParse(formData.get("lines"));
  if (!text.success) return { error: "Lista inválida." };
  const units = parseUnitLines(text.data);
  if (units.length === 0) return { error: "Nenhuma unidade válida na lista. Use uma por linha: bloco;número." };
  const result = await db.unit.createMany({ data: units.map((u) => ({ condominiumId, ...u })), skipDuplicates: true });
  revalidatePath(`/admin/condominios/${condominiumId}`);
  return { ok: true, error: undefined, fieldErrors: { _: [`${result.count} de ${units.length} unidades importadas (as demais já existiam).`] } };
}

/** Só remove unidade sem morador e sem obra. */
export async function deleteUnit(unitId: string): Promise<ActionState> {
  const user = await getCurrentUser();
  assertAdmin(user);
  const unit = await db.unit.findUnique({ where: { id: unitId }, include: { _count: { select: { cases: true } } } });
  if (!unit) return { error: "Unidade não encontrada." };
  if (unit.residentId || unit._count.cases > 0) return { error: "A unidade tem morador ou obras; não pode ser removida." };
  await db.unit.delete({ where: { id: unitId } });
  revalidatePath(`/admin/condominios/${unit.condominiumId}`);
  return { ok: true };
}

// ── Usuários ─────────────────────────────────────────────────────────────────

const SyndicSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome.").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  phone: z.string().trim().max(30).optional(),
  password: z.string().min(8, "Senha provisória com pelo menos 8 caracteres."),
});

/** Admin cria o síndico com senha provisória (ele troca depois; Fase 10). */
export async function createSyndic(condominiumId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  assertAdmin(user);
  const parsed = SyndicSchema.safeParse({ ...Object.fromEntries(formData), phone: formData.get("phone") || undefined });
  if (!parsed.success) return fromZodError(parsed.error);
  const data = parsed.data;
  if (await db.user.findUnique({ where: { email: data.email } })) return { error: "Já existe um usuário com este e-mail.", fieldErrors: { email: ["Use outro."] } };
  await db.user.create({
    data: { name: data.name, email: data.email, phone: data.phone ?? null, passwordHash: await hashPassword(data.password), role: "SYNDIC", condominiumId },
  });
  revalidatePath(`/admin/condominios/${condominiumId}`);
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

export async function setUserActive(userId: string, active: boolean): Promise<ActionState> {
  const user = await getCurrentUser();
  assertAdmin(user);
  if (userId === user.id) return { error: "Você não pode desativar a própria conta." };
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "Usuário não encontrado." };
  await db.user.update({ where: { id: userId }, data: { active } });
  if (target.condominiumId) revalidatePath(`/admin/condominios/${target.condominiumId}`);
  revalidatePath("/admin/usuarios");
  return { ok: true };
}
