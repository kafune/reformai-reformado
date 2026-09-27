import type { Metadata } from "next";
import Link from "next/link";

import { PrintButton } from "@/components/print-button";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, unitLabel } from "@/lib/format";
import { getCaseForUser } from "@/lib/permissions";
import { RISK_LABEL } from "@/lib/rules/risk";
import { SERVICE_BY_KEY, isServiceKey } from "@/lib/rules/services";
import { STATUS_LABEL } from "@/lib/rules/status";

export const metadata: Metadata = { title: "Termo de liberação" };

const ROLE_LABEL: Record<string, string> = { SYNDIC: "Síndico", ADMIN: "Administradora", RESIDENT: "Morador" };

export default async function PrintTermPage({ params }: PageProps<"/obras/[id]/imprimir">) {
  const { id } = await params;
  const user = await getCurrentUser();
  const c = await getCaseForUser(user, id);

  const released = c.status === "APPROVED" || c.status === "IN_PROGRESS" || c.status === "COMPLETED";
  const [approval, artConfirmation] = await Promise.all([
    db.caseEvent.findFirst({
      where: { caseId: id, type: "status_changed", toStatus: "APPROVED" },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, role: true } } },
    }),
    db.caseEvent.findFirst({
      where: { caseId: id, type: "art_confirmed" },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, role: true } } },
    }),
  ]);

  const services = c.services.filter(isServiceKey).map((k) => SERVICE_BY_KEY[k].label);
  const professionalType = c.professionalType === "ARCHITECT" ? "Arq." : c.professionalType === "ENGINEER" ? "Eng." : "";
  const period =
    c.plannedStart || c.plannedEnd ? `${formatDate(c.plannedStart)} a ${formatDate(c.plannedEnd)}` : "—";
  const approver = approval?.user ? `${approval.user.name} (${ROLE_LABEL[approval.user.role] ?? approval.user.role})` : null;
  const confirmer = artConfirmation?.user ? `${artConfirmation.user.name} (${(ROLE_LABEL[artConfirmation.user.role] ?? "").toLowerCase()})` : null;

  return (
    <>
      <div className="mx-auto flex max-w-[210mm] justify-between gap-2 px-3 pt-4 print:hidden">
        <Button asChild variant="outline">
          <Link href={`/obras/${c.id}`}>Voltar</Link>
        </Button>
        <PrintButton />
      </div>

      <article className="print-sheet relative mx-3 my-3 bg-white p-5 text-[13px] shadow-md md:mx-auto md:my-6 md:min-h-[297mm] md:w-[210mm] md:p-[22mm_20mm] print:m-0 print:min-h-0 print:w-auto print:shadow-none">
        {!released && (
          <div className="mb-4 rounded-lg border border-warn/40 bg-warn-soft px-3 py-2 text-xs font-semibold text-warn">
            PRÉVIA — a obra ainda não foi liberada (status: {STATUS_LABEL[c.status]}). Este termo só vale depois da liberação.
          </div>
        )}

        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 text-[15px] font-bold">
            <span className="grid size-7 place-items-center rounded-lg bg-primary text-sm text-primary-foreground">R</span>
            ReformAI
          </div>
          <div className="text-right text-xs text-muted-foreground">
            Protocolo <strong className="font-mono text-foreground">{c.protocol}</strong>
            <br />
            Emitido em {formatDateTime(new Date())}
          </div>
        </header>

        <h1 className="mt-5 text-xl font-semibold tracking-tight">Termo de liberação de obra</h1>
        <p className="text-muted-foreground">
          {c.condominium.name} — {c.condominium.address} — {c.condominium.city}/{c.condominium.state}
        </p>

        <Section title="Unidade e responsável">
          <Row label="Unidade">{unitLabel(c.unit)}</Row>
          <Row label="Morador">{c.resident.name}</Row>
          <Row label="Executor">{c.contractorName || "—"}</Row>
          <Row label="Período previsto">{period}</Row>
        </Section>

        <Section title="Serviços liberados">
          <Row label="Serviços">{services.join("; ")}</Row>
          <Row label="Classificação">
            Risco {RISK_LABEL[c.riskLevel].toUpperCase()} ({c.riskScore}/100) — {c.requiresArt ? "exige ART/RRT" : "não exige ART/RRT"}
          </Row>
          {(c.affectsCommonArea || c.affectsFacade || c.affectsStructure) && (
            <Row label="Afeta">
              {[c.affectsCommonArea && "área comum", c.affectsFacade && "fachada", c.affectsStructure && "estrutura"].filter(Boolean).join(", ")}
            </Row>
          )}
        </Section>

        {c.requiresArt && (
          <Section title="Responsabilidade técnica">
            <Row label="Profissional">
              {c.professionalName ? `${professionalType} ${c.professionalName}`.trim() : "—"}
              {c.professionalReg && ` — ${c.professionalReg}`}
            </Row>
            <Row label={c.professionalType === "ARCHITECT" ? "RRT nº" : "ART nº"}>
              <span className="font-mono">{c.artNumber ?? "—"}</span>
            </Row>
            <Row label="Conferência">
              {artConfirmation && confirmer
                ? `ART/RRT conferida por ${confirmer} em ${formatDate(artConfirmation.createdAt)}`
                : "ART/RRT ainda não conferida"}
            </Row>
          </Section>
        )}

        <Section title="Liberação">
          <Row label="Liberada por">{approver ? `${approver} em ${formatDateTime(approval!.createdAt)}` : "—"}</Row>
          <Row label="Condições">
            {c.approvalConditions ? <span className="whitespace-pre-line">{c.approvalConditions}</span> : "Sem condições específicas."}
          </Row>
          {c.startedAt && <Row label="Início informado">{formatDate(c.startedAt)}</Row>}
          {c.status === "COMPLETED" && <Row label="Conclusão">{formatDate(c.completedAt)}</Row>}
        </Section>

        <div className="mt-12 grid grid-cols-2 gap-10">
          <div className="border-t border-foreground pt-1.5 text-center text-xs">
            {approval?.user?.name ?? " "}
            <br />
            {approval?.user ? (ROLE_LABEL[approval.user.role] ?? "") : "Síndico / Administradora"}
          </div>
          <div className="border-t border-foreground pt-1.5 text-center text-xs">
            {c.resident.name}
            <br />
            Morador
          </div>
        </div>

        <p className="mt-10 border-l-[3px] pl-2.5 text-xs text-muted-foreground">
          Este termo registra a liberação administrativa da obra pelo condomínio. A plataforma ReformAI{" "}
          <strong>não emite ART/RRT</strong> nem assume responsabilidade técnica pela obra: a responsabilidade técnica é
          exclusiva do profissional habilitado indicado acima.
        </p>
      </article>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">{title}</h2>
      <table className="w-full border-collapse">
        <tbody>{children}</tbody>
      </table>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <th className="w-[34%] border bg-[#fafaf9] px-2 py-1.5 text-left font-medium">{label}</th>
      <td className="border px-2 py-1.5">{children}</td>
    </tr>
  );
}
