import { Badge } from "@/components/ui/badge";
import type { DocStatus } from "@/lib/rules/status";

export const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  PENDING: "Aguardando conferência",
  APPROVED: "Aprovado",
  REJECTED: "Reprovado",
};

const VARIANT: Record<DocStatus, "info" | "ok" | "destructive"> = {
  PENDING: "info",
  APPROVED: "ok",
  REJECTED: "destructive",
};

export function DocStatusBadge({ status }: { status: DocStatus }) {
  return <Badge variant={VARIANT[status]}>{DOC_STATUS_LABEL[status]}</Badge>;
}
