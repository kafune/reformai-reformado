import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ActionButton } from "@/components/action-button";
import { FilterPill } from "@/components/filter-pill";
import { PageBody, PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { setUserActive } from "@/lib/actions/admin";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { isAdmin, type Role } from "@/lib/permissions";


export const metadata: Metadata = { title: "Usuários" };

const ROLE_LABEL: Record<Role, string> = { ADMIN: "Administradora", SYNDIC: "Síndico", RESIDENT: "Morador" };
const ROLE_TONE: Record<Role, "green" | "azulejo" | "clay"> = { ADMIN: "green", SYNDIC: "azulejo", RESIDENT: "clay" };
const ROLE_COLOR: Record<Role, string> = { ADMIN: "var(--rai-green-600)", SYNDIC: "var(--rai-azulejo-600)", RESIDENT: "var(--rai-clay-500)" };
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

  return (
    <>
      <PageHeader
        title="Usuários"
        subtitle="Equipe da administradora, síndicos e moradores. Desativar impede o login sem apagar o histórico."
      >
        <Badge variant="neutral">
          {users.length} usuário{users.length === 1 ? "" : "s"}
        </Badge>
      </PageHeader>
      <PageBody>
        <Card className="gap-0 py-0">
          <div className="flex flex-wrap items-center gap-2.5 border-b border-divider px-4 py-3">
            <form>
              {role && <input type="hidden" name="role" value={role} />}
              <Input name="q" defaultValue={q} icon="search" placeholder="Buscar por nome ou e-mail" className="h-9 w-64 text-xs max-md:min-h-9" />
            </form>
            <div className="flex flex-wrap gap-1.5">
              <FilterPill href={href(null)} active={role === null}>
                Todos
              </FilterPill>
              {ROLES.map((r) => (
                <FilterPill key={r} href={href(r)} active={role === r}>
                  {ROLE_LABEL[r]}
                </FilterPill>
              ))}
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Nome</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Condomínio</TableHead>
                <TableHead>Desde</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-ink-400">
                    Nenhum usuário com esses filtros.
                  </TableCell>
                </TableRow>
              )}
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} size={32} color={ROLE_COLOR[u.role]} />
                      <div className="min-w-0">
                        <div className="font-medium whitespace-nowrap text-ink-900">{u.name}</div>
                        <div className="text-xs text-ink-500">{u.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {u.condominium ? (
                      <Link href={`/admin/condominios/${u.condominium.id}`} className="hover:underline">
                        {u.condominium.name}
                      </Link>
                    ) : (
                      <span className="text-ink-300">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs whitespace-nowrap text-ink-500">{formatDate(u.createdAt)}</TableCell>
                  <TableCell>
                    {u.active ? (
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
      </PageBody>
    </>
  );
}
