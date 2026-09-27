import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CaseForm } from "@/components/case/case-form";
import { PageBody, PageHeader } from "@/components/page-header";
import { createCase } from "@/lib/actions/cases";
import { getCurrentUser } from "@/lib/auth";
import { juliaConfig } from "@/lib/decision";

export const metadata: Metadata = { title: "Nova obra" };

export default async function NewCasePage() {
  const user = await getCurrentUser();
  if (user.role !== "RESIDENT") redirect("/obras");

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Minhas obras", href: "/obras" }, "Nova obra"]}
        title="Nova obra"
        subtitle="Conte o que vai ser feito. Ao salvar, calculamos se a obra exige ART/RRT e quais documentos enviar."
      />
      <PageBody>
        <CaseForm action={createCase} cancelHref="/obras" submitLabel="Salvar rascunho" canSuggest={juliaConfig().enabled} />
      </PageBody>
    </>
  );
}
