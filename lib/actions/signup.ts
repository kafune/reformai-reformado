"use server";

import { AuthError } from "next-auth";
import { z } from "zod";

import { signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { fromZodError, type ActionState } from "@/lib/actions/state";

const SignupSchema = z.object({
  name: z.string().trim().min(3, "Informe seu nome completo."),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  phone: z.string().trim().max(30).optional(),
  password: z.string().min(8, "Mínimo de 8 caracteres."),
  block: z.string().trim().max(10).default(""),
  number: z.string().trim().min(1, "Informe a unidade.").max(10),
  lgpd: z.literal("on", { error: "É preciso aceitar o aviso de privacidade." }),
});

/** Autocadastro do morador pelo link/QR do condomínio (PLAN.md Fase 3). */
export async function signup(signupCode: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = SignupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    password: formData.get("password"),
    block: formData.get("block") ?? "",
    number: formData.get("number"),
    lgpd: formData.get("lgpd"),
  });
  if (!parsed.success) return fromZodError(parsed.error);
  const data = parsed.data;

  const condominium = await db.condominium.findUnique({ where: { signupCode } });
  if (!condominium || !condominium.active) return { error: "Link de cadastro inválido." };

  if (await db.user.findUnique({ where: { email: data.email } })) {
    return { error: "Já existe uma conta com este e-mail. Entre com sua senha." };
  }

  const unitKey = { condominiumId: condominium.id, block: data.block, number: data.number };
  const existing = await db.unit.findUnique({ where: { condominiumId_block_number: unitKey } });
  if (existing?.residentId) {
    return { error: "Esta unidade já tem outro morador cadastrado. Fale com o síndico." };
  }

  await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        passwordHash: await hashPassword(data.password),
        role: "RESIDENT",
        condominiumId: condominium.id,
        lgpdConsentAt: new Date(),
      },
    });
    if (existing) {
      await tx.unit.update({ where: { id: existing.id }, data: { residentId: user.id } });
    } else {
      await tx.unit.create({ data: { ...unitKey, residentId: user.id } });
    }
  });

  try {
    await signIn("credentials", { email: data.email, password: data.password, redirectTo: "/obras" });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) return { error: "Conta criada, mas não foi possível entrar. Use a tela de login." };
    throw error;
  }
}
