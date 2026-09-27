"use client";

import { useActionState, useState } from "react";

import { FieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { JuliaRecommendation } from "@/components/case/julia-recommendation";
import { approveCase, rejectCase, requestChanges } from "@/lib/actions/review";
import type { ReleaseRecommendation } from "@/lib/decision";
import type { ActionState } from "@/lib/actions/state";

/** Decisão do síndico/admin: liberar (clique humano), pedir correção ou recusar. */
export function DecisionCard({
  caseId,
  blockers,
  requiresArt,
  recommendation,
}: {
  caseId: string;
  /** Bloqueios que não dependem da conferência da ART (documentos pendentes/reprovados). */
  blockers: string[];
  requiresArt: boolean;
  /** Pré-preenchimento da Julia-1 (Decisão 3), quando houver. */
  recommendation: ReleaseRecommendation | null;
}) {
  const [approveState, approveAction, approving] = useActionState<ActionState, FormData>(approveCase.bind(null, caseId), {});
  const [artConfirmed, setArtConfirmed] = useState(false);
  const blocked = blockers.length > 0 || (requiresArt && !artConfirmed);
  const rec = recommendation?.recommendation ?? null;
  const hint = (option: string) => (rec === option ? " ✦" : "");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Decisão</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3.5">
        {recommendation && <JuliaRecommendation rec={recommendation} />}
        {blockers.length > 0 ? (
          <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2.5 text-xs">
            <strong>Ainda não dá para liberar</strong>
            <ul className="mt-1 list-disc pl-4">
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2.5 text-xs">
            <strong>Documentos conferidos.</strong> {requiresArt ? "Confirme a ART/RRT para liberar." : "A obra pode ser liberada."}
          </div>
        )}

        <form action={approveAction} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="conditions">Condições da liberação (opcional)</Label>
            <Textarea
              id="conditions"
              name="conditions"
              className="min-h-20"
              placeholder={
                rec === "approve_with_conditions"
                  ? "A Julia-1 sugere liberar com condições — escreva quais (ex.: horário, avisos, cuidados)."
                  : "Ex.: obras só de seg. a sex., 8h–17h; avisar a portaria antes de subir material."
              }
            />
            <FieldError messages={approveState.fieldErrors?.conditions} />
          </div>
          {requiresArt && (
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-xs has-checked:border-primary has-checked:bg-[#f7fdf9]">
              <input
                type="checkbox"
                name="artConfirmed"
                checked={artConfirmed}
                onChange={(e) => setArtConfirmed(e.target.checked)}
                className="mt-0.5 accent-primary"
              />
              <span>
                Conferi que a ART/RRT cobre <strong>todos</strong> os serviços declarados.
              </span>
            </label>
          )}
          {approveState.error && <p className="text-xs text-danger">{approveState.error}</p>}
          <Button
            type="submit"
            disabled={blocked || approving}
            title={blocked ? "Resolva os pontos acima para liberar" : undefined}
            className={rec === "approve" || rec === "approve_with_conditions" ? "ring-2 ring-julia/40 ring-offset-1" : undefined}
          >
            {approving ? "Liberando…" : `Liberar obra${hint("approve")}${hint("approve_with_conditions")}`}
          </Button>
        </form>

        <div className="flex gap-2.5">
          <MessageDialog
            caseId={caseId}
            kind="changes"
            trigger={
              <Button variant="outline" className={rec === "request_changes" ? "flex-1 ring-2 ring-julia/40 ring-offset-1" : "flex-1"}>
                Pedir correção{hint("request_changes")}
              </Button>
            }
          />
          <MessageDialog
            caseId={caseId}
            kind="reject"
            trigger={
              <Button variant="destructive" className={rec === "reject" ? "flex-1 ring-2 ring-julia/40 ring-offset-1" : "flex-1"}>
                Recusar{hint("reject")}
              </Button>
            }
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Pedir correção devolve a obra ao morador com as notas dos documentos reprovados. Recusar encerra a obra.
        </p>
      </CardContent>
    </Card>
  );
}

function MessageDialog({ caseId, kind, trigger }: { caseId: string; kind: "changes" | "reject"; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const fn = kind === "changes" ? requestChanges : rejectCase;
  const [state, action, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const r = await fn(caseId, prev, formData);
      if (r.ok) setOpen(false);
      return r;
    },
    {},
  );
  const copy =
    kind === "changes"
      ? {
          title: "Pedir correção ao morador",
          description: "A obra volta para o morador, que corrige e reenvia para análise.",
          label: "O que precisa ser corrigido",
          button: "Pedir correção",
        }
      : {
          title: "Recusar a obra",
          description: "A recusa encerra a obra. O morador vê o motivo e pode cadastrar uma nova, se for o caso.",
          label: "Motivo da recusa",
          button: "Recusar obra",
        };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form action={action} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>{copy.description}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`message-${kind}`}>{copy.label}</Label>
            <Textarea id={`message-${kind}`} name="message" required minLength={5} />
            <FieldError messages={state.fieldErrors?.message} />
            {state.error && !state.fieldErrors && <p className="text-xs text-danger">{state.error}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Voltar
              </Button>
            </DialogClose>
            <Button type="submit" variant={kind === "reject" ? "destructive" : "default"} disabled={pending}>
              {pending ? "Enviando…" : copy.button}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
