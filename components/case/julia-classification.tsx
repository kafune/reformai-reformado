import { Icon } from "@/components/ui/icon";
import type { StoredClassification } from "@/lib/decision";
import { DOCUMENT_LABEL, isDocumentType } from "@/lib/rules/checklist";
import { RISK_LABEL, type RiskLevel } from "@/lib/rules/risk";
import { cn } from "@/lib/utils";

/** Selo da Julia-1: quadrado violeta com a faísca. */
export function JuliaMark({ className = "" }: { className?: string }) {
  return (
    <span className={cn("grid size-[22px] shrink-0 place-items-center rounded-sm bg-julia text-bone-50", className)} aria-hidden>
      <Icon name="sparkle" size={13} />
    </span>
  );
}

/** Caixa violeta: o que a Julia-1 decidiu na classificação, sempre com o motivo (PLAN.md §14). */
export function JuliaClassification({ stored, level }: { stored: StoredClassification; level: RiskLevel }) {
  const { addedByJulia } = stored;
  const docs = addedByJulia.docs.filter(isDocumentType).map((d) => DOCUMENT_LABEL[d]);
  const added: string[] = [];
  if (addedByJulia.level) added.push(`subiu o risco para ${RISK_LABEL[level].toUpperCase()}`);
  if (addedByJulia.requiresArt) added.push("passou a exigir ART/RRT");
  if (docs.length) added.push(`acrescentou ${docs.length === 1 ? "1 documento" : `${docs.length} documentos`}`);

  return (
    <div className="rounded-md border border-julia-border bg-julia-bg px-4 py-3.5">
      <div className="mb-2 flex items-center gap-2.5">
        <JuliaMark />
        <div>
          <div className="text-sm font-semibold text-julia">Classificação da Julia-1</div>
          <div className="font-mono text-[10px] tracking-caps text-julia-text/70 uppercase">só aumenta exigências, nunca reduz</div>
        </div>
      </div>
      <p className="text-xs text-ink-700">
        {added.length > 0 ? (
          <>
            {!addedByJulia.level && (
              <>
                Manteve o risco <strong>{RISK_LABEL[level].toUpperCase()}</strong> e{" "}
              </>
            )}
            <strong>{added.join(", ")}</strong>
            {docs.length > 0 && ":"}
          </>
        ) : (
          <>
            Concorda com a tabela: risco <strong>{RISK_LABEL[level].toUpperCase()}</strong>, sem acréscimos.
          </>
        )}
      </p>
      {docs.length > 0 && (
        <ul className="my-1.5 list-disc pl-4 text-xs text-ink-700">
          {docs.map((d) => (
            <li key={d}>
              <strong>{d}</strong>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-xs text-julia-text">Motivo: {stored.justification || "sem detalhes"}.</p>
    </div>
  );
}
