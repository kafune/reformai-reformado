import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { RiskBadge } from "@/components/risk-badge";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRelative, unitLabel, unitShort } from "@/lib/format";
import { caseFilterForUser } from "@/lib/permissions";
import { SERVICE_BY_KEY, isServiceKey } from "@/lib/rules/services";

export const metadata: Metadata = { title: "Obras" };

function serviceLabels(services: string[]): string {
  return services.map((s) => (isServiceKey(s) ? SERVICE_BY_KEY[s].label : s)).join(", ");
}

function artSituation(c: { requiresArt: boolean; documents: { type: string; status: string }[] }): string {
  if (!c.requiresArt) return "Não exige";
  const art = c.documents.filter((d) => d.type === "ART_RRT");
  if (art.some((d) => d.status === "APPROVED")) return "Exige · aprovada";
  if (art.some((d) => d.status === "PENDING")) return "Exige · enviada";
  if (art.some((d) => d.status === "REJECTED")) return "Exige · reprovada";
  return "Exige · pendente";
}

export default async function CasesPage() {
  const user = await getCurrentUser();
  const cases = await db.case.findMany({
    where: caseFilterForUser(user),
    include: {
      unit: true,
      resident: { select: { name: true } },
      condominium: { select: { name: true } },
      documents: { select: { type: true, status: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const isResident = user.role === "RESIDENT";
  const unit = isResident ? await db.unit.findFirst({ where: { residentId: user.id } }) : null;

  return (
    <>
      <PageHeader
        title={isResident ? "Minhas obras" : "Obras"}
        subtitle={
          isResident
            ? `${unit ? unitLabel(unit) : ""} — ${user.condominium?.name ?? ""}`
            : user.role === "SYNDIC"
              ? user.condominium?.name
              : "Todos os condomínios"
        }
      >
        {isResident && (
          <Button asChild>
            <Link href="/obras/nova">＋ Nova obra</Link>
          </Button>
        )}
      </PageHeader>

      <Card className="py-0">
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
              <TableHead>Atualizada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Nenhuma obra por aqui ainda.
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
                    {isResident ? artSituation(c) : `${approved}/${c.requiredDocs.length}`}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatRelative(c.updatedAt)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <p className="border-l-[3px] pl-2.5 text-xs text-muted-foreground">
        A plataforma não emite ART/RRT. A emissão é responsabilidade do profissional habilitado
        (CREA/CAU) contratado pelo morador.
      </p>
    </>
  );
}
