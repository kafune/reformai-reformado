import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ArtSituationBadge } from "@/components/art-situation-badge";
import { OriginTag } from "@/components/origin-tag";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { unitShort } from "@/lib/format";
import { caseFilterForUser } from "@/lib/permissions";
import { ART_SITUATION_LABEL, artSituation, isArtAlarm, type ArtSituation } from "@/lib/rules/art";
import { calculateRisk } from "@/lib/rules/risk";
import { SERVICE_BY_KEY, isServiceKey } from "@/lib/rules/services";
import { CASE_STATUSES, STATUS_LABEL, type CaseStatus } from "@/lib/rules/status";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Painel ART/RRT" };

const SITUATIONS: ArtSituation[] = ["MISSING", "SENT", "APPROVED", "REJECTED"];
const ACTIVE_STATUSES: CaseStatus[] = ["DRAFT", "UNDER_REVIEW", "CHANGES_REQUESTED", "APPROVED", "IN_PROGRESS"];

const selectClass =
  "h-8 rounded-lg border border-input bg-background px-2.5 text-xs shadow-xs outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30";

export default async function ArtPanelPage({ searchParams }: PageProps<"/art">) {
  const user = await getCurrentUser();
  if (user.role === "RESIDENT") redirect("/obras"); // painel é do síndico/administradora
  const sp = await searchParams;
  const pick = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : "");
  const situationFilter = (SITUATIONS as string[]).includes(pick("art")) ? (pick("art") as ArtSituation) : null;
  const statusFilter = (CASE_STATUSES as readonly string[]).includes(pick("status")) ? (pick("status") as CaseStatus) : null;
  const condominiumFilter = user.role === "ADMIN" ? pick("condominio") || null : null;

  const [condominiums, allCases] = await Promise.all([
    user.role === "ADMIN" ? db.condominium.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }) : [],
    db.case.findMany({
      where: {
        ...caseFilterForUser(user),
        requiresArt: true,
        ...(condominiumFilter ? { condominiumId: condominiumFilter } : {}),
      },
      include: {
        unit: true,
        condominium: { select: { name: true } },
        documents: { select: { type: true, status: true, createdAt: true, reviewNote: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const rows = allCases.map((c) => {
    const situation = artSituation(c.documents);
    const services = c.services.filter(isServiceKey);
    return {
      c,
      situation,
      alarm: isArtAlarm(c, situation),
      // ART exigida pela Julia-1 e não pela tabela → mostra a origem
      artByJulia: !calculateRisk(services, c).requiresArt,
      serviceLabels: services.map((k) => SERVICE_BY_KEY[k].label).join(", "),
      // Motivo da reprovação (nota do síndico/admin), quando a última ART foi reprovada.
      artNote:
        situation === "REJECTED"
          ? ([...c.documents].filter((d) => d.type === "ART_RRT").sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]?.reviewNote ?? null)
          : null,
    };
  });

  // Alarme sempre no topo.
  rows.sort((a, b) => Number(b.alarm) - Number(a.alarm));

  const active = rows.filter((r) => ACTIVE_STATUSES.includes(r.c.status));
  const kpis = {
    total: active.length,
    missing: active.filter((r) => r.situation === "MISSING").length,
    sent: active.filter((r) => r.situation === "SENT").length,
    ok: active.filter((r) => r.situation === "APPROVED").length,
    alarms: rows.filter((r) => r.alarm).length,
  };
  const countBySituation = Object.fromEntries(SITUATIONS.map((s) => [s, rows.filter((r) => r.situation === s).length])) as Record<ArtSituation, number>;

  const filtered = rows.filter(
    (r) => (!situationFilter || r.situation === situationFilter) && (!statusFilter || r.c.status === statusFilter),
  );

  const href = (patch: Record<string, string | null>) => {
    const merged: Record<string, string | null> = { condominio: condominiumFilter, art: situationFilter, status: statusFilter, ...patch };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const qs = p.toString();
    return qs ? `/art?${qs}` : "/art";
  };
  const pillClass = (on: boolean) =>
    cn(
      "rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
      on ? "border-foreground bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground",
    );

  const scopeLabel =
    user.role === "ADMIN"
      ? condominiumFilter
        ? (condominiums.find((k) => k.id === condominiumFilter)?.name ?? "")
        : "todos os condomínios"
      : (user.condominium?.name ?? "");

  return (
    <>
      <PageHeader title="Painel ART/RRT" subtitle={`Quais obras precisam de ART/RRT e em que pé estão — ${scopeLabel}.`}>
        {user.role === "ADMIN" && (
          <form className="flex items-center gap-2">
            {situationFilter && <input type="hidden" name="art" value={situationFilter} />}
            {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
            <select name="condominio" defaultValue={condominiumFilter ?? ""} className={cn(selectClass, "h-9")}>
              <option value="">Todos os condomínios ({condominiums.length})</option>
              {condominiums.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
            <button type="submit" className="h-9 rounded-lg border bg-background px-3 text-xs font-medium hover:bg-muted">
              Filtrar
            </button>
          </form>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <Kpi label="Obras que exigem ART/RRT" value={kpis.total} hint="obras ativas" />
        <Kpi label="ART faltando" value={kpis.missing} hint="morador ainda não enviou" />
        <Kpi label="Aguardando conferência" value={kpis.sent} hint="enviada, falta conferir" />
        <Kpi label="⚠ Em execução sem ART aprovada" value={kpis.alarms} hint="não deveria acontecer" alarm />
      </div>

      <Card className="gap-0 py-0">
        <div className="flex flex-wrap items-center gap-2 border-b px-3.5 py-3">
          <div className="flex flex-wrap gap-1.5">
            <Link href={href({ art: null })} className={pillClass(situationFilter === null)}>
              Todas · {rows.length}
            </Link>
            {SITUATIONS.map((s) => (
              <Link key={s} href={href({ art: s })} className={pillClass(situationFilter === s)}>
                {ART_SITUATION_LABEL[s]} · {countBySituation[s]}
              </Link>
            ))}
          </div>
          <form className="ml-auto flex items-center gap-2">
            {condominiumFilter && <input type="hidden" name="condominio" value={condominiumFilter} />}
            {situationFilter && <input type="hidden" name="art" value={situationFilter} />}
            <select name="status" defaultValue={statusFilter ?? ""} className={selectClass}>
              <option value="">Qualquer status da obra</option>
              {CASE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <button type="submit" className="h-8 rounded-lg border bg-background px-2.5 text-xs font-medium hover:bg-muted">
              Aplicar
            </button>
          </form>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Obra</TableHead>
              <TableHead>Condomínio · unidade</TableHead>
              <TableHead>Serviços</TableHead>
              <TableHead>Profissional</TableHead>
              <TableHead>Nº ART/RRT</TableHead>
              <TableHead>Situação da ART</TableHead>
              <TableHead>Status da obra</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Nenhuma obra com esses filtros.
                </TableCell>
              </TableRow>
            )}
            {filtered.map(({ c, situation, alarm, artByJulia, serviceLabels, artNote }) => {
              return (
                <TableRow key={c.id} className={cn(alarm && "bg-[#fef2f2] hover:bg-[#fee2e2]")} data-alarm={alarm || undefined}>
                  <TableCell>
                    <Link href={`/obras/${c.id}`} className="font-semibold whitespace-nowrap hover:underline">
                      {c.protocol}
                    </Link>
                    {alarm && <div className="text-xs font-semibold text-danger">sem ART aprovada</div>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div>{c.condominium.name}</div>
                    <div className="text-xs text-muted-foreground">{unitShort(c.unit)}</div>
                  </TableCell>
                  <TableCell className="min-w-44">
                    {serviceLabels} {artByJulia && <OriginTag origin="julia" />}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {c.professionalName ? (
                      <>
                        <div>{c.professionalName}</div>
                        <div className="text-xs text-muted-foreground">{c.professionalReg}</div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{c.artNumber ?? <span className="font-sans text-sm text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    <ArtSituationBadge situation={situation} />
                    {artNote && <div className="max-w-56 text-xs text-danger">{artNote}</div>}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <p className="border-l-[3px] pl-2.5 text-xs text-muted-foreground">
        A plataforma não emite ART/RRT. A situação acima reflete o documento enviado pelo morador e a conferência do
        síndico ou da administradora.
      </p>
    </>
  );
}

function Kpi({ label, value, hint, alarm = false }: { label: string; value: number; hint: string; alarm?: boolean }) {
  return (
    <Card className={cn("gap-0 px-4 py-4", alarm && "border-[#fecaca] bg-[#fef2f2]")}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-[26px] font-bold tracking-tight", alarm && "text-danger")}>{value}</div>
      <div className="text-xs text-muted-foreground">{hint}</div>
    </Card>
  );
}
