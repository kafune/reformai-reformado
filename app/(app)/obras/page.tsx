import type { Metadata } from "next";
import Link from "next/link";

import { CaseCard } from "@/components/case-card";
import { FilterPill } from "@/components/filter-pill";
import { Disclaimer, PageBody, PageHeader } from "@/components/page-header";
import { RiskBadge } from "@/components/risk-badge";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth";
import { RELEASE_LABEL, readReleaseRecommendation } from "@/lib/decision";
import { db } from "@/lib/db";
import { formatRelative, unitLabel, unitShort } from "@/lib/format";
import { caseFilterForUser } from "@/lib/permissions";
import { ART_SITUATION_LABEL, artSituation, type DocForArt } from "@/lib/rules/art";
import { SERVICE_BY_KEY, isServiceKey } from "@/lib/rules/services";
import { CASE_STATUSES, STATUS_LABEL, blockerMessage, submissionBlockers, type CaseStatus } from "@/lib/rules/status";

export const metadata: Metadata = { title: "Obras" };

const PILL_STATUSES: CaseStatus[] = ["UNDER_REVIEW", "CHANGES_REQUESTED", "APPROVED", "IN_PROGRESS", "COMPLETED"];

function serviceLabels(services: string[]): string {
  return services.map((s) => (isServiceKey(s) ? SERVICE_BY_KEY[s].label : s)).join(", ");
}

function artColumn(c: { requiresArt: boolean; documents: DocForArt[] }): string {
  return c.requiresArt ? `Exige ART/RRT · ${ART_SITUATION_LABEL[artSituation(c.documents)].toLowerCase()}` : "Não exige ART/RRT";
}

function isStatus(value: string | undefined): value is CaseStatus {
  return !!value && (CASE_STATUSES as readonly string[]).includes(value);
}

export default async function CasesPage({ searchParams }: PageProps<"/obras">) {
  const user = await getCurrentUser();
  const sp = await searchParams;
  const status = isStatus(typeof sp.status === "string" ? sp.status : undefined) ? (sp.status as CaseStatus) : null;
  const onlyArt = sp.art === "1";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const isResident = user.role === "RESIDENT";

  const base = {
    ...caseFilterForUser(user),
    ...(onlyArt ? { requiresArt: true } : {}),
    ...(q
      ? {
          OR: [
            { protocol: { contains: q, mode: "insensitive" as const } },
            { unit: { number: { contains: q, mode: "insensitive" as const } } },
            { resident: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [cases, grouped] = await Promise.all([
    db.case.findMany({
      where: { ...base, ...(status ? { status } : {}) },
      include: {
        unit: true,
        resident: { select: { name: true } },
        condominium: { select: { name: true } },
        documents: { select: { type: true, status: true, createdAt: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.case.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
  ]);
  const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count._all])) as Partial<Record<CaseStatus, number>>;
  const total = grouped.reduce((sum, g) => sum + g._count._all, 0);
  const n = (s: CaseStatus) => counts[s] ?? 0;

  const unit = isResident ? await db.unit.findFirst({ where: { residentId: user.id } }) : null;
  const unitsCount = user.role === "SYNDIC" && user.condominiumId ? await db.unit.count({ where: { condominiumId: user.condominiumId } }) : null;

  // Morador: obras paradas na mão dele (rascunho/correção) e o que falta em cada uma.
  const attention = isResident
    ? cases
        .filter((c) => c.status === "DRAFT" || c.status === "CHANGES_REQUESTED")
        .map((c) => ({ c, blockers: submissionBlockers(c, c.documents).map(blockerMessage) }))
    : [];

  const href = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const merged = { status: status ?? null, art: onlyArt ? "1" : null, q: q || null, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const qs = p.toString();
    return qs ? `/obras?${qs}` : "/obras";
  };

  const subtitle = isResident
    ? `${unit ? unitLabel(unit) : ""} · ${user.condominium?.name ?? ""}`
    : user.role === "SYNDIC"
      ? `${user.condominium?.name ?? ""}${unitsCount !== null ? ` · ${unitsCount} unidades` : ""} · ${n("UNDER_REVIEW")} em análise`
      : `Todos os condomínios · ${total} obra${total === 1 ? "" : "s"} · ${n("UNDER_REVIEW")} em análise`;

  return (
    <>
      <PageHeader title={isResident ? "Minhas obras" : "Obras"} subtitle={subtitle}>
        {isResident ? (
          <Button asChild>
            <Link href="/obras/nova">
              <Icon name="plus" />
              Nova obra
            </Link>
          </Button>
        ) : (
          <Badge variant="neutral">
            {total} {total === 1 ? "obra" : "obras"}
          </Badge>
        )}
      </PageHeader>

      <PageBody>
        {attention.length > 0 && (
          <Alert variant="warn">
            <Icon name="alert" />
            <AlertTitle>
              {attention.length === 1 ? "1 obra precisa da sua atenção" : `${attention.length} obras precisam da sua atenção`}
            </AlertTitle>
            <AlertDescription className="text-ink-700">
              {attention.map(({ c, blockers }) => (
                <p key={c.id}>
                  <Link href={`/obras/${c.id}`} className="font-mono text-xs font-semibold hover:underline">
                    {c.protocol}
                  </Link>{" "}
                  — {c.status === "CHANGES_REQUESTED" ? "correção solicitada. " : ""}
                  {blockers.length > 0 ? blockers.join("; ") + "." : "Pronta para enviar para análise."}
                </p>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {isResident ? (
          cases.length === 0 ? (
            <div className="rounded-md border border-green-200 bg-green-50 p-6 shadow-hair">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <Icon name="home" size={18} className="text-green-700" />
                </div>
                <div>
                  <p className="text-base font-semibold text-ink-900">Bem-vindo ao ReformAI!</p>
                  <p className="text-sm text-ink-600">Registre, documente e acompanhe a liberação da sua reforma.</p>
                </div>
              </div>
              <ol className="mb-5 space-y-2">
                {[
                  "Cadastre a obra: conte o que vai ser feito",
                  "Veja se exige ART/RRT e quais documentos enviar",
                  "Anexe os documentos e envie para análise",
                  "Acompanhe a conferência e a liberação",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-green-200 font-mono text-[11px] font-semibold text-green-800">
                      {i + 1}
                    </span>
                    <span className="text-sm text-ink-700">{step}</span>
                  </li>
                ))}
              </ol>
              <Button asChild>
                <Link href="/obras/nova">
                  Cadastrar minha primeira obra
                  <Icon name="arrow" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {cases.map((c) => (
                <CaseCard
                  key={c.id}
                  href={`/obras/${c.id}`}
                  protocol={c.protocol}
                  title={serviceLabels(c.services) || "Obra"}
                  subtitle={unitLabel(c.unit)}
                  risk={c.riskLevel}
                  score={c.riskScore}
                  status={c.status}
                  updated={formatRelative(c.updatedAt)}
                  footer={
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="doc" size={12} className="text-ink-400" />
                      {artColumn(c)}
                    </span>
                  }
                />
              ))}
            </div>
          )
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Em análise" value={n("UNDER_REVIEW")} hint={n("UNDER_REVIEW") > 0 ? "aguardam sua decisão" : "nada pendente"} accent={n("UNDER_REVIEW") > 0 ? "ochre" : "green"} />
              <StatCard label="Correção solicitada" value={n("CHANGES_REQUESTED")} hint="com o morador" accent="ochre" />
              <StatCard label="Liberadas · em execução" value={n("APPROVED") + n("IN_PROGRESS")} hint="obras em curso" accent="azulejo" />
              <StatCard label="Concluídas" value={n("COMPLETED")} hint="confirmadas" accent="green" />
            </div>

            <Card className="gap-0 py-0">
              <div className="flex flex-wrap items-center gap-2.5 border-b border-divider px-4 py-3">
                <form className="flex gap-2">
                  {status && <input type="hidden" name="status" value={status} />}
                  {onlyArt && <input type="hidden" name="art" value="1" />}
                  <Input name="q" defaultValue={q} icon="search" placeholder="Buscar protocolo, unidade ou morador" className="h-9 w-64 text-xs max-md:min-h-9" />
                </form>
                <div className="flex flex-wrap gap-1.5">
                  <FilterPill href={href({ status: null })} active={status === null}>
                    Todas · {total}
                  </FilterPill>
                  {PILL_STATUSES.map((s) => (
                    <FilterPill key={s} href={href({ status: s })} active={status === s}>
                      {STATUS_LABEL[s]} · {n(s)}
                    </FilterPill>
                  ))}
                </div>
                <FilterPill href={href({ art: onlyArt ? null : "1" })} active={onlyArt}>
                  {onlyArt ? "✓ " : ""}Só as que exigem ART/RRT
                </FilterPill>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Protocolo</TableHead>
                    <TableHead>Unidade</TableHead>
                    {user.role === "ADMIN" && <TableHead>Condomínio</TableHead>}
                    <TableHead>Serviços</TableHead>
                    <TableHead>Risco</TableHead>
                    <TableHead>Docs</TableHead>
                    <TableHead>Julia-1 recomenda</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Atualizada</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="py-12 text-center text-ink-400">
                        Nenhuma obra por aqui{status || onlyArt || q ? " com esses filtros" : " ainda"}.
                      </TableCell>
                    </TableRow>
                  )}
                  {cases.map((c) => {
                    const approved = c.requiredDocs.filter((t) => c.documents.some((d) => d.type === t && d.status === "APPROVED")).length;
                    const rec = c.status === "UNDER_REVIEW" ? readReleaseRecommendation(c.releaseRecommendation) : null;
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Link href={`/obras/${c.id}`} className="font-mono text-xs font-medium tracking-wide whitespace-nowrap text-ink-700 hover:underline">
                            {c.protocol}
                          </Link>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="font-medium text-ink-900">{unitShort(c.unit)}</div>
                          <div className="text-xs text-ink-500">{c.resident.name}</div>
                        </TableCell>
                        {user.role === "ADMIN" && <TableCell className="whitespace-nowrap">{c.condominium.name}</TableCell>}
                        <TableCell className="min-w-48 max-w-72">
                          <span className="line-clamp-2">{serviceLabels(c.services)}</span>
                        </TableCell>
                        <TableCell>
                          <RiskBadge level={c.riskLevel} score={c.riskScore} size="sm" />
                        </TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {approved}/{c.requiredDocs.length}
                        </TableCell>
                        <TableCell>
                          {rec ? (
                            <Badge variant="julia" title={rec.justification}>
                              <Icon name="sparkle" />
                              {RELEASE_LABEL[rec.recommendation]}
                            </Badge>
                          ) : (
                            <span className="text-ink-300">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={c.status} />
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs whitespace-nowrap text-ink-400">{formatRelative(c.updatedAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant={c.status === "UNDER_REVIEW" ? "default" : "outline"}>
                            <Link href={`/obras/${c.id}`}>{c.status === "UNDER_REVIEW" ? "Analisar" : "Ver"}</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </>
        )}

        <Disclaimer>
          <strong className="text-ink-600">A plataforma não emite ART/RRT.</strong>{" "}
          {isResident
            ? "A emissão é responsabilidade do profissional habilitado (CREA/CAU) contratado por você."
            : "Liberar, recusar ou pedir correção é sempre decisão sua."}
        </Disclaimer>
      </PageBody>
    </>
  );
}
