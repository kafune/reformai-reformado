// Auth.js (NextAuth v5) com e-mail e senha (PLAN.md §5). Sessão em JWT, sem adapter.
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const user = await db.user.findUnique({ where: { email: parsed.data.email } });
        if (!user || !user.active) return null;
        if (!(await verifyPassword(parsed.data.password, user.passwordHash))) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          condominiumId: user.condominiumId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.condominiumId = user.condominiumId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.condominiumId = token.condominiumId;
      return session;
    },
  },
});

/**
 * Usuário logado, recarregado do banco (perfil/ativo sempre atuais).
 * Redireciona para /login se não houver sessão válida.
 */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { condominium: { select: { id: true, name: true } } },
  });
  if (!user || !user.active) redirect("/login");
  return user;
}

export type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;
