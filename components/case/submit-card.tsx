"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { submitCase } from "@/lib/actions/cases";

/** Botão "Enviar para análise": bloqueado sempre diz o que falta. */
export function SubmitCard({ caseId, blockers, resubmit }: { caseId: string; blockers: string[]; resubmit: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const blocked = blockers.length > 0;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{resubmit ? "Reenviar para análise" : "Enviar para análise"}</h2>
          {blocked ? (
            <ul className="mt-1.5 list-disc pl-4 text-xs text-warn">
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Tudo pronto. O síndico ou a administradora vai conferir os documentos.
            </p>
          )}
          {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        </div>
        <Button
          disabled={blocked || pending}
          onClick={() =>
            start(async () => {
              setError(null);
              try {
                const r = await submitCase(caseId);
                if (r.error) setError(r.error);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Não foi possível enviar.");
              }
            })
          }
        >
          {pending ? "Enviando…" : resubmit ? "Reenviar para análise" : "Enviar para análise"}
        </Button>
      </CardContent>
    </Card>
  );
}
