"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createUnit, importUnits } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/actions/state";

export function UnitForm({ condominiumId }: { condominiumId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createUnit.bind(null, condominiumId), {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <Input name="block" placeholder="Bloco" className="h-8 w-24 text-xs uppercase" />
      <Input name="number" placeholder="Número" required className="h-8 w-28 text-xs" />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "…" : "＋ Unidade"}
      </Button>
      {state.error && <span className="text-xs text-danger">{state.error}</span>}
      {state.fieldErrors?.number && <span className="text-xs text-danger">{state.fieldErrors.number.join(" ")}</span>}
    </form>
  );
}

export function ImportUnitsForm({ condominiumId }: { condominiumId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(importUnits.bind(null, condominiumId), {});
  const [lines, setLines] = useState("");
  const count = lines.split(/\r?\n/).filter((l) => l.trim()).length;
  return (
    <form action={action} className="flex flex-col gap-2.5">
      <p className="text-xs text-muted-foreground">
        Cole uma unidade por linha no formato <span className="font-mono">bloco;número</span> (ou só o número, sem bloco). Unidades que já existem são ignoradas.
      </p>
      <Textarea name="lines" value={lines} onChange={(e) => setLines(e.target.value)} className="min-h-28 font-mono text-xs" placeholder={"A;103\nA;104\nB;305"} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pending || count === 0}>
          {pending ? "Importando…" : `Importar ${count} unidade${count === 1 ? "" : "s"}`}
        </Button>
        {state.error && <span className="text-xs text-danger">{state.error}</span>}
        {state.ok && state.fieldErrors?._ && <span className="text-xs text-ok">{state.fieldErrors._.join(" ")}</span>}
      </div>
    </form>
  );
}
