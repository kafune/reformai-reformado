"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createUnit, importUnits } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/actions/state";

export function UnitForm({ condominiumId }: { condominiumId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createUnit.bind(null, condominiumId), {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <Input name="block" placeholder="Bloco" className="h-9 w-24 font-mono text-xs uppercase max-md:min-h-9" />
      <Input name="number" placeholder="Número" required className="h-9 w-28 font-mono text-xs max-md:min-h-9" />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        <Icon name="plus" />
        {pending ? "…" : "Unidade"}
      </Button>
      {state.error && <span className="text-xs text-iron-600">{state.error}</span>}
      {state.fieldErrors?.number && <span className="text-xs text-iron-600">{state.fieldErrors.number.join(" ")}</span>}
    </form>
  );
}

export function ImportUnitsForm({ condominiumId }: { condominiumId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(importUnits.bind(null, condominiumId), {});
  const [lines, setLines] = useState("");
  const count = lines.split(/\r?\n/).filter((l) => l.trim()).length;
  return (
    <form action={action} className="flex flex-col gap-2.5">
      <p className="text-xs text-ink-500">
        Formato <span className="rounded-xs bg-bone-100 px-1 font-mono">bloco;número</span> (ou só o número, sem bloco).
      </p>
      <Textarea name="lines" value={lines} onChange={(e) => setLines(e.target.value)} className="min-h-28 font-mono text-xs" placeholder={"A;103\nA;104\nB;305"} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pending || count === 0}>
          <Icon name="upload" />
          {pending ? "Importando…" : `Importar ${count} unidade${count === 1 ? "" : "s"}`}
        </Button>
        {state.error && <span className="text-xs text-iron-600">{state.error}</span>}
        {state.ok && state.fieldErrors?._ && <span className="text-xs text-green-700">{state.fieldErrors._.join(" ")}</span>}
      </div>
    </form>
  );
}
