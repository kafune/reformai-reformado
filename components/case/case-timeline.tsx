import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelative } from "@/lib/format";
import { DOCUMENT_LABEL, isDocumentType } from "@/lib/rules/checklist";
import { STATUS_LABEL, type CaseStatus } from "@/lib/rules/status";
import { cn } from "@/lib/utils";

export type EventRow = {
  id: string;
  type: string;
  fromStatus: CaseStatus | null;
  toStatus: CaseStatus | null;
  message: string | null;
  data: unknown;
  createdAt: Date;
  user: { id: string; name: string } | null;
};

function docLabel(data: unknown): string {
  const type = (data as { type?: unknown } | null)?.type;
  return typeof type === "string" && isDocumentType(type) ? DOCUMENT_LABEL[type] : "documento";
}

/** Texto do evento na timeline. Quem: "Você", o nome, "Julia-1" ou "Sistema". */
export function describeEvent(e: EventRow, currentUserId: string): { who: string; text: string; kind: "default" | "julia" | "status" } {
  const who = e.type === "julia_decision" ? "Julia-1" : e.user ? (e.user.id === currentUserId ? "Você" : e.user.name) : "Sistema";
  const data = (e.data ?? {}) as Record<string, unknown>;
  switch (e.type) {
    case "status_changed":
      if (e.toStatus === "DRAFT") return { who, text: "criou a obra", kind: "status" };
      if (e.toStatus === "UNDER_REVIEW") return { who, text: e.fromStatus === "CHANGES_REQUESTED" ? "reenviou para análise" : "enviou para análise", kind: "status" };
      if (e.toStatus === "CHANGES_REQUESTED") return { who, text: `pediu correção${e.message ? `: ${e.message}` : ""}`, kind: "status" };
      if (e.toStatus === "APPROVED") return { who, text: `liberou a obra${e.message ? ` com condições: ${e.message}` : ""}`, kind: "status" };
      if (e.toStatus === "REJECTED") return { who, text: `recusou a obra${e.message ? `: ${e.message}` : ""}`, kind: "status" };
      if (e.toStatus === "IN_PROGRESS") return { who, text: "informou o início da obra", kind: "status" };
      if (e.toStatus === "COMPLETED") return { who, text: "confirmou a conclusão da obra", kind: "status" };
      if (e.toStatus === "CANCELLED") return { who, text: "cancelou a obra", kind: "status" };
      return { who, text: `mudou o status para ${e.toStatus ? STATUS_LABEL[e.toStatus] : "?"}`, kind: "status" };
    case "case_updated":
      return { who, text: "editou a obra (risco recalculado)", kind: "default" };
    case "document_uploaded":
      return { who, text: `anexou ${docLabel(data)}`, kind: "default" };
    case "document_reviewed":
      return { who, text: `${data.status === "APPROVED" ? "aprovou" : "reprovou"} ${docLabel(data)}${e.message ? `: ${e.message}` : ""}`, kind: "default" };
    case "professional_updated":
      return { who, text: "informou o responsável técnico", kind: "default" };
    case "art_confirmed":
      return { who, text: "conferiu que a ART/RRT cobre os serviços declarados", kind: "default" };
    case "comment":
      return { who, text: e.message ?? "comentou", kind: "default" };
    case "ai_suggestion":
      return { who: "IA", text: e.message ?? "deixou observações", kind: "default" };
    case "julia_decision":
      return { who, text: e.message ?? "tomou uma decisão", kind: "julia" };
    default:
      return { who, text: e.message ?? e.type, kind: "default" };
  }
}

export function CaseTimeline({ events, currentUserId }: { events: EventRow[]; currentUserId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col">
          {events.map((e, i) => {
            const d = describeEvent(e, currentUserId);
            return (
              <li key={e.id} className="relative grid grid-cols-[18px_1fr] gap-2.5 pb-3.5">
                {i < events.length - 1 && <span className="absolute top-[18px] bottom-0 left-2 w-px bg-border" aria-hidden />}
                <span
                  className={cn(
                    "mt-1.5 ml-1 size-2.5 rounded-full bg-stone-300",
                    d.kind === "julia" && "bg-julia",
                    d.kind === "status" && "bg-primary",
                  )}
                  aria-hidden
                />
                <div>
                  <div className="text-xs">
                    <strong>{d.who}</strong> {d.text}
                  </div>
                  <div className="text-[11.5px] text-muted-foreground">{formatRelative(e.createdAt)}</div>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
