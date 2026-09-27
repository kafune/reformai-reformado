"use client";

import { useActionState, useState } from "react";

import { FieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/actions/state";

export type CondominiumValues = { name: string; address: string; city: string; state: string; signupCode: string };

/** Diálogo de criar/editar condomínio. A action já vem "bound" (createCondominium ou updateCondominium.bind(id)). */
export function CondominiumFormDialog({
  action,
  initial,
  trigger,
  title,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: CondominiumValues;
  trigger: React.ReactNode;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await action(prev, fd);
    if (r.ok) setOpen(false);
    return r;
  }, {});
  const err = (k: string) => state.fieldErrors?.[k];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>O código de cadastro vira o link/QR que os moradores usam para criar conta.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="c-name">Nome</Label>
              <Input id="c-name" name="name" defaultValue={initial?.name} required />
              <FieldError messages={err("name")} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="c-address">Endereço</Label>
              <Input id="c-address" name="address" defaultValue={initial?.address} required />
              <FieldError messages={err("address")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-city">Cidade</Label>
              <Input id="c-city" name="city" defaultValue={initial?.city} required />
              <FieldError messages={err("city")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-state">UF</Label>
              <Input id="c-state" name="state" defaultValue={initial?.state} maxLength={2} required className="uppercase" />
              <FieldError messages={err("state")} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="c-code">Código de cadastro</Label>
              <Input id="c-code" name="signupCode" defaultValue={initial?.signupCode} placeholder="Gerado automaticamente se vazio" className="font-mono uppercase" />
              <FieldError messages={err("signupCode")} />
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
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
