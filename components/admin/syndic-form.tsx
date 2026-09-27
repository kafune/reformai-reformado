"use client";

import { useActionState, useState } from "react";

import { FieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSyndic } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/actions/state";

export function SyndicFormDialog({ condominiumId, trigger }: { condominiumId: string; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await createSyndic(condominiumId, prev, fd);
    if (r.ok) setOpen(false);
    return r;
  }, {});
  const err = (k: string) => state.fieldErrors?.[k];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form action={action} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Novo síndico</DialogTitle>
            <DialogDescription>Defina uma senha provisória e passe ao síndico junto com o e-mail de acesso.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="s-name">Nome</Label>
              <Input id="s-name" name="name" required />
              <FieldError messages={err("name")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="s-email">E-mail</Label>
              <Input id="s-email" name="email" type="email" required />
              <FieldError messages={err("email")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="s-phone">Telefone</Label>
              <Input id="s-phone" name="phone" />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="s-password">Senha provisória</Label>
              <Input id="s-password" name="password" type="text" minLength={8} required autoComplete="off" />
              <FieldError messages={err("password")} />
            </div>
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Criando…" : "Criar síndico"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
