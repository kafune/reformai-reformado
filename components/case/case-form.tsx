"use client";

import Link from "next/link";
import { useActionState, useMemo, useState, useTransition } from "react";

import { FieldError } from "@/components/field-error";
import { RiskBadge } from "@/components/risk-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { suggestServicesFromDescription } from "@/lib/actions/cases";
import type { ActionState } from "@/lib/actions/state";
import { DOCUMENT_LABEL, requiredDocuments } from "@/lib/rules/checklist";
import { calculateRisk } from "@/lib/rules/risk";
import { FLAGS, NO_FLAGS, SERVICES, type Flags, type ServiceKey } from "@/lib/rules/services";
import { cn } from "@/lib/utils";

export type CaseFormValues = {
  services: ServiceKey[];
  flags: Flags;
  description: string;
  plannedStart: string; // yyyy-mm-dd
  plannedEnd: string;
  contractorName: string;
};

const EMPTY: CaseFormValues = {
  services: [],
  flags: NO_FLAGS,
  description: "",
  plannedStart: "",
  plannedEnd: "",
  contractorName: "",
};

export function CaseForm({
  action,
  initial = EMPTY,
  cancelHref,
  submitLabel,
  canSuggest = false,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: CaseFormValues;
  cancelHref: string;
  submitLabel: string;
  /** Julia-1 configurada: mostra "Sugerir serviços a partir da descrição". */
  canSuggest?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const [services, setServices] = useState<ServiceKey[]>(initial.services);
  const [flags, setFlags] = useState<Flags>(initial.flags);
  const [description, setDescription] = useState(initial.description);
  const [suggested, setSuggested] = useState<Set<string>>(new Set());
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggesting, startSuggest] = useTransition();

  const suggest = () =>
    startSuggest(async () => {
      setSuggestError(null);
      const r = await suggestServicesFromDescription(description);
      if ("error" in r) return setSuggestError(r.error);
      const keys = r.services.filter((k): k is ServiceKey => SERVICES.some((s) => s.key === k));
      setServices((prev) => [...new Set([...prev, ...keys])]);
      setFlags((prev) => ({
        affectsCommonArea: prev.affectsCommonArea || r.flags.affectsCommonArea,
        affectsFacade: prev.affectsFacade || r.flags.affectsFacade,
        affectsStructure: prev.affectsStructure || r.flags.affectsStructure,
      }));
      setSuggested(new Set([...keys, ...(Object.keys(r.flags) as (keyof Flags)[]).filter((k) => r.flags[k])]));
      if (keys.length === 0) setSuggestError("A Julia-1 não reconheceu nenhum serviço da tabela na descrição. Marque manualmente.");
    });
  const err = (name: string) => state.fieldErrors?.[name];

  // Prévia ao vivo, com as mesmas funções puras que o servidor usa ao salvar.
  const preview = useMemo(() => {
    const risk = calculateRisk(services, flags);
    return { risk, docs: requiredDocuments(risk) };
  }, [services, flags]);

  const toggleService = (key: ServiceKey, on: boolean) =>
    setServices((prev) => (on ? [...prev, key] : prev.filter((k) => k !== key)));

  return (
    <form action={formAction} className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader>
            <CardTitle>1. Descreva a obra</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: quero integrar a cozinha com a sala derrubando a parede entre elas e refazer a parte elétrica…"
              required
            />
            <FieldError messages={err("description")} />
            {canSuggest && (
              <div className="mt-1 flex flex-wrap items-center gap-2.5">
                <Button type="button" variant="julia" size="sm" onClick={suggest} disabled={suggesting || description.trim().length < 10}>
                  {suggesting ? "Sugerindo…" : "✦ Sugerir serviços a partir da descrição"}
                </Button>
                <span className="text-xs text-muted-foreground">A sugestão só marca as opções abaixo — você confirma.</span>
                {suggestError && <span className="basis-full text-xs text-danger">{suggestError}</span>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>2. Serviços</CardTitle>
            <span className="text-xs text-muted-foreground">
              {services.length} selecionado{services.length === 1 ? "" : "s"}
            </span>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SERVICES.map((s) => {
              const on = services.includes(s.key);
              return (
                <label
                  key={s.key}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 rounded-lg border bg-background px-3 py-2.5 hover:border-stone-300",
                    on && "border-primary bg-[#f7fdf9]",
                    suggested.has(s.key) && "shadow-[inset_0_0_0_1px_var(--julia)]",
                  )}
                >
                  <input
                    type="checkbox"
                    name="services"
                    value={s.key}
                    checked={on}
                    onChange={(e) => toggleService(s.key, e.target.checked)}
                    className="mt-0.5 accent-primary"
                  />
                  <span className="flex-1 text-sm">{s.label}</span>
                  {s.requiresArt && <span className="text-[11px] whitespace-nowrap text-muted-foreground">ART/RRT</span>}
                </label>
              );
            })}
            <FieldError messages={err("services")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. A obra…</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {FLAGS.map((f) => {
              const on = flags[f.key];
              return (
                <label
                  key={f.key}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 rounded-lg border bg-background px-3 py-2.5 hover:border-stone-300",
                    on && "border-primary bg-[#f7fdf9]",
                    suggested.has(f.key) && "shadow-[inset_0_0_0_1px_var(--julia)]",
                  )}
                >
                  <input
                    type="checkbox"
                    name={f.key}
                    checked={on}
                    onChange={(e) => setFlags((prev) => ({ ...prev, [f.key]: e.target.checked }))}
                    className="mt-0.5 accent-primary"
                  />
                  <span className="flex-1 text-sm">{f.label}</span>
                  {f.requiresArt && <span className="text-[11px] whitespace-nowrap text-muted-foreground">ART/RRT</span>}
                </label>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Datas e executor</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plannedStart">Início previsto</Label>
              <Input id="plannedStart" name="plannedStart" type="date" defaultValue={initial.plannedStart} />
              <FieldError messages={err("plannedStart")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plannedEnd">Término previsto</Label>
              <Input id="plannedEnd" name="plannedEnd" type="date" defaultValue={initial.plannedEnd} />
              <FieldError messages={err("plannedEnd")} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="contractorName">Quem vai executar</Label>
              <Input id="contractorName" name="contractorName" defaultValue={initial.contractorName} />
              <p className="text-xs text-muted-foreground">
                Empresa ou pessoa responsável pela execução (não precisa ser o responsável técnico).
              </p>
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2.5 border-t">
            {state.error && <p className="mr-auto text-sm text-danger">{state.error}</p>}
            <Button asChild variant="outline">
              <Link href={cancelHref}>Cancelar</Link>
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : submitLabel}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-5">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Prévia</CardTitle>
            {services.length > 0 ? <RiskBadge level={preview.risk.level} /> : <span className="text-muted-foreground">—</span>}
          </CardHeader>
          <CardContent className="flex flex-col gap-3.5">
            <div>
              <div className="flex justify-between text-[13px] font-medium">
                <span>Pontuação</span>
                <span className="font-mono text-xs">{preview.risk.score} / 100</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${preview.risk.score}%` }} />
              </div>
            </div>
            <div
              className={cn(
                "rounded-lg border px-3 py-2.5 text-xs",
                preview.risk.requiresArt ? "border-[#fde68a] bg-[#fffbeb]" : "border-[#bbf7d0] bg-[#f0fdf4]",
              )}
            >
              {preview.risk.requiresArt ? (
                <>
                  <strong>⚠ Exige ART/RRT</strong>
                  <br />
                  Contrate um profissional habilitado antes de enviar.
                </>
              ) : (
                <strong>✓ Não exige ART/RRT</strong>
              )}
            </div>
            <div>
              <div className="mb-1.5 text-[13px] font-medium">Documentos que serão pedidos</div>
              <ul className="list-disc pl-4 text-xs">
                {preview.docs.length === 0 && <li className="text-muted-foreground">Nenhum obrigatório</li>}
                {preview.docs.map((d) => (
                  <li key={d}>{DOCUMENT_LABEL[d]}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-1.5 text-[13px] font-medium">Profissional a procurar</div>
              <ul className="list-disc pl-4 text-xs">
                {preview.risk.guidance.length === 0 && <li className="text-muted-foreground">—</li>}
                {preview.risk.guidance.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-muted-foreground">
              Prévia calculada pela tabela do condomínio. Ao salvar, a{" "}
              <strong className="text-julia">Julia-1</strong> analisa o contexto e pode <strong>acrescentar</strong>{" "}
              exigências (nunca remover).
            </p>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}
