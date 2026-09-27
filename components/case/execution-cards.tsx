"use client";

import { useActionState, useState, useTransition } from "react";

import { FieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { reportCompletion, startCase } from "@/lib/actions/cases";
import { confirmCompletion } from "@/lib/actions/review";
import type { ActionState } from "@/lib/actions/state";

const today = () => new Date().toISOString().slice(0, 10);

/** Morador: informar início (obra liberada) ou conclusão (obra em execução). */
export function ReportDateCard({ caseId, kind }: { caseId: string; kind: "start" | "completion" }) {
  const fn = kind === "start" ? startCase : reportCompletion;
  const [state, action, pending] = useActionState<ActionState, FormData>(fn.bind(null, caseId), {});
  const copy =
    kind === "start"
      ? { title: "Informar início da obra", hint: "A obra está liberada. Quando começar, informe a data aqui.", button: "Informar início", icon: "play" as const }
      : { title: "Informar conclusão da obra", hint: "Quando terminar, informe a data. O síndico ou a administradora confirma.", button: "Informar conclusão", icon: "flag" as const };

  return (
    <div className="rounded-md border border-azulejo-200 bg-azulejo-50 p-4 md:p-5" role="status">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-azulejo-100">
          <Icon name={copy.icon} size={17} className="text-azulejo-700" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] font-semibold tracking-caps text-ink-400 uppercase">Próximo passo</p>
          <h2 className="mt-0.5 text-sm font-semibold text-ink-900">{copy.title}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-600">{copy.hint}</p>
          <form action={action} className="mt-3 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`date-${kind}`}>Data</Label>
              <Input id={`date-${kind}`} name="date" type="date" defaultValue={today()} required className="w-44" />
              <FieldError messages={state.fieldErrors?.date} />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : copy.button}
            </Button>
            {state.error && !state.fieldErrors && <p className="basis-full text-xs text-iron-600">{state.error}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}

/** Síndico/admin: confirmar a conclusão informada pelo morador. */
export function ConfirmCompletionCard({ caseId, reportedAt }: { caseId: string; reportedAt: string | null }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-md border border-green-200 bg-green-50 p-4 md:p-5" role="status">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-green-100">
          <Icon name="check" size={17} className="text-green-700" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] font-semibold tracking-caps text-ink-400 uppercase">Próximo passo</p>
          <h2 className="mt-0.5 text-sm font-semibold text-ink-900">Confirmar conclusão</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-600">
            {reportedAt ? `O morador informou a conclusão em ${reportedAt}.` : "O morador ainda não informou a conclusão da obra."}
          </p>
          {error && <p className="mt-1 text-xs text-iron-600">{error}</p>}
        </div>
        <Button
          disabled={!reportedAt || pending}
          title={!reportedAt ? "Aguarde o morador informar a conclusão" : undefined}
          onClick={() =>
            start(async () => {
              setError(null);
              const r = await confirmCompletion(caseId);
              if (r.error) setError(r.error);
            })
          }
        >
          {pending ? "Confirmando…" : "Confirmar conclusão"}
        </Button>
      </div>
    </div>
  );
}
