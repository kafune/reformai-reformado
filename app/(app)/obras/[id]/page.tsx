import type { Metadata } from "next";
import Link from "next/link";

import { ArtRequirement } from "@/components/case/art-requirement";
import { CancelCaseButton } from "@/components/case/cancel-case-button";
import { CaseStepper } from "@/components/case/case-stepper";
import { CaseTimeline } from "@/components/case/case-timeline";
import { DocumentList } from "@/components/case/document-list";
import { ProfessionalForm } from "@/components/case/professional-form";
import { SubmitCard } from "@/components/case/submit-card";
import { RiskBadge } from "@/components/risk-badge";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, unitLabel } from "@/lib/format";
import { can, getCaseForUser } from "@/lib/permissions";
import { requiredDocuments, type DocumentType } from "@/lib/rules/checklist";
import { calculateRisk } from "@/lib/rules/risk";
import { FLAGS, SERVICE_BY_KEY, isServiceKey } from "@/lib/rules/services";
import { blockerMessage, submissionBlockers } from "@/lib/rules/status";

export async function generateMetadata({ params }: PageProps<"/obras/[id]">): Promise<Metadata> {
  const { id } = await params;
  const c = await db.case.findUnique({ where: { id }, select: { protocol: true } });
  return { title: c ? `Obra ${c.protocol}` : "Obra" };
}

export default async function CasePage({ params }: PageProps<"/obras/[id]">) {
  const { id } = await params;
  const user = await getCurrentUser();
  const c = await getCaseForUser(user, id);
  const [documents, events] = await Promise.all([
    db.document.findMany({ where: { caseId: id }, orderBy: { createdAt: "desc" } }),
    db.caseEvent.findMany({
      where: { caseId: id },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  const services = c.services.filter(isServiceKey);
  const serviceLabels = services.map((k) => SERVICE_BY_KEY[k].label);
  const affects = FLAGS.filter((f) => c[f.key]).map((f) => f.label.replace(/ \(.*\)$/, ""));

  // Origem de cada documento exigido: o que a tabela pede é "pela tabela"; o resto veio da Julia-1.
  const byRules = requiredDocuments(calculateRisk(services, c));
  const docOrigins = Object.fromEntries(
    c.requiredDocs.map((t) => [t, byRules.includes(t) ? "rules" : "julia"]),
  ) as Partial<Record<DocumentType, "rules" | "julia">>;

  const canEdit = can(user, "edit", c);
  const canUpload = can(user, "upload", c);
  const canSubmit = can(user, "submit", c);
  const canCancel = can(user, "cancel", c);
  const blockers = submissionBlockers(c, documents).map(blockerMessage);

  const period =
    c.plannedStart || c.plannedEnd ? `${formatDate(c.plannedStart)} a ${formatDate(c.plannedEnd)}` : "—";

  return (
    <>
      <div>
        <p className="mb-1.5 text-xs text-muted-foreground">
          <Link href="/obras" className="hover:underline">
            {user.role === "RESIDENT" ? "Minhas obras" : "Obras"}
          </Link>{" "}
          / {c.protocol}
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[22px] font-semibold tracking-tight">{c.protocol}</h1>
              <StatusBadge status={c.status} />
              <RiskBadge level={c.riskLevel} score={c.riskScore} />
            </div>
            <p className="mt-1 text-muted-foreground">
              {serviceLabels.join(" · ")} — {unitLabel(c.unit)}
              {user.role !== "RESIDENT" && ` · ${c.resident.name}`}
            </p>
          </div>
          {(canEdit || canCancel) && (
            <div className="flex flex-wrap gap-2.5">
              {canEdit && (
                <Button asChild variant="outline">
                  <Link href={`/obras/${c.id}/editar`}>Editar obra</Link>
                </Button>
              )}
              {canCancel && <CancelCaseButton caseId={c.id} protocol={c.protocol} />}
            </div>
          )}
        </div>
      </div>

      <CaseStepper status={c.status} />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-5">
          <ArtRequirement requiresArt={c.requiresArt} services={c.services} />

          <DocumentList
            caseId={c.id}
            requiredDocs={c.requiredDocs}
            docOrigins={docOrigins}
            documents={documents}
            canUpload={canUpload}
          />

          {c.requiresArt &&
            (canUpload ? (
              <ProfessionalForm caseId={c.id} initial={c} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Responsável técnico</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">Nome</dt>
                    <dd className="font-medium">{c.professionalName ?? "—"}</dd>
                    <dt className="text-muted-foreground">Profissão</dt>
                    <dd className="font-medium">
                      {c.professionalType === "ENGINEER" ? "Engenheiro(a) — CREA" : c.professionalType === "ARCHITECT" ? "Arquiteto(a) — CAU" : "—"}
                    </dd>
                    <dt className="text-muted-foreground">Registro</dt>
                    <dd className="font-medium">{c.professionalReg ?? "—"}</dd>
                    <dt className="text-muted-foreground">Nº ART/RRT</dt>
                    <dd className="font-medium">{c.artNumber ?? "—"}</dd>
                  </dl>
                </CardContent>
              </Card>
            ))}

          {canSubmit && <SubmitCard caseId={c.id} blockers={blockers} resubmit={c.status === "CHANGES_REQUESTED"} />}
        </div>

        <aside className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Condomínio</dt>
                <dd className="font-medium">{c.condominium.name}</dd>
                <dt className="text-muted-foreground">Unidade</dt>
                <dd className="font-medium">{unitLabel(c.unit)}</dd>
                <dt className="text-muted-foreground">Período</dt>
                <dd className="font-medium">{period}</dd>
                <dt className="text-muted-foreground">Executor</dt>
                <dd className="font-medium">{c.contractorName || "—"}</dd>
                <dt className="text-muted-foreground">Afeta</dt>
                <dd className="font-medium">{affects.length ? affects.join(", ") : "—"}</dd>
              </dl>
              <div className="my-3.5 h-px bg-border" />
              <p className="text-xs whitespace-pre-line">{c.description}</p>
            </CardContent>
          </Card>

          <CaseTimeline events={events} currentUserId={user.id} />

          <p className="border-l-[3px] pl-2.5 text-xs text-muted-foreground">
            A plataforma não emite ART/RRT. A responsabilidade técnica é do profissional habilitado emissor.
          </p>
        </aside>
      </div>
    </>
  );
}
