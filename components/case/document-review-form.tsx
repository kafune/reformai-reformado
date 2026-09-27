"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reviewDocument } from "@/lib/actions/review";
import type { ActionState } from "@/lib/actions/state";
import type { DocStatus } from "@/lib/rules/status";

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

  return (
    <form action={action} className="flex flex-wrap items-center gap-2.5">
      <label className="flex items-center gap-1.5 text-xs">
        <input
          type="radio"
          name="status"
          value="APPROVED"
          checked={status === "APPROVED"}
          onChange={() => setStatus("APPROVED")}
          className="accent-primary"
        />
        Aprovar
      </label>
      <label className="flex items-center gap-1.5 text-xs">
        <input
          type="radio"
          name="status"
          value="REJECTED"
          checked={status === "REJECTED"}
          onChange={() => setStatus("REJECTED")}
          className="accent-danger"
        />
        Reprovar
      </label>
      <Input
        name="note"
        defaultValue={currentNote ?? suggested?.note ?? ""}
        placeholder={status === "REJECTED" ? "Diga o que está errado" : "Nota (opcional)"}
        className="h-8 min-w-40 flex-1 text-xs"
        aria-invalid={state.fieldErrors?.note ? true : undefined}
      />
      <Button type="submit" size="sm" variant={suggested && current === "PENDING" ? "julia" : "outline"} disabled={pending || status === "PENDING"}>
        {pending ? "Salvando…" : suggested && current === "PENDING" ? "Confirmar" : "Salvar"}
      </Button>
      {state.fieldErrors?.note && <p className="basis-full text-xs text-danger">{state.fieldErrors.note.join(" ")}</p>}
      {state.error && !state.fieldErrors && <p className="basis-full text-xs text-danger">{state.error}</p>}
    </form>
  );
}
