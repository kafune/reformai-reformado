import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ArtSituationBadge } from "@/components/art-situation-badge";
import { FilterPill } from "@/components/filter-pill";
import { OriginTag } from "@/components/origin-tag";
import { Disclaimer, PageBody, PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { NativeSelect } from "@/components/ui/native-select";
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

  const filtered = rows.filter((r) => (!situationFilter || r.situation === situationFilter) && (!statusFilter || r.c.status === statusFilter));

  const href = (patch: Record<string, string | null>) => {
    const merged: Record<string, string | null> = { condominio: condominiumFilter, art: situationFilter, status: statusFilter, ...patch };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const qs = p.toString();
    return qs ? `/art?${qs}` : "/art";
  };

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
            <NativeSelect name="condominio" defaultValue={condominiumFilter ?? ""} className="w-64">
              <option value="">Todos os condomínios ({condominiums.length})</option>
              {condominiums.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </NativeSelect>
            <Button type="submit" variant="outline">
              <Icon name="filter" />
              Filtrar
            </Button>
          </form>
        )}
      </PageHeader>

      <PageBody>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Obras que exigem ART/RRT" value={kpis.total} hint="obras ativas" accent="green" />
          <StatCard label="ART faltando" value={kpis.missing} hint="morador ainda não enviou" accent={kpis.missing > 0 ? "ochre" : "green"} />
          <StatCard label="Aguardando conferência" value={kpis.sent} hint="enviada, falta conferir" accent="azulejo" />
          <StatCard label="Em execução sem ART aprovada" value={kpis.alarms} hint={kpis.alarms > 0 ? "não deveria acontecer" : "nenhum alarme"} alarm={kpis.alarms > 0} />
        </div>

        <Card className="gap-0 py-0">
          <div className="flex flex-wrap items-center gap-2.5 border-b border-divider px-4 py-3">
            <div className="flex flex-wrap gap-1.5">
              <FilterPill href={href({ art: null })} active={situationFilter === null}>
                Todas · {rows.length}
              </FilterPill>
              {SITUATIONS.map((s) => (
                <FilterPill key={s} href={href({ art: s })} active={situationFilter === s}>
                  {ART_SITUATION_LABEL[s]} · {countBySituation[s]}
                </FilterPill>
              ))}
            </div>
            <form className="ml-auto flex items-center gap-2">
              {condominiumFilter && <input type="hidden" name="condominio" value={condominiumFilter} />}
              {situationFilter && <input type="hidden" name="art" value={situationFilter} />}
              <NativeSelect name="status" size="sm" defaultValue={statusFilter ?? ""} className="w-52">
                <option value="">Qualquer status da obra</option>
                {CASE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </NativeSelect>
              <Button type="submit" size="sm" variant="outline">
                Aplicar
              </Button>
            </form>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
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
                  <TableCell colSpan={7} className="py-12 text-center text-ink-400">
                    Nenhuma obra com esses filtros.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map(({ c, situation, alarm, artByJulia, serviceLabels, artNote }) => {
                return (
                  <TableRow key={c.id} className={cn(alarm && "bg-iron-50 hover:bg-iron-100")} data-alarm={alarm || undefined}>
                    <TableCell>
                      <Link href={`/obras/${c.id}`} className="font-mono text-xs font-medium tracking-wide whitespace-nowrap text-ink-700 hover:underline">
                        {c.protocol}
                      </Link>
                      {alarm && (
                        <div className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-iron-700">
                          <Icon name="alert" size={12} />
                          sem ART aprovada
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="font-medium text-ink-900">{c.condominium.name}</div>
                      <div className="text-xs text-ink-500">{unitShort(c.unit)}</div>
                    </TableCell>
                    <TableCell className="min-w-44 max-w-64">
                      <span className="line-clamp-2">{serviceLabels}</span> {artByJulia && <OriginTag origin="julia" />}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {c.professionalName ? (
                        <>
                          <div className="text-ink-900">{c.professionalName}</div>
                          <div className="font-mono text-xs text-ink-500">{c.professionalReg}</div>
                        </>
                      ) : (
                        <span className="text-ink-300">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{c.artNumber ?? <span className="font-sans text-sm text-ink-300">—</span>}</TableCell>
                    <TableCell>
                      <ArtSituationBadge situation={situation} />
                      {artNote && <div className="mt-1 max-w-56 text-xs text-iron-700">{artNote}</div>}
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

        <Disclaimer>
          <strong className="text-ink-600">A plataforma não emite ART/RRT.</strong> A situação acima reflete o documento enviado pelo morador e a
          conferência do síndico ou da administradora.
        </Disclaimer>
      </PageBody>
    </>
  );
}
