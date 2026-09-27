import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionButton } from "@/components/action-button";
import { CondominiumFormDialog } from "@/components/admin/condominium-form";
import { CopyButton } from "@/components/admin/copy-button";
import { SyndicFormDialog } from "@/components/admin/syndic-form";
import { ImportUnitsForm, UnitForm } from "@/components/admin/unit-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteUnit, regenerateSignupCode, setCondominiumActive, setUserActive, updateCondominium } from "@/lib/actions/admin";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { initials, unitShort } from "@/lib/format";
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
      units: { include: { resident: { select: { id: true, name: true, active: true } }, _count: { select: { cases: true } } }, orderBy: [{ block: "asc" }, { number: "asc" }] },
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
      <div>
        <p className="mb-1.5 text-xs text-muted-foreground">
          {admin ? (
            <>
              <Link href="/admin/condominios" className="hover:underline">
                Condomínios
              </Link>{" "}
              / {c.name}
            </>
          ) : (
            "Cadastro de moradores"
          )}
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[22px] font-semibold tracking-tight">{c.name}</h1>
              {!c.active && <Badge variant="secondary">Inativo</Badge>}
            </div>
            <p className="mt-1 text-muted-foreground">
              {c.address} — {c.city}/{c.state}
            </p>
          </div>
          {admin && (
            <div className="flex flex-wrap gap-2.5">
              <CondominiumFormDialog
                action={updateCondominium.bind(null, c.id)}
                initial={{ name: c.name, address: c.address, city: c.city, state: c.state, signupCode: c.signupCode }}
                title="Editar condomínio"
                trigger={<Button variant="outline">Editar dados</Button>}
              />
              <ActionButton
                action={setCondominiumActive.bind(null, c.id, !c.active)}
                variant={c.active ? "destructive" : "default"}
                size="default"
                confirm={c.active ? "Desativar o condomínio? O link de cadastro para de funcionar." : undefined}
              >
                {c.active ? "Desativar" : "Ativar"}
              </ActionButton>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-5">
          <Card className="gap-0 py-0">
            <CardHeader className="flex-row items-center justify-between py-4">
              <CardTitle>Unidades</CardTitle>
              <span className="text-xs text-muted-foreground">
                {c.units.length} unidade{c.units.length === 1 ? "" : "s"} · {withResident} com morador
              </span>
            </CardHeader>
            <div className="flex flex-wrap items-center gap-2 border-y px-3.5 py-3">
              <form>
                <Input name="q" defaultValue={q} placeholder="Bloco ou número" className="h-8 w-40 text-xs" />
              </form>
              {admin && (
                <div className="ml-auto">
                  <UnitForm condominiumId={c.id} />
                </div>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bloco</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Morador</TableHead>
                  <TableHead>Obras</TableHead>
                  {admin && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Nenhuma unidade{q ? " com esse filtro" : ". Adicione ou importe abaixo"}.
                    </TableCell>
                  </TableRow>
                )}
                {units.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.block || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="font-medium">{u.number}</TableCell>
                    <TableCell>
                      {u.resident ? (
                        <>
                          {u.resident.name}
                          {!u.resident.active && <Badge variant="secondary" className="ml-2">inativo</Badge>}
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{u._count.cases}</TableCell>
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
              </CardHeader>
              <CardContent>
                <ImportUnitsForm condominiumId={c.id} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Síndico</CardTitle>
              {admin && <SyndicFormDialog condominiumId={c.id} trigger={<Button size="sm" variant="outline">＋ Novo síndico</Button>} />}
            </CardHeader>
            <CardContent className="flex flex-col divide-y">
              {syndics.length === 0 && <p className="text-sm text-muted-foreground">Sem síndico cadastrado.</p>}
              {syndics.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="grid size-8 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">{initials(s.name)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">
                      {s.name} {!s.active && <Badge variant="secondary">inativo</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
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
              <span className="text-xs text-muted-foreground">{residents.length} cadastrado{residents.length === 1 ? "" : "s"}</span>
            </CardHeader>
            <CardContent className="flex flex-col divide-y">
              {residents.length === 0 && <p className="text-sm text-muted-foreground">Ninguém se cadastrou ainda. Divulgue o link ou o QR ao lado.</p>}
              {residents.map((r) => {
                const unit = unitOf(r.id);
                return (
                  <div key={r.id} className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">
                        {r.name} {!r.active && <Badge variant="secondary">inativo</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {unit ? unitShort(unit) : "sem unidade"} · {r.email}
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

        <aside className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Cadastro de moradores</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3 text-center">
              <div className="rounded-lg border bg-white p-2 [&>svg]:size-[180px]" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              <p className="text-xs text-muted-foreground">O morador aponta a câmera ou abre o link e cria a conta já vinculada a este condomínio.</p>
              <Input readOnly value={url} className="h-8 font-mono text-xs" />
              <div className="flex flex-wrap justify-center gap-2">
                <CopyButton text={url} />
                <Button asChild size="sm" variant="outline">
                  <Link href={`/admin/condominios/${c.id}/cartaz`} target="_blank">
                    Imprimir cartaz
                  </Link>
                </Button>
              </div>
              {admin && (
                <>
                  <ActionButton action={regenerateSignupCode.bind(null, c.id)} variant="ghost" className="text-danger" confirm="Gerar novo código? O link e o QR antigos deixam de funcionar.">
                    Gerar novo código
                  </ActionButton>
                  <p className="text-xs text-muted-foreground">Gerar novo código invalida o link antigo.</p>
                </>
              )}
              {!c.active && <p className="text-xs text-danger">Condomínio inativo: o link de cadastro não funciona.</p>}
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
