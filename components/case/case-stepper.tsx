import { STATUS_LABEL, type CaseStatus } from "@/lib/rules/status";
import { cn } from "@/lib/utils";

const STEPS: CaseStatus[] = ["DRAFT", "UNDER_REVIEW", "APPROVED", "IN_PROGRESS", "COMPLETED"];

/** Índice do passo atual; CHANGES_REQUESTED fica no passo "Em análise". */
function currentIndex(status: CaseStatus): number {
  if (status === "CHANGES_REQUESTED") return 1;
  return STEPS.indexOf(status);
}

export function CaseStepper({ status }: { status: CaseStatus }) {
  const ended = status === "REJECTED" || status === "CANCELLED";
  const now = ended ? -1 : currentIndex(status);
  return (
    <ol className="flex overflow-x-auto">
      {STEPS.map((s, i) => (
        <li
          key={s}
          className={cn(
            "mr-1 min-w-[92px] flex-1 border-t-[3px] pt-2.5 text-xs font-medium text-muted-foreground",
            i < now && "border-primary text-foreground",
            i === now && "border-info text-info",
            i === now && status === "CHANGES_REQUESTED" && "border-warn text-warn",
          )}
        >
          {i === 1 && status === "CHANGES_REQUESTED" ? STATUS_LABEL.CHANGES_REQUESTED : STATUS_LABEL[s]}
        </li>
      ))}
    </ol>
  );
}
