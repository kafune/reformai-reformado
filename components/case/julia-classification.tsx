import type { StoredClassification } from "@/lib/decision";
import { DOCUMENT_LABEL, isDocumentType } from "@/lib/rules/checklist";
import { RISK_LABEL, type RiskLevel } from "@/lib/rules/risk";

export function JuliaMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`grid size-[22px] shrink-0 place-items-center rounded-md bg-julia text-[11px] font-bold text-white ${className}`}
      aria-hidden
    >
      J1
    </span>
  );
}

/** Caixa roxa: o que a Julia-1 decidiu na classificação, sempre com o motivo (PLAN.md §14). */
export function JuliaClassification({ stored, level }: { stored: StoredClassification; level: RiskLevel }) {
  const { addedByJulia } = stored;
  const docs = addedByJulia.docs.filter(isDocumentType).map((d) => DOCUMENT_LABEL[d]);
  const added: string[] = [];
  if (addedByJulia.level) added.push(`subiu o risco para ${RISK_LABEL[level].toUpperCase()}`);
  if (addedByJulia.requiresArt) added.push("passou a exigir ART/RRT");
  if (docs.length) added.push(`acrescentou ${docs.length === 1 ? "1 documento" : `${docs.length} documentos`}`);

  return (
    <div className="rounded-lg border border-julia-border bg-[#faf8ff] px-4 py-3.5">
      <div className="mb-2 flex items-center gap-2 font-semibold text-julia">
        <JuliaMark />
        Classificação da Julia-1
      </div>
      <p className="text-xs">
        {added.length > 0 ? (
          <>
            {!addedByJulia.level && <>Manteve o risco <strong>{RISK_LABEL[level].toUpperCase()}</strong> e </>}
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
        <ul className="my-1.5 list-disc pl-4 text-xs">
          {docs.map((d) => (
            <li key={d}>
              <strong>{d}</strong>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-julia-text">Motivo: {stored.justification || "sem detalhes"}.</p>
    </div>
  );
}
