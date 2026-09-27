import { Badge } from "@/components/ui/badge";
import { ART_SITUATION_LABEL, type ArtSituation } from "@/lib/rules/art";

const VARIANT: Record<ArtSituation, "warn" | "info" | "ok" | "destructive"> = {
  MISSING: "warn",
  SENT: "info",
  APPROVED: "ok",
  REJECTED: "destructive",
};

export function ArtSituationBadge({ situation }: { situation: ArtSituation }) {
  return <Badge variant={VARIANT[situation]}>{ART_SITUATION_LABEL[situation]}</Badge>;
}
