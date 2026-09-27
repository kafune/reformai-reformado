import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ActionButton } from "@/components/action-button";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { setUserActive } from "@/lib/actions/admin";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { isAdmin, type Role } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Usuários" };

const ROLE_LABEL: Record<Role, string> = { ADMIN: "Administradora", SYNDIC: "Síndico", RESIDENT: "Morador" };
const ROLES: Role[] = ["ADMIN", "SYNDIC", "RESIDENT"];

export default async function UsersPage({ searchParams }: PageProps<"/admin/usuarios">) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) redirect("/obras");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const role = (ROLES as string[]).includes(String(sp.role)) ? (sp.role as Role) : null;

  const users = await db.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
    },
    include: { condominium: { select: { id: true, name: true } } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  const href = (r: Role | null) => `/admin/usuarios?${new URLSearchParams({ ...(q ? { q } : {}), ...(r ? { role: r } : {}) })}`;
  const pill = (on: boolean) =>
    cn("rounded-full border px-2.5 py-1 text-xs font-medium", on ? "border-foreground bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground");

  return (
    <>
      <PageHeader title="Usuários" subtitle="Equipe da administradora, síndicos e moradores. Desativar impede o login sem apagar o histórico." />
      <Card className="gap-0 py-0">
        <div className="flex flex-wrap items-center gap-2 border-b px-3.5 py-3">
          <form>
            {role && <input type="hidden" name="role" value={role} />}
            <Input name="q" defaultValue={q} placeholder="Buscar por nome ou e-mail" className="h-8 w-56 text-xs" />
          </form>
          <div className="flex gap-1.5">
            <Link href={href(null)} className={pill(role === null)}>
              Todos
            </Link>
            {ROLES.map((r) => (
              <Link key={r} href={href(r)} className={pill(role === r)}>
                {ROLE_LABEL[r]}
              </Link>
            ))}
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Condomínio</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium whitespace-nowrap">{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{ROLE_LABEL[u.role]}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {u.condominium ? (
                    <Link href={`/admin/condominios/${u.condominium.id}`} className="hover:underline">
                      {u.condominium.name}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                <TableCell>{u.active ? <Badge variant="ok">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}</TableCell>
                <TableCell className="text-right">
                  {u.id !== user.id && (
                    <ActionButton action={setUserActive.bind(null, u.id, !u.active)} variant={u.active ? "destructive" : "outline"}>
                      {u.active ? "Desativar" : "Ativar"}
                    </ActionButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
