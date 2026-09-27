import { Badge } from "@/components/ui/badge";
import type { DocStatus } from "@/lib/rules/status";

export const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  PENDING: "Aguardando conferência",
  APPROVED: "Aprovado",
  REJECTED: "Reprovado",
};

const VARIANT: Record<DocStatus, "azulejo" | "green" | "iron"> = {
  PENDING: "azulejo",
  APPROVED: "green",
  REJECTED: "iron",
};

export function DocStatusBadge({ status }: { status: DocStatus }) {
  return (
    <Badge variant={VARIANT[status]} dot>
      {DOC_STATUS_LABEL[status]}
    </Badge>
  );
}
