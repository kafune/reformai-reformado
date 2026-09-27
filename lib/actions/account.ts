"use server";

import { z } from "zod";

import { getCurrentUser, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { fromZodError, type ActionState } from "@/lib/actions/state";

const PasswordSchema = z
  .object({
    current: z.string().min(1, "Informe a senha atual."),
    password: z.string().min(8, "Mínimo de 8 caracteres."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "As senhas não conferem.", path: ["confirm"] });

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  const parsed = PasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  if (!(await verifyPassword(parsed.data.current, user.passwordHash))) return { fieldErrors: { current: ["Senha atual incorreta."] }, error: "Confira a senha atual." };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  return { ok: true };
}

const ProfileSchema = z.object({
  name: z.string().trim().min(3, "Informe seu nome.").max(120),
  phone: z.string().trim().max(30).optional(),
});

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  const parsed = ProfileSchema.safeParse({ name: formData.get("name"), phone: formData.get("phone") || undefined });
  if (!parsed.success) return fromZodError(parsed.error);
  await db.user.update({ where: { id: user.id }, data: { name: parsed.data.name, phone: parsed.data.phone ?? null } });
  return { ok: true };
}

/**
 * LGPD: excluir a conta = anonimizar (nome, e-mail e telefone trocados, login bloqueado).
 * Obras e histórico ficam; a unidade fica livre para outro morador.
 */
export async function deleteMyAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (formData.get("confirm") !== "EXCLUIR") return { error: 'Digite EXCLUIR para confirmar.' };
  if (user.role === "ADMIN") {
    const admins = await db.user.count({ where: { role: "ADMIN", active: true } });
    if (admins <= 1) return { error: "Você é a única conta da administradora ativa; crie outra antes de excluir esta." };
  }
  await db.$transaction(async (tx) => {
    await tx.unit.updateMany({ where: { residentId: user.id }, data: { residentId: null } });
    await tx.user.update({
      where: { id: user.id },
      data: {
        name: "Usuário removido",
        email: `removido-${user.id}@anonimo.invalid`,
        phone: null,
        passwordHash: await hashPassword(crypto.randomUUID()),
        active: false,
        lgpdConsentAt: null,
      },
    });
  });
  await signOut({ redirectTo: "/login" });
  return { ok: true };
}
