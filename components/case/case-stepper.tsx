import { Icon } from "@/components/ui/icon";
import { STATUS_LABEL, type CaseStatus } from "@/lib/rules/status";
import { cn } from "@/lib/utils";

const STEPS: CaseStatus[] = ["DRAFT", "UNDER_REVIEW", "APPROVED", "IN_PROGRESS", "COMPLETED"];

/** Índice do passo atual; CHANGES_REQUESTED fica no passo "Em análise". */
function currentIndex(status: CaseStatus): number {
  if (status === "CHANGES_REQUESTED") return 1;
  return STEPS.indexOf(status);
}

/** Etapas da obra: barra fina no topo de cada passo, feito (verde) · atual (azulejo/ocre) · próximo (bone). */
export function CaseStepper({ status }: { status: CaseStatus }) {
  const ended = status === "REJECTED" || status === "CANCELLED";
  const now = ended ? -1 : currentIndex(status);
  const attention = status === "CHANGES_REQUESTED";
  return (
    <ol className="flex gap-1 overflow-x-auto" aria-label="Etapas da obra">
      {STEPS.map((s, i) => {
        const done = i < now;
        const current = i === now;
        return (
          <li
            key={s}
            className={cn(
              "min-w-[96px] flex-1 border-t-[3px] pt-2.5 font-mono text-[10px] font-medium tracking-caps uppercase",
              done && "border-green-600 text-green-800",
              current && !attention && "border-azulejo-600 text-azulejo-700",
              current && attention && "border-ochre-500 text-ochre-700",
              !done && !current && "border-bone-300 text-ink-400",
              ended && "border-ink-200 text-ink-300",
            )}
            aria-current={current ? "step" : undefined}
          >
            <span className="inline-flex items-center gap-1.5">
              {done && <Icon name="check" size={11} />}
              {i === 1 && attention ? STATUS_LABEL.CHANGES_REQUESTED : STATUS_LABEL[s]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
