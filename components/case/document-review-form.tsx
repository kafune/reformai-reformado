"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reviewDocument } from "@/lib/actions/review";
import type { ActionState } from "@/lib/actions/state";
import type { DocStatus } from "@/lib/rules/status";
import { cn } from "@/lib/utils";

/** Aprovar/reprovar um documento com nota. Só aparece para síndico/admin com a obra em análise. */
export function DocumentReviewForm({
  documentId,
  current,
  currentNote,
  suggested,
}: {
  documentId: string;
  current: DocStatus;
  currentNote: string | null;
  /** Pré-preenchimento (Julia-1 + checagens). O humano confirma ou altera. */
  suggested?: { status: "APPROVED" | "REJECTED"; note: string } | null;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(reviewDocument.bind(null, documentId), {});
  const [status, setStatus] = useState<DocStatus>(current === "PENDING" && suggested ? suggested.status : current);
  const prefilled = !!suggested && current === "PENDING";

  return (
    <form action={action} className="flex flex-wrap items-center gap-2.5">
      <div className="inline-flex overflow-hidden rounded-sm shadow-hair" role="radiogroup" aria-label="Conferência">
        <label className={cn("flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors", status === "APPROVED" ? "bg-green-100 text-green-800" : "text-ink-500 hover:bg-bone-100")}>
          <input type="radio" name="status" value="APPROVED" checked={status === "APPROVED"} onChange={() => setStatus("APPROVED")} className="accent-green-700" />
          Aprovar
        </label>
        <label className={cn("flex cursor-pointer items-center gap-1.5 border-l border-divider px-2.5 py-1.5 text-xs font-medium transition-colors", status === "REJECTED" ? "bg-iron-100 text-iron-700" : "text-ink-500 hover:bg-bone-100")}>
          <input type="radio" name="status" value="REJECTED" checked={status === "REJECTED"} onChange={() => setStatus("REJECTED")} className="accent-iron-600" />
          Reprovar
        </label>
      </div>
      <Input
        name="note"
        defaultValue={currentNote ?? suggested?.note ?? ""}
        placeholder={status === "REJECTED" ? "Diga o que está errado" : "Nota (opcional)"}
        className="h-8 min-w-40 flex-1 text-xs max-md:min-h-9"
        aria-invalid={state.fieldErrors?.note ? true : undefined}
      />
      <Button type="submit" size="sm" variant={prefilled ? "julia" : "outline"} disabled={pending || status === "PENDING"}>
        {pending ? "Salvando…" : prefilled ? "Confirmar" : "Salvar"}
      </Button>
      {state.fieldErrors?.note && <p className="basis-full text-xs text-iron-600">{state.fieldErrors.note.join(" ")}</p>}
      {state.error && !state.fieldErrors && <p className="basis-full text-xs text-iron-600">{state.error}</p>}
    </form>
  );
}
