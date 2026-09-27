import { Badge } from "@/components/ui/badge";
import { ART_SITUATION_LABEL, type ArtSituation } from "@/lib/rules/art";

const VARIANT: Record<ArtSituation, "ochre" | "azulejo" | "green" | "iron"> = {
  MISSING: "ochre",
  SENT: "azulejo",
  APPROVED: "green",
  REJECTED: "iron",
};

export function ArtSituationBadge({ situation }: { situation: ArtSituation }) {
  return (
    <Badge variant={VARIANT[situation]} dot>
      {ART_SITUATION_LABEL[situation]}
    </Badge>
  );
}
