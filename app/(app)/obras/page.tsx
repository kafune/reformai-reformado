import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { RiskBadge } from "@/components/risk-badge";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRelative, unitLabel, unitShort } from "@/lib/format";
import { caseFilterForUser } from "@/lib/permissions";
import { ART_SITUATION_LABEL, artSituation, type DocForArt } from "@/lib/rules/art";
import { SERVICE_BY_KEY, isServiceKey } from "@/lib/rules/services";
import { CASE_STATUSES, STATUS_LABEL, blockerMessage, submissionBlockers, type CaseStatus } from "@/lib/rules/status";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Obras" };

const PILL_STATUSES: CaseStatus[] = ["UNDER_REVIEW", "CHANGES_REQUESTED", "APPROVED", "IN_PROGRESS", "COMPLETED"];

function serviceLabels(services: string[]): string {
  return services.map((s) => (isServiceKey(s) ? SERVICE_BY_KEY[s].label : s)).join(", ");
}

function artColumn(c: { requiresArt: boolean; documents: DocForArt[] }): string {
  return c.requiresArt ? `Exige · ${ART_SITUATION_LABEL[artSituation(c.documents)].toLowerCase()}` : "Não exige";
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

  const pillClass = (on: boolean) =>
    cn(
      "rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
      on ? "border-foreground bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground",
    );

  return (
    <>
      <PageHeader
        title={isResident ? "Minhas obras" : "Obras"}
        subtitle={
          isResident
            ? `${unit ? unitLabel(unit) : ""} — ${user.condominium?.name ?? ""}`
            : user.role === "SYNDIC"
              ? `${user.condominium?.name ?? ""}${unitsCount !== null ? ` · ${unitsCount} unidades` : ""}`
              : "Todos os condomínios"
        }
      >
        {isResident && (
          <Button asChild>
            <Link href="/obras/nova">＋ Nova obra</Link>
          </Button>
        )}
      </PageHeader>

      {attention.length > 0 && (
        <Alert variant="warn">
          <span aria-hidden>⚠</span>
          <AlertTitle>
            {attention.length === 1 ? "1 obra precisa da sua atenção" : `${attention.length} obras precisam da sua atenção`}
          </AlertTitle>
          <AlertDescription className="text-foreground">
            {attention.map(({ c, blockers }) => (
              <p key={c.id}>
                <Link href={`/obras/${c.id}`} className="font-semibold hover:underline">
                  {c.protocol}
                </Link>{" "}
                — {c.status === "CHANGES_REQUESTED" ? "correção solicitada. " : ""}
                {blockers.length > 0 ? blockers.join("; ") + "." : "Pronta para enviar para análise."}
              </p>
            ))}
          </AlertDescription>
        </Alert>
      )}

      <Card className="gap-0 py-0">
        {!isResident && (
          <div className="flex flex-wrap items-center gap-2 border-b px-3.5 py-3">
            <form className="flex gap-2">
              {status && <input type="hidden" name="status" value={status} />}
              {onlyArt && <input type="hidden" name="art" value="1" />}
              <Input name="q" defaultValue={q} placeholder="Buscar protocolo, unidade ou morador" className="h-8 w-56 text-xs" />
            </form>
            <div className="flex flex-wrap gap-1.5">
              <Link href={href({ status: null })} className={pillClass(status === null)}>
                Todas · {total}
              </Link>
              {PILL_STATUSES.map((s) => (
                <Link key={s} href={href({ status: s })} className={pillClass(status === s)}>
                  {STATUS_LABEL[s]} · {counts[s] ?? 0}
                </Link>
              ))}
            </div>
            <Link href={href({ art: onlyArt ? null : "1" })} className={cn(pillClass(onlyArt), "ml-auto")}>
              {onlyArt ? "✓ " : ""}Só as que exigem ART/RRT
            </Link>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Protocolo</TableHead>
              {!isResident && <TableHead>Unidade</TableHead>}
              {user.role === "ADMIN" && <TableHead>Condomínio</TableHead>}
              <TableHead>Serviços</TableHead>
              <TableHead>Risco</TableHead>
              {isResident ? <TableHead>ART/RRT</TableHead> : <TableHead>Docs</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead>{isResident ? "Atualizada" : "Enviada"}</TableHead>
              {!isResident && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  Nenhuma obra por aqui{status || onlyArt || q ? " com esses filtros" : " ainda"}.
                </TableCell>
              </TableRow>
            )}
            {cases.map((c) => {
              const approved = c.requiredDocs.filter((t) =>
                c.documents.some((d) => d.type === t && d.status === "APPROVED"),
              ).length;
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/obras/${c.id}`} className="font-semibold whitespace-nowrap hover:underline">
                      {c.protocol}
                    </Link>
                  </TableCell>
                  {!isResident && (
                    <TableCell className="whitespace-nowrap">
                      <div>{unitShort(c.unit)}</div>
                      <div className="text-xs text-muted-foreground">{c.resident.name}</div>
                    </TableCell>
                  )}
                  {user.role === "ADMIN" && <TableCell className="whitespace-nowrap">{c.condominium.name}</TableCell>}
                  <TableCell className="min-w-48">{serviceLabels(c.services)}</TableCell>
                  <TableCell>
                    <RiskBadge level={c.riskLevel} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {isResident ? artColumn(c) : `${approved}/${c.requiredDocs.length}`}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatRelative(c.updatedAt)}</TableCell>
                  {!isResident && (
                    <TableCell>
                      <Button asChild size="sm" variant={c.status === "UNDER_REVIEW" ? "default" : "outline"}>
                        <Link href={`/obras/${c.id}`}>{c.status === "UNDER_REVIEW" ? "Analisar" : "Ver"}</Link>
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <p className="border-l-[3px] pl-2.5 text-xs text-muted-foreground">
        {isResident
          ? "A plataforma não emite ART/RRT. A emissão é responsabilidade do profissional habilitado (CREA/CAU) contratado por você."
          : "Liberar, recusar ou pedir correção é sempre decisão sua. A plataforma não emite ART/RRT."}
      </p>
    </>
  );
}
