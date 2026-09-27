import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, type CaseStatus } from "@/lib/rules/status";

const CLASSES: Record<CaseStatus, string> = {
  DRAFT: "bg-status-draft-soft text-status-draft",
  UNDER_REVIEW: "bg-status-review-soft text-status-review",
  CHANGES_REQUESTED: "bg-status-changes-soft text-status-changes",
  APPROVED: "bg-status-approved-soft text-status-approved",
  REJECTED: "bg-status-rejected-soft text-status-rejected",
  IN_PROGRESS: "bg-status-progress-soft text-status-progress",
  COMPLETED: "bg-status-done-soft text-status-done",
  CANCELLED: "bg-status-cancelled-soft text-status-cancelled",
};

export function StatusBadge({ status, className }: { status: CaseStatus; className?: string }) {
  return (
    <Badge className={cn(CLASSES[status], className)}>
      <span className="size-1.5 rounded-full bg-current opacity-80" aria-hidden />
      {STATUS_LABEL[status]}
    </Badge>
  );
}
