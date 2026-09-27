"use client";

import { startTransition, useActionState, useRef } from "react";

import { Button } from "@/components/ui/button";
import { uploadDocument } from "@/lib/actions/documents";
import type { ActionState } from "@/lib/actions/state";
import type { DocumentType } from "@/lib/rules/checklist";

export function UploadDocumentForm({ caseId, type, label = "Anexar" }: { caseId: string; type: DocumentType; label?: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(uploadDocument.bind(null, caseId), {});
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="type" value={type} />
      <input
        ref={fileRef}
        type="file"
        name="file"
        accept="application/pdf,image/jpeg,image/png"
        required
        className="sr-only"
        onChange={(e) => {
          // Envia assim que o arquivo é escolhido. A action é chamada numa transition
          // (requestSubmit() dentro do onChange dispara "Cannot update form state while rendering").
          const form = e.target.form;
          if (e.target.files?.length && form) startTransition(() => action(new FormData(form)));
        }}
      />
      <Button type="button" size="sm" disabled={pending} onClick={() => fileRef.current?.click()}>
        {pending ? "Enviando…" : label}
      </Button>
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
    </form>
  );
}
