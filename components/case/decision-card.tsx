"use client";

import { useActionState, useState } from "react";

import { FieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Icon } from "@/components/ui/icon";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { JuliaRecommendation } from "@/components/case/julia-recommendation";
import { approveCase, rejectCase, requestChanges } from "@/lib/actions/review";
import type { ReleaseRecommendation } from "@/lib/decision";
import type { ActionState } from "@/lib/actions/state";
import { cn } from "@/lib/utils";

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
  const juliaRing = "ring-2 ring-violet-300 ring-offset-1 ring-offset-surface";

  return (
    <Card className="shadow-2">
      <CardHeader>
        <CardTitle>Decisão</CardTitle>
        <CardDescription>Liberar, pedir correção ou recusar é sempre um clique seu.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3.5">
        {recommendation && <JuliaRecommendation rec={recommendation} />}
        {blockers.length > 0 ? (
          <div className="flex items-start gap-2.5 rounded-md border border-iron-300 bg-iron-50 px-3 py-2.5 text-xs text-ink-700">
            <Icon name="alert" size={14} className="mt-0.5 shrink-0 text-iron-600" />
            <div>
              <strong className="text-iron-700">Ainda não dá para liberar</strong>
              <ul className="mt-1 list-disc pl-4">
                {blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2.5 rounded-md border border-green-200 bg-green-50 px-3 py-2.5 text-xs text-ink-700">
            <Icon name="check" size={14} className="mt-0.5 shrink-0 text-green-700" />
            <div>
              <strong className="text-green-800">Documentos conferidos.</strong> {requiresArt ? "Confirme a ART/RRT para liberar." : "A obra pode ser liberada."}
            </div>
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
            <label className="flex cursor-pointer items-start gap-2.5 rounded-sm bg-bone-100 px-3 py-2.5 text-xs text-ink-700 has-checked:bg-green-100 has-checked:text-green-900">
              <input
                type="checkbox"
                name="artConfirmed"
                checked={artConfirmed}
                onChange={(e) => setArtConfirmed(e.target.checked)}
                className="mt-0.5 accent-green-700"
              />
              <span>
                Conferi que a ART/RRT cobre <strong>todos</strong> os serviços declarados.
              </span>
            </label>
          )}
          {approveState.error && <p className="text-xs text-iron-600">{approveState.error}</p>}
          <Button
            type="submit"
            size="lg"
            disabled={blocked || approving}
            title={blocked ? "Resolva os pontos acima para liberar" : undefined}
            className={cn(rec === "approve" || rec === "approve_with_conditions" ? juliaRing : undefined)}
          >
            <Icon name="shield" size={16} />
            {approving ? "Liberando…" : "Liberar obra"}
            {(rec === "approve" || rec === "approve_with_conditions") && <Icon name="sparkle" size={14} className="text-violet-300" />}
          </Button>
        </form>

        <div className="flex gap-2.5">
          <MessageDialog
            caseId={caseId}
            kind="changes"
            trigger={
              <Button variant="outline" className={cn("flex-1", rec === "request_changes" && juliaRing)}>
                <Icon name="edit" />
                Pedir correção
              </Button>
            }
          />
          <MessageDialog
            caseId={caseId}
            kind="reject"
            trigger={
              <Button variant="destructive" className={cn("flex-1", rec === "reject" && juliaRing)}>
                <Icon name="close" />
                Recusar
              </Button>
            }
          />
        </div>
        <p className="text-xs text-ink-500">Pedir correção devolve a obra ao morador com as notas dos documentos reprovados. Recusar encerra a obra.</p>
      </CardContent>
    </Card>
  );
}

function MessageDialog({ caseId, kind, trigger }: { caseId: string; kind: "changes" | "reject"; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const fn = kind === "changes" ? requestChanges : rejectCase;
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, formData) => {
    const r = await fn(caseId, prev, formData);
    if (r.ok) setOpen(false);
    return r;
  }, {});
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
            {state.error && !state.fieldErrors && <p className="text-xs text-iron-600">{state.error}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
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
