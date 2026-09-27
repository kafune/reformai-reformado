import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CaseForm, type CaseFormValues } from "@/components/case/case-form";
import { PageBody, PageHeader } from "@/components/page-header";
import { updateCase } from "@/lib/actions/cases";
import { getCurrentUser } from "@/lib/auth";
import { juliaConfig } from "@/lib/decision";
import { can, getCaseForUser } from "@/lib/permissions";
import { isServiceKey } from "@/lib/rules/services";

export const metadata: Metadata = { title: "Editar obra" };

const toInputDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function EditCasePage({ params }: PageProps<"/obras/[id]/editar">) {
  const { id } = await params;
  const user = await getCurrentUser();
  const c = await getCaseForUser(user, id);
  if (!can(user, "edit", c)) redirect(`/obras/${id}`);

  const initial: CaseFormValues = {
    services: c.services.filter(isServiceKey),
    flags: { affectsCommonArea: c.affectsCommonArea, affectsFacade: c.affectsFacade, affectsStructure: c.affectsStructure },
    description: c.description,
    plannedStart: toInputDate(c.plannedStart),
    plannedEnd: toInputDate(c.plannedEnd),
    contractorName: c.contractorName ?? "",
  };

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Minhas obras", href: "/obras" }, { label: c.protocol, href: `/obras/${id}` }, "Editar"]}
        title={`Editar ${c.protocol}`}
        subtitle="Ao salvar, o risco e os documentos exigidos são recalculados."
      />
      <PageBody>
        <CaseForm action={updateCase.bind(null, id)} initial={initial} cancelHref={`/obras/${id}`} submitLabel="Salvar alterações" canSuggest={juliaConfig().enabled} />
      </PageBody>
    </>
  );
}
