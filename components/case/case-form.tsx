"use client";

import Link from "next/link";
import { useActionState, useMemo, useState, useTransition } from "react";

import { FieldError } from "@/components/field-error";
import { RiskBadge } from "@/components/risk-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Icon } from "@/components/ui/icon";
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

/** Cartão-checkbox de serviço/flag: contorno verde quando marcado, anel violeta quando sugerido pela Julia-1. */
function OptionTile({
  on,
  suggested,
  children,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & { on: boolean; suggested: boolean; children: React.ReactNode }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-2.5 rounded-sm bg-surface px-3 py-2.5 shadow-hair transition-colors hover:bg-bone-50",
        on && "bg-green-50 shadow-[inset_0_0_0_1.5px_var(--rai-green-600)]",
        suggested && "shadow-[inset_0_0_0_1.5px_var(--julia)]",
      )}
    >
      <input type="checkbox" className="mt-0.5 accent-green-700" checked={on} {...input} />
      <span className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-900">{children}</span>
    </label>
  );
}

function ArtTag() {
  return <span className="rounded-xs bg-bone-200 px-1.5 py-0.5 font-mono text-[10px] tracking-wide whitespace-nowrap text-ink-500 uppercase">ART/RRT</span>;
}

function SectionTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="flex size-6 items-center justify-center rounded-full bg-ink-900 font-mono text-[11px] font-semibold text-bone-50">{n}</span>
      {children}
    </span>
  );
}

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

  const toggleService = (key: ServiceKey, on: boolean) => setServices((prev) => (on ? [...prev, key] : prev.filter((k) => k !== key)));

  return (
    <form action={formAction} className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader>
            <CardTitle>
              <SectionTitle n={1}>Descreva a obra</SectionTitle>
            </CardTitle>
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
                  <Icon name="sparkle" />
                  {suggesting ? "Sugerindo…" : "Sugerir serviços a partir da descrição"}
                </Button>
                <span className="text-xs text-ink-500">A sugestão só marca as opções abaixo — você confirma.</span>
                {suggestError && <span className="basis-full text-xs text-iron-600">{suggestError}</span>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>
              <SectionTitle n={2}>Serviços</SectionTitle>
            </CardTitle>
            <span className="font-mono text-[10px] tracking-caps text-ink-400 uppercase">
              {services.length} selecionado{services.length === 1 ? "" : "s"}
            </span>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SERVICES.map((s) => (
              <OptionTile
                key={s.key}
                name="services"
                value={s.key}
                on={services.includes(s.key)}
                suggested={suggested.has(s.key)}
                onChange={(e) => toggleService(s.key, e.target.checked)}
              >
                <span className="flex-1">{s.label}</span>
                {s.requiresArt && <ArtTag />}
              </OptionTile>
            ))}
            <FieldError messages={err("services")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <SectionTitle n={3}>A obra…</SectionTitle>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {FLAGS.map((f) => (
              <OptionTile
                key={f.key}
                name={f.key}
                on={flags[f.key]}
                suggested={suggested.has(f.key)}
                onChange={(e) => setFlags((prev) => ({ ...prev, [f.key]: e.target.checked }))}
              >
                <span className="flex-1">{f.label}</span>
                {f.requiresArt && <ArtTag />}
              </OptionTile>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <SectionTitle n={4}>Datas e executor</SectionTitle>
            </CardTitle>
            <CardDescription>Empresa ou pessoa que executa (não precisa ser o responsável técnico).</CardDescription>
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
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2.5 border-t border-divider">
            {state.error && <p className="mr-auto text-sm text-iron-600">{state.error}</p>}
            <Button asChild variant="ghost">
              <Link href={cancelHref}>Cancelar</Link>
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : submitLabel}
              <Icon name="arrow" />
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Prévia (rail direito) — o e2e procura `aside.lg:sticky` */}
      <aside className="lg:sticky lg:top-5">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <Eyebrow>Prévia</Eyebrow>
              <CardTitle className="mt-1">Classificação</CardTitle>
            </div>
            {services.length > 0 ? <RiskBadge level={preview.risk.level} size="sm" /> : <span className="text-xs text-ink-300">sem serviços</span>}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <div className="flex justify-between text-xs">
                <span className="font-medium text-ink-700">Pontuação</span>
                <span className="font-mono text-ink-500">{preview.risk.score} / 100</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-bone-100">
                <div className="h-full rounded-full bg-green-600 transition-[width] duration-300 ease-rai" style={{ width: `${preview.risk.score}%` }} />
              </div>
            </div>
            <div
              className={cn(
                "flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-xs",
                preview.risk.requiresArt ? "border-ochre-300 bg-ochre-50 text-ink-800" : "border-green-200 bg-green-50 text-ink-800",
              )}
            >
              <Icon name={preview.risk.requiresArt ? "alert" : "check"} size={14} className={cn("mt-0.5 shrink-0", preview.risk.requiresArt ? "text-ochre-700" : "text-green-700")} />
              {preview.risk.requiresArt ? (
                <span>
                  <strong>Exige ART/RRT</strong>
                  <br />
                  Contrate um profissional habilitado antes de enviar.
                </span>
              ) : (
                <strong>Não exige ART/RRT</strong>
              )}
            </div>
            <div>
              <Eyebrow className="mb-1.5">Documentos que serão pedidos</Eyebrow>
              <ul className="flex flex-col gap-1 text-xs text-ink-700">
                {preview.docs.length === 0 && <li className="text-ink-400">Nenhum obrigatório</li>}
                {preview.docs.map((d) => (
                  <li key={d} className="flex items-center gap-1.5">
                    <Icon name="doc" size={12} className="text-ink-400" />
                    {DOCUMENT_LABEL[d]}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <Eyebrow className="mb-1.5">Profissional a procurar</Eyebrow>
              <ul className="flex flex-col gap-1 text-xs text-ink-700">
                {preview.risk.guidance.length === 0 && <li className="text-ink-400">—</li>}
                {preview.risk.guidance.map((g) => (
                  <li key={g} className="flex items-start gap-1.5">
                    <Icon name="user" size={12} className="mt-0.5 text-ink-400" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
            <p className="border-t border-divider pt-3 text-[11px] leading-relaxed text-ink-500">
              Prévia calculada pela tabela do condomínio. Ao salvar, a <strong className="text-julia">Julia-1</strong> analisa o contexto e pode{" "}
              <strong>acrescentar</strong> exigências (nunca remover).
            </p>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}
