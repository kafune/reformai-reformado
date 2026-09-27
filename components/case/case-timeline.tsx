import { Eyebrow } from "@/components/ui/eyebrow";
import { formatDate, formatRelative } from "@/lib/format";
import { DOCUMENT_LABEL, isDocumentType } from "@/lib/rules/checklist";
import { STATUS_LABEL, type CaseStatus } from "@/lib/rules/status";

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
    case "completion_reported":
      return { who, text: `informou a conclusão da obra${typeof data.completedAt === "string" ? ` em ${formatDate(new Date(data.completedAt))}` : ""}`, kind: "default" };
    case "comment":
      return { who, text: e.message ?? "comentou", kind: "default" };
    case "ai_suggestion":
      return { who: "IA", text: e.message ?? "deixou observações", kind: "default" };
    case "julia_decision":
      return { who, text: e.message ?? (data.kind === "release" ? "recomendou uma decisão" : "classificou a obra"), kind: "julia" };
    default:
      return { who, text: e.message ?? e.type, kind: "default" };
  }
}

const DOT: Record<"default" | "julia" | "status", string> = {
  default: "var(--rai-ink-300)",
  julia: "var(--julia)",
  status: "var(--rai-green-600)",
};

/** Histórico da obra no estilo da timeline do sistema: nós com anel, hora em mono. */
export function CaseTimeline({ events, currentUserId }: { events: EventRow[]; currentUserId: string }) {
  return (
    <div className="rounded-md bg-surface p-5 shadow-hair">
      <Eyebrow className="mb-4">Histórico</Eyebrow>
      {events.length === 0 && <p className="text-xs text-ink-400">Nenhum evento registrado.</p>}
      <div className="relative pl-6">
        <div className="absolute top-2 bottom-2 left-[6px] w-px bg-line-strong" aria-hidden />
        {events.map((e, i) => {
          const d = describeEvent(e, currentUserId);
          const color = DOT[d.kind];
          const current = i === 0;
          return (
            <div key={e.id} className="relative pb-4 last:pb-0">
              <span
                className="absolute top-1 left-[-24px] size-[13px] rounded-full"
                style={{
                  background: current ? color : "var(--rai-surface)",
                  boxShadow: `0 0 0 2px var(--rai-surface), 0 0 0 ${current ? 4 : 3}px ${color}`,
                }}
                aria-hidden
              />
              <div className="flex justify-between gap-3">
                <div className="min-w-0 text-xs leading-relaxed text-ink-700">
                  <span className={d.kind === "julia" ? "font-semibold text-julia" : "font-semibold text-ink-900"}>{d.who}</span> {d.text}
                </div>
                <div className="font-mono text-[10px] whitespace-nowrap text-ink-400">{formatRelative(e.createdAt)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
