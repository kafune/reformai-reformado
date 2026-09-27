import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SignupForm } from "@/components/signup-form";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/logo";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Criar conta de morador" };

export default async function SignupPage({ params }: PageProps<"/cadastro/[signupCode]">) {
  const { signupCode } = await params;
  const condominium = await db.condominium.findUnique({
    where: { signupCode },
    include: { units: { select: { block: true }, distinct: ["block"], orderBy: { block: "asc" } } },
  });
  if (!condominium || !condominium.active) notFound();

  const blocks = condominium.units.map((u) => u.block).filter((b) => b !== "");

  return (
    <div className="flex min-h-screen flex-col bg-paper px-6 py-10 sm:px-10">
      <div className="mx-auto w-full max-w-[520px]">
        <Logo size={32} variant="lockup" />

        <p className="mt-8 font-mono text-xs tracking-caps text-green-700 uppercase">Cadastro de morador</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">Criar conta de morador</h1>
        <div className="mt-3">
          <Badge variant="green" dot>
            {condominium.name} · {condominium.city}/{condominium.state}
          </Badge>
        </div>
        <p className="mt-3 mb-6 text-base text-ink-500">
          Com a conta você registra reformas da sua unidade e acompanha a liberação.
        </p>

        <div className="rounded-md bg-surface p-5 shadow-hair md:p-6">
          <SignupForm signupCode={signupCode} blocks={blocks} />
        </div>

        <p className="mt-6 border-t border-divider pt-4 text-sm text-ink-500">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-green-700 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
