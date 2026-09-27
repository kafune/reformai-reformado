"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { submitCase } from "@/lib/actions/cases";
import { cn } from "@/lib/utils";

/** "Próximo passo" do morador: enviar para análise. Bloqueado sempre diz o que falta. */
export function SubmitCard({ caseId, blockers, resubmit }: { caseId: string; blockers: string[]; resubmit: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const blocked = blockers.length > 0;

  return (
    <div className={cn("rounded-md border p-4 md:p-5", blocked ? "border-ochre-300 bg-ochre-50" : "border-green-200 bg-green-50")} role="status">
      <div className="flex flex-wrap items-start gap-3">
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", blocked ? "bg-ochre-100" : "bg-green-100")}>
          <Icon name={blocked ? "alert" : "send"} size={17} className={blocked ? "text-ochre-700" : "text-green-700"} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] font-semibold tracking-caps text-ink-400 uppercase">Próximo passo</p>
          <h2 className="mt-0.5 text-sm font-semibold text-ink-900">{resubmit ? "Reenviar para análise" : "Enviar para análise"}</h2>
          {blocked ? (
            <ul className="mt-1.5 list-disc pl-4 text-xs leading-relaxed text-ochre-800">
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-0.5 text-xs leading-relaxed text-ink-600">Tudo pronto. O síndico ou a administradora vai conferir os documentos.</p>
          )}
          {error && <p className="mt-1 text-xs text-iron-600">{error}</p>}
        </div>
        <Button
          disabled={blocked || pending}
          title={blocked ? "Resolva os pontos ao lado para enviar" : undefined}
          className="max-sm:w-full"
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
          <Icon name="arrow" />
        </Button>
      </div>
    </div>
  );
}
