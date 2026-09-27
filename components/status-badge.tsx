import { cn } from "@/lib/utils";
import { STATUS_LABEL, type CaseStatus } from "@/lib/rules/status";

const TOKEN: Record<CaseStatus, string> = {
  DRAFT: "draft",
  UNDER_REVIEW: "under-review",
  CHANGES_REQUESTED: "changes-requested",
  APPROVED: "approved",
  REJECTED: "rejected",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

/** Chip de status da obra: ponto + rótulo, cores dos tokens --status-* (app/globals.css). */
export function StatusBadge({ status, className }: { status: CaseStatus; className?: string }) {
  const t = TOKEN[status];
  return (
    <span
      data-slot="badge"
      className={cn("inline-flex items-center gap-2 rounded-full py-1 pr-3 pl-2.5 text-xs font-medium whitespace-nowrap", className)}
      style={{ background: `var(--status-${t}-bg)`, color: `var(--status-${t}-fg)` }}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}
