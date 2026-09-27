import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CaseForm } from "@/components/case/case-form";
import { PageHeader } from "@/components/page-header";
import { createCase } from "@/lib/actions/cases";
import { getCurrentUser } from "@/lib/auth";
import { juliaConfig } from "@/lib/decision";

export const metadata: Metadata = { title: "Nova obra" };

export default async function NewCasePage() {
  const user = await getCurrentUser();
  if (user.role !== "RESIDENT") redirect("/obras");

  return (
    <>
      <div>
        <p className="mb-1.5 text-xs text-muted-foreground">Minhas obras / Nova obra</p>
        <PageHeader
          title="Nova obra"
          subtitle="Conte o que vai ser feito. Ao salvar, calculamos se a obra exige ART/RRT e quais documentos enviar."
        />
      </div>
      <CaseForm action={createCase} cancelHref="/obras" submitLabel="Salvar rascunho" canSuggest={juliaConfig().enabled} />
    </>
  );
}
