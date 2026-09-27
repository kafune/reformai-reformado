import type { Metadata } from "next";
import Link from "next/link";

import { ArtRequirement } from "@/components/case/art-requirement";
import { CancelCaseButton } from "@/components/case/cancel-case-button";
import { CaseStepper } from "@/components/case/case-stepper";
import { CaseNotices } from "@/components/case/case-notices";
import { CaseTimeline } from "@/components/case/case-timeline";
import { DecisionCard } from "@/components/case/decision-card";
import { JuliaClassification } from "@/components/case/julia-classification";
import { ConfirmCompletionCard, ReportDateCard } from "@/components/case/execution-cards";
import { DocumentList } from "@/components/case/document-list";
import { ProfessionalForm } from "@/components/case/professional-form";
import { SubmitCard } from "@/components/case/submit-card";
import { Disclaimer, PageBody, PageHeader } from "@/components/page-header";
import { RiskBadge } from "@/components/risk-badge";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Icon } from "@/components/ui/icon";
import { getCurrentUser } from "@/lib/auth";
import { readJuliaClassification, readReleaseRecommendation } from "@/lib/decision";
import { db } from "@/lib/db";
import { formatDate, unitLabel } from "@/lib/format";
import { can, getCaseForUser } from "@/lib/permissions";
import { requiredDocuments, type DocumentType } from "@/lib/rules/checklist";
import { calculateRisk } from "@/lib/rules/risk";
import { FLAGS, SERVICE_BY_KEY, isServiceKey } from "@/lib/rules/services";
import { approvalBlockers, blockerMessage, submissionBlockers } from "@/lib/rules/status";

export async function generateMetadata({ params }: PageProps<"/obras/[id]">): Promise<Metadata> {
  const { id } = await params;
  const c = await db.case.findUnique({ where: { id }, select: { protocol: true } });
  return { title: c ? `Obra ${c.protocol}` : "Obra" };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[10px] font-medium tracking-caps text-ink-400 uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink-800">{children}</dd>
    </div>
  );
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
  const docOrigins = Object.fromEntries(c.requiredDocs.map((t) => [t, byRules.includes(t) ? "rules" : "julia"])) as Partial<
    Record<DocumentType, "rules" | "julia">
  >;

  const isResident = user.role === "RESIDENT";
  const canEdit = can(user, "edit", c);
  const canUpload = can(user, "upload", c);
  const canSubmit = can(user, "submit", c);
  const canCancel = can(user, "cancel", c);
  const canReview = can(user, "review", c);
  const released = c.status === "APPROVED" || c.status === "IN_PROGRESS" || c.status === "COMPLETED";
  const canStart = can(user, "start", c);
  const canReportCompletion = can(user, "report_completion", c);
  const canConfirmCompletion = can(user, "confirm_completion", c);
  const blockers = submissionBlockers(c, documents).map(blockerMessage);
  // Bloqueios de liberação sem a conferência da ART (ela é o checkbox do lado do cliente).
  const approvalBlocks = approvalBlockers(c, documents, true).map(blockerMessage);
  const julia = readJuliaClassification(c.juliaDecision);
  const recommendation = c.status === "UNDER_REVIEW" ? readReleaseRecommendation(c.releaseRecommendation) : null;
  const lastTo = (status: "CHANGES_REQUESTED" | "REJECTED") =>
    events.find((e) => e.type === "status_changed" && e.toStatus === status)?.message ?? null;

  const period = c.plannedStart || c.plannedEnd ? `${formatDate(c.plannedStart)} a ${formatDate(c.plannedEnd)}` : "—";

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: isResident ? "Minhas obras" : "Obras", href: "/obras" }, c.protocol]}
        title={c.protocol}
        badges={
          <>
            <StatusBadge status={c.status} />
            <RiskBadge level={c.riskLevel} score={c.riskScore} size="sm" />
          </>
        }
        subtitle={
          <>
            {serviceLabels.join(" · ")} — {unitLabel(c.unit)}
            {!isResident && ` · ${c.resident.name}`}
          </>
        }
      >
        {(released || canReview) && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/obras/${c.id}/imprimir`}>
              <Icon name="print" />
              {released ? "Termo de liberação" : "Pré-visualizar termo"}
            </Link>
          </Button>
        )}
        {canEdit && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/obras/${c.id}/editar`}>
              <Icon name="edit" />
              Editar obra
            </Link>
          </Button>
        )}
        {canCancel && <CancelCaseButton caseId={c.id} protocol={c.protocol} />}
      </PageHeader>

      <PageBody>
        <CaseStepper status={c.status} />

        <CaseNotices
          status={c.status}
          changesMessage={lastTo("CHANGES_REQUESTED")}
          rejectionReason={lastTo("REJECTED")}
          approvalConditions={c.approvalConditions}
          startedAt={c.startedAt}
          completedAt={c.completedAt}
          isResident={isResident}
        />

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex flex-col gap-5">
            {canStart && <ReportDateCard caseId={c.id} kind="start" />}
            {canReportCompletion && !c.completedAt && <ReportDateCard caseId={c.id} kind="completion" />}
            {canConfirmCompletion && <ConfirmCompletionCard caseId={c.id} reportedAt={c.completedAt ? formatDate(c.completedAt) : null} />}

            {canReview && <DecisionCard caseId={c.id} blockers={approvalBlocks} requiresArt={c.requiresArt} recommendation={recommendation} />}

            <ArtRequirement
              requiresArt={c.requiresArt}
              services={c.services}
              artByJulia={julia?.addedByJulia.requiresArt ?? false}
              juliaReason={julia?.justification}
            />

            {julia && <JuliaClassification stored={julia} level={c.riskLevel} />}

            <DocumentList
              caseId={c.id}
              requiredDocs={c.requiredDocs}
              docOrigins={docOrigins}
              documents={documents}
              canUpload={canUpload}
              canReview={canReview}
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
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                      <Field label="Nome">{c.professionalName ?? "—"}</Field>
                      <Field label="Profissão">
                        {c.professionalType === "ENGINEER" ? "Engenheiro(a) — CREA" : c.professionalType === "ARCHITECT" ? "Arquiteto(a) — CAU" : "—"}
                      </Field>
                      <Field label="Registro">
                        <span className="font-mono">{c.professionalReg ?? "—"}</span>
                      </Field>
                      <Field label="Nº ART/RRT">
                        <span className="font-mono">{c.artNumber ?? "—"}</span>
                      </Field>
                    </dl>
                  </CardContent>
                </Card>
              ))}

            {canSubmit && <SubmitCard caseId={c.id} blockers={blockers} resubmit={c.status === "CHANGES_REQUESTED"} />}
          </div>

          <aside className="flex flex-col gap-4">
            <div className="rounded-md bg-surface p-5 shadow-hair">
              <Eyebrow>Obra</Eyebrow>
              <p className="mt-1.5 font-mono text-sm text-ink-500">{c.protocol}</p>

              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <Eyebrow className="mb-1.5">Status</Eyebrow>
                  <StatusBadge status={c.status} />
                </div>
                <div className="text-right">
                  <Eyebrow className="mb-1.5">Risco</Eyebrow>
                  <RiskBadge level={c.riskLevel} score={c.riskScore} size="sm" />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-divider pt-4">
                <Icon name="doc" size={14} className="text-ink-400" />
                <span className="text-xs text-ink-600">
                  ART/RRT: <strong>{c.requiresArt ? "Exigida" : "Não exigida"}</strong>
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-divider pt-4">
                <Field label="Condomínio">{c.condominium.name}</Field>
                <Field label="Unidade">{unitLabel(c.unit)}</Field>
                <Field label="Período">{period}</Field>
                <Field label="Executor">{c.contractorName || "—"}</Field>
                <Field label="Afeta">{affects.length ? affects.join(", ") : "—"}</Field>
                <Field label="Classificada por">
                  <span className="font-mono text-xs">{c.classifiedBy === "rules+julia" ? "tabela + Julia-1" : "tabela"}</span>
                </Field>
              </dl>

              <div className="mt-4 border-t border-divider pt-4">
                <Eyebrow className="mb-1.5">Serviços</Eyebrow>
                <div className="flex flex-wrap gap-1.5">
                  {serviceLabels.map((s) => (
                    <span key={s} className="rounded-full bg-bone-100 px-2.5 py-0.5 text-[11px] font-medium text-ink-700">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 border-t border-divider pt-4">
                <Eyebrow className="mb-1.5">Descrição</Eyebrow>
                <p className="text-xs leading-relaxed whitespace-pre-line text-ink-600">{c.description}</p>
              </div>
            </div>

            <CaseTimeline events={events} currentUserId={user.id} />

            <Disclaimer>
              <strong className="text-ink-600">A plataforma não emite ART/RRT.</strong> A responsabilidade técnica é do profissional habilitado emissor.
            </Disclaimer>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
