import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CondominiumFormDialog } from "@/components/admin/condominium-form";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  return (
    <>
      <PageHeader title="Condomínios" subtitle={`${condominiums.length} condomínio${condominiums.length === 1 ? "" : "s"} administrado${condominiums.length === 1 ? "" : "s"}`}>
        <CondominiumFormDialog action={createCondominium} title="Novo condomínio" trigger={<Button>＋ Novo condomínio</Button>} />
      </PageHeader>
      <Card className="gap-0 py-0">
        <form className="border-b px-3.5 py-3">
          <Input name="q" defaultValue={q} placeholder="Buscar por nome ou cidade" className="h-8 w-64 text-xs" />
        </form>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Condomínio</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Síndico</TableHead>
              <TableHead>Unidades</TableHead>
              <TableHead>Moradores</TableHead>
              <TableHead>Obras ativas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {condominiums.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Nenhum condomínio{q ? " com esse nome" : " ainda"}.
                </TableCell>
              </TableRow>
            )}
            {condominiums.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/admin/condominios/${c.id}`} className="font-semibold hover:underline">
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {c.city}/{c.state}
                </TableCell>
                <TableCell className="whitespace-nowrap">{c.users[0]?.name ?? <span className="text-muted-foreground">sem síndico</span>}</TableCell>
                <TableCell>{c._count.units}</TableCell>
                <TableCell>{residentCount[c.id] ?? 0}</TableCell>
                <TableCell>{c._count.cases}</TableCell>
                <TableCell>{c.active ? <Badge variant="ok">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}</TableCell>
                <TableCell>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/condominios/${c.id}`}>Abrir</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
