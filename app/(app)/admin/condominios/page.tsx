import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CondominiumFormDialog } from "@/components/admin/condominium-form";
import { PageBody, PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createCondominium } from "@/lib/actions/admin";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/permissions";

export const metadata: Metadata = { title: "Condomínios" };

export default async function CondominiumsPage({ searchParams }: PageProps<"/admin/condominios">) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) redirect(user.condominiumId ? `/admin/condominios/${user.condominiumId}` : "/obras");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const condominiums = await db.condominium.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { city: { contains: q, mode: "insensitive" } }] } : {},
    orderBy: { name: "asc" },
    include: {
      users: { where: { role: "SYNDIC", active: true }, select: { name: true }, take: 1 },
      _count: { select: { units: true, cases: { where: { status: { in: ["DRAFT", "UNDER_REVIEW", "CHANGES_REQUESTED", "APPROVED", "IN_PROGRESS"] } } } } },
    },
  });
  const residents = await db.user.groupBy({ by: ["condominiumId"], where: { role: "RESIDENT", active: true }, _count: { _all: true } });
  const residentCount = Object.fromEntries(residents.map((r) => [r.condominiumId, r._count._all]));

  const totals = {
    units: condominiums.reduce((s, c) => s + c._count.units, 0),
    residents: condominiums.reduce((s, c) => s + (residentCount[c.id] ?? 0), 0),
    cases: condominiums.reduce((s, c) => s + c._count.cases, 0),
    withoutSyndic: condominiums.filter((c) => c.active && c.users.length === 0).length,
  };

  return (
    <>
      <PageHeader
        title="Condomínios"
        subtitle={`${condominiums.length} condomínio${condominiums.length === 1 ? "" : "s"} administrado${condominiums.length === 1 ? "" : "s"}`}
      >
        <CondominiumFormDialog
          action={createCondominium}
          title="Novo condomínio"
          trigger={
            <Button>
              <Icon name="plus" />
              Novo condomínio
            </Button>
          }
        />
      </PageHeader>
      <PageBody>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Unidades" value={totals.units} hint="cadastradas" accent="green" />
          <StatCard label="Moradores" value={totals.residents} hint="com conta ativa" accent="azulejo" />
          <StatCard label="Obras ativas" value={totals.cases} hint="em andamento" accent="ochre" />
          <StatCard label="Sem síndico" value={totals.withoutSyndic} hint={totals.withoutSyndic > 0 ? "precisam de síndico" : "todos com síndico"} alarm={totals.withoutSyndic > 0} accent="green" />
        </div>

        <Card className="gap-0 py-0">
          <form className="border-b border-divider px-4 py-3">
            <Input name="q" defaultValue={q} icon="search" placeholder="Buscar por nome ou cidade" className="h-9 w-72 text-xs max-md:min-h-9" />
          </form>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Condomínio</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Síndico</TableHead>
                <TableHead className="text-right">Unidades</TableHead>
                <TableHead className="text-right">Moradores</TableHead>
                <TableHead className="text-right">Obras ativas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {condominiums.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-ink-400">
                    Nenhum condomínio{q ? " com esse nome" : " ainda"}.
                  </TableCell>
                </TableRow>
              )}
              {condominiums.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/admin/condominios/${c.id}`} className="font-medium text-ink-900 hover:underline">
                      {c.name}
                    </Link>
                    <div className="text-xs text-ink-500">{c.address}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {c.city}/{c.state}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{c.users[0]?.name ?? <span className="text-ochre-700">sem síndico</span>}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{c._count.units}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{residentCount[c.id] ?? 0}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{c._count.cases}</TableCell>
                  <TableCell>
                    {c.active ? (
                      <Badge variant="green" dot>
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="neutral" dot>
                        Inativo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/condominios/${c.id}`}>
                        Abrir
                        <Icon name="chevR" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </PageBody>
    </>
  );
}
