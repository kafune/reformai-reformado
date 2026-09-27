import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionButton } from "@/components/action-button";
import { CondominiumFormDialog } from "@/components/admin/condominium-form";
import { CopyButton } from "@/components/admin/copy-button";
import { SyndicFormDialog } from "@/components/admin/syndic-form";
import { ImportUnitsForm, UnitForm } from "@/components/admin/unit-forms";
import { PageBody, PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteUnit, regenerateSignupCode, setCondominiumActive, setUserActive, updateCondominium } from "@/lib/actions/admin";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { unitShort } from "@/lib/format";
import { canViewCondominium, isAdmin } from "@/lib/permissions";
import { signupLink } from "@/lib/signup-link";

export async function generateMetadata({ params }: PageProps<"/admin/condominios/[id]">): Promise<Metadata> {
  const { id } = await params;
  const c = await db.condominium.findUnique({ where: { id }, select: { name: true } });
  return { title: c?.name ?? "Condomínio" };
}

export default async function CondominiumPage({ params, searchParams }: PageProps<"/admin/condominios/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toUpperCase() : "";
  const user = await getCurrentUser();
  if (!canViewCondominium(user, id)) notFound();
  const admin = isAdmin(user);

  const c = await db.condominium.findUnique({
    where: { id },
    include: {
      units: {
        include: { resident: { select: { id: true, name: true, active: true } }, _count: { select: { cases: true } } },
        orderBy: [{ block: "asc" }, { number: "asc" }],
      },
      users: { where: { role: { in: ["SYNDIC", "RESIDENT"] } }, orderBy: [{ role: "asc" }, { name: "asc" }] },
    },
  });
  if (!c) notFound();

  const { url, qrSvg } = await signupLink(c.signupCode);
  const units = q ? c.units.filter((u) => `${u.block} ${u.number}`.toUpperCase().includes(q)) : c.units;
  const withResident = c.units.filter((u) => u.residentId).length;
  const syndics = c.users.filter((u) => u.role === "SYNDIC");
  const residents = c.users.filter((u) => u.role === "RESIDENT");
  const unitOf = (userId: string) => c.units.find((u) => u.residentId === userId);

  return (
    <>
      <PageHeader
        breadcrumb={admin ? [{ label: "Condomínios", href: "/admin/condominios" }, c.name] : ["Cadastro de moradores"]}
        title={c.name}
        badges={
          !c.active ? (
            <Badge variant="neutral" dot>
              Inativo
            </Badge>
          ) : undefined
        }
        subtitle={`${c.address} — ${c.city}/${c.state} · ${c.units.length} unidade${c.units.length === 1 ? "" : "s"} · ${residents.length} morador${residents.length === 1 ? "" : "es"}`}
      >
        {admin && (
          <>
            <CondominiumFormDialog
              action={updateCondominium.bind(null, c.id)}
              initial={{ name: c.name, address: c.address, city: c.city, state: c.state, signupCode: c.signupCode }}
              title="Editar condomínio"
              trigger={
                <Button variant="outline" size="sm">
                  <Icon name="edit" />
                  Editar dados
                </Button>
              }
            />
            <ActionButton
              action={setCondominiumActive.bind(null, c.id, !c.active)}
              variant={c.active ? "destructive" : "default"}
              confirm={c.active ? "Desativar o condomínio? O link de cadastro para de funcionar." : undefined}
            >
              {c.active ? "Desativar" : "Ativar"}
            </ActionButton>
          </>
        )}
      </PageHeader>

      <PageBody>
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex flex-col gap-5">
            <Card className="gap-0 py-0">
              <CardHeader className="flex-row items-center justify-between py-4">
                <div>
                  <CardTitle>Unidades</CardTitle>
                  <CardDescription className="mt-1 font-mono text-[10px] tracking-caps uppercase">
                    {c.units.length} unidade{c.units.length === 1 ? "" : "s"} · {withResident} com morador
                  </CardDescription>
                </div>
              </CardHeader>
              <div className="flex flex-wrap items-center gap-2 border-y border-divider px-4 py-3">
                <form>
                  <Input name="q" defaultValue={q} icon="search" placeholder="Bloco ou número" className="h-9 w-48 text-xs max-md:min-h-9" />
                </form>
                {admin && (
                  <div className="ml-auto">
                    <UnitForm condominiumId={c.id} />
                  </div>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Bloco</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Morador</TableHead>
                    <TableHead className="text-right">Obras</TableHead>
                    {admin && <TableHead />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-ink-400">
                        Nenhuma unidade{q ? " com esse filtro" : ". Adicione ou importe abaixo"}.
                      </TableCell>
                    </TableRow>
                  )}
                  {units.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono text-xs">{u.block || <span className="text-ink-300">—</span>}</TableCell>
                      <TableCell className="font-medium text-ink-900">{u.number}</TableCell>
                      <TableCell>
                        {u.resident ? (
                          <span className="inline-flex items-center gap-2">
                            {u.resident.name}
                            {!u.resident.active && <Badge variant="neutral">inativo</Badge>}
                          </span>
                        ) : (
                          <span className="text-ink-300">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{u._count.cases}</TableCell>
                      {admin && (
                        <TableCell className="text-right">
                          {!u.residentId && u._count.cases === 0 && (
                            <ActionButton action={deleteUnit.bind(null, u.id)} variant="ghost" confirm={`Remover a unidade ${unitShort(u)}?`}>
                              Remover
                            </ActionButton>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {admin && (
              <Card>
                <CardHeader>
                  <CardTitle>Importar unidades</CardTitle>
                  <CardDescription>Uma unidade por linha. Unidades que já existem são ignoradas.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ImportUnitsForm condominiumId={c.id} />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Síndico</CardTitle>
                {admin && (
                  <SyndicFormDialog
                    condominiumId={c.id}
                    trigger={
                      <Button size="sm" variant="outline">
                        <Icon name="plus" />
                        Novo síndico
                      </Button>
                    }
                  />
                )}
              </CardHeader>
              <CardContent className="flex flex-col divide-y divide-divider">
                {syndics.length === 0 && <p className="text-sm text-ink-500">Sem síndico cadastrado.</p>}
                {syndics.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <Avatar name={s.name} size={36} color="var(--rai-azulejo-600)" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 font-medium text-ink-900">
                        {s.name} {!s.active && <Badge variant="neutral">inativo</Badge>}
                      </div>
                      <div className="text-xs text-ink-500">
                        {s.email}
                        {s.phone && ` · ${s.phone}`}
                      </div>
                    </div>
                    {admin && s.id !== user.id && (
                      <ActionButton action={setUserActive.bind(null, s.id, !s.active)} variant={s.active ? "destructive" : "outline"}>
                        {s.active ? "Desativar" : "Ativar"}
                      </ActionButton>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Moradores</CardTitle>
                <span className="font-mono text-[10px] tracking-caps text-ink-400 uppercase">
                  {residents.length} cadastrado{residents.length === 1 ? "" : "s"}
                </span>
              </CardHeader>
              <CardContent className="flex flex-col divide-y divide-divider">
                {residents.length === 0 && <p className="text-sm text-ink-500">Ninguém se cadastrou ainda. Divulgue o link ou o QR ao lado.</p>}
                {residents.map((r) => {
                  const unit = unitOf(r.id);
                  return (
                    <div key={r.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <Avatar name={r.name} size={36} color="var(--rai-clay-500)" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 font-medium text-ink-900">
                          {r.name} {!r.active && <Badge variant="neutral">inativo</Badge>}
                        </div>
                        <div className="text-xs text-ink-500">
                          <span className="font-mono">{unit ? unitShort(unit) : "sem unidade"}</span> · {r.email}
                          {r.phone && ` · ${r.phone}`}
                        </div>
                      </div>
                      {admin && (
                        <ActionButton action={setUserActive.bind(null, r.id, !r.active)} variant={r.active ? "destructive" : "outline"}>
                          {r.active ? "Desativar" : "Ativar"}
                        </ActionButton>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <aside className="flex flex-col gap-4">
            <div className="rounded-md bg-surface p-5 shadow-hair">
              <Eyebrow>Cadastro de moradores</Eyebrow>
              <p className="mt-1 text-sm font-semibold text-ink-900">Link e QR do condomínio</p>
              <div className="mt-4 flex flex-col items-center gap-3 text-center">
                <div className="rounded-md bg-white p-2 shadow-hair [&>svg]:size-[180px]" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                <p className="text-xs text-ink-500">O morador aponta a câmera ou abre o link e cria a conta já vinculada a este condomínio.</p>
                <Input readOnly value={url} className="h-9 font-mono text-xs max-md:min-h-9" />
                <div className="flex flex-wrap justify-center gap-2">
                  <CopyButton text={url} />
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/condominios/${c.id}/cartaz`} target="_blank">
                      <Icon name="print" />
                      Imprimir cartaz
                    </Link>
                  </Button>
                </div>
                {admin && (
                  <div className="mt-2 flex flex-col items-center gap-1 border-t border-divider pt-3">
                    <ActionButton
                      action={regenerateSignupCode.bind(null, c.id)}
                      variant="ghost"
                      className="text-iron-700"
                      confirm="Gerar novo código? O link e o QR antigos deixam de funcionar."
                    >
                      Gerar novo código
                    </ActionButton>
                    <p className="text-[11px] text-ink-400">Gerar novo código invalida o link antigo.</p>
                  </div>
                )}
                {!c.active && <p className="text-xs text-iron-700">Condomínio inativo: o link de cadastro não funciona.</p>}
              </div>
            </div>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
