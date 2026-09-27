"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { cancelCase } from "@/lib/actions/cases";

export function CancelCaseButton({ caseId, protocol }: { caseId: string; protocol: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Icon name="close" />
          Cancelar obra
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar a obra {protocol}?</DialogTitle>
          <DialogDescription>
            A obra fica registrada como cancelada e não pode ser reaberta. Se quiser fazê-la depois, cadastre uma nova.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-iron-600">{error}</p>}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Voltar</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                try {
                  const r = await cancelCase(caseId);
                  if (r.error) setError(r.error);
                  else setOpen(false);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Não foi possível cancelar.");
                }
              })
            }
          >
            {pending ? "Cancelando…" : "Cancelar obra"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
