"use client";

import { useActionState, useState, useTransition } from "react";

import { FieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      ? { title: "Informar início da obra", hint: "A obra está liberada. Quando começar, informe a data aqui.", button: "Informar início" }
      : { title: "Informar conclusão da obra", hint: "Quando terminar, informe a data. O síndico ou a administradora confirma.", button: "Informar conclusão" };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-muted-foreground">{copy.hint}</p>
        <form action={action} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`date-${kind}`}>Data</Label>
            <Input id={`date-${kind}`} name="date" type="date" defaultValue={today()} required className="w-44" />
            <FieldError messages={state.fieldErrors?.date} />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando…" : copy.button}
          </Button>
          {state.error && !state.fieldErrors && <p className="basis-full text-xs text-danger">{state.error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}

/** Síndico/admin: confirmar a conclusão informada pelo morador. */
export function ConfirmCompletionCard({ caseId, reportedAt }: { caseId: string; reportedAt: string | null }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Confirmar conclusão</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {reportedAt ? `O morador informou a conclusão em ${reportedAt}.` : "O morador ainda não informou a conclusão da obra."}
          </p>
          {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        </div>
        <Button
          disabled={!reportedAt || pending}
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
      </CardContent>
    </Card>
  );
}
