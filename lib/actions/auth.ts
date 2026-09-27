"use server";

import { AuthError } from "next-auth";

import { signIn, signOut } from "@/lib/auth";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/obras",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) return { error: "E-mail ou senha inválidos." };
    throw error; // inclui o redirect do Next em caso de sucesso
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
