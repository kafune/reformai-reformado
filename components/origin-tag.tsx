import { cn } from "@/lib/utils";

/** Origem de cada exigência: "pela tabela" ou "pela Julia-1" (PLAN.md §14). */
export function OriginTag({ origin, reason }: { origin: "rules" | "julia"; reason?: string }) {
  return (
    <span
      title={reason}
      className={cn(
        "inline-block rounded-xs px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide whitespace-nowrap uppercase",
        origin === "julia" ? "bg-julia-soft text-julia" : "bg-bone-200 text-ink-500",
      )}
    >
      {origin === "julia" ? "pela Julia-1" : "pela tabela"}
    </span>
  );
}
