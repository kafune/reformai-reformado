"use client";

import { useActionState } from "react";

import { FieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword, deleteMyAccount, updateProfile } from "@/lib/actions/account";
import type { ActionState } from "@/lib/actions/state";

export function ProfileForm({ initial }: { initial: { name: string; phone: string | null; email: string } }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateProfile, {});
  return (
    <Card>
      <form action={action}>
        <CardHeader>
          <CardTitle>Meus dados</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3.5 pt-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" defaultValue={initial.name} required />
            <FieldError messages={state.fieldErrors?.name} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" name="phone" defaultValue={initial.phone ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" value={initial.email} readOnly className="bg-muted" />
            <p className="text-xs text-muted-foreground">O e-mail é o seu login e não pode ser alterado por aqui.</p>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-3 border-t pt-4">
          {state.ok && <span className="mr-auto text-sm text-ok">Dados salvos.</span>}
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(changePassword, {});
  return (
    <Card>
      <form action={action}>
        <CardHeader>
          <CardTitle>Trocar senha</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3.5 pt-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="current">Senha atual</Label>
            <Input id="current" name="current" type="password" autoComplete="current-password" required />
            <FieldError messages={state.fieldErrors?.current} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Nova senha</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
            <FieldError messages={state.fieldErrors?.password} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm">Repita a nova senha</Label>
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
            <FieldError messages={state.fieldErrors?.confirm} />
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-3 border-t pt-4">
          {state.ok && <span className="mr-auto text-sm text-ok">Senha alterada.</span>}
          {state.error && !state.ok && <span className="mr-auto text-sm text-danger">{state.error}</span>}
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Salvando…" : "Trocar senha"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(deleteMyAccount, {});
  return (
    <Card className="border-danger/30">
      <form action={action}>
        <CardHeader>
          <CardTitle>Excluir minha conta</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pt-4">
          <p className="text-sm text-muted-foreground">
            Seus dados pessoais (nome, e-mail e telefone) são apagados e o acesso é encerrado. As obras e o histórico do
            condomínio ficam registrados sem a sua identificação, como a LGPD permite para obrigação legal e
            interesse legítimo do condomínio.
          </p>
          <div className="flex flex-col gap-1.5 sm:max-w-xs">
            <Label htmlFor="confirm-delete">Digite EXCLUIR para confirmar</Label>
            <Input id="confirm-delete" name="confirm" autoComplete="off" required />
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
        </CardContent>
        <CardFooter className="justify-end border-t pt-4">
          <Button type="submit" variant="destructive" disabled={pending}>
            {pending ? "Excluindo…" : "Excluir minha conta"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
