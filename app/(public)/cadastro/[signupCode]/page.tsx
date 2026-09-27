import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SignupForm } from "@/components/signup-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(1200px_500px_at_50%_-10%,#dcfce7_0%,transparent_60%)] px-4 py-6">
      <Card className="w-full max-w-[520px] py-7">
        <CardContent className="flex flex-col gap-3 px-7">
          <div className="mb-1 flex items-center gap-2.5 text-[15px] font-bold">
            <span className="grid size-7 place-items-center rounded-lg bg-primary text-sm text-primary-foreground">
              R
            </span>
            ReformAI
          </div>
          <Badge variant="ok" className="w-fit">
            {condominium.name} · {condominium.city}/{condominium.state}
          </Badge>
          <h1 className="text-[22px] font-semibold tracking-tight">Criar conta de morador</h1>
          <p className="mb-2 text-muted-foreground">
            Com a conta você registra reformas da sua unidade e acompanha a liberação.
          </p>
          <SignupForm signupCode={signupCode} blocks={blocks} />
        </CardContent>
      </Card>
    </main>
  );
}
