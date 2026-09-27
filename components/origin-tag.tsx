import { cn } from "@/lib/utils";

/** Origem de cada exigência: "pela tabela" ou "pela Julia-1" (PLAN.md §14). */
export function OriginTag({ origin, reason }: { origin: "rules" | "julia"; reason?: string }) {
  return (
    <span
      title={reason}
      className={cn(
        "inline-block rounded px-1.5 text-[11px] font-semibold whitespace-nowrap",
        origin === "julia" ? "bg-julia-soft text-julia" : "bg-muted text-muted-foreground",
      )}
    >
      {origin === "julia" ? "pela Julia-1" : "pela tabela"}
    </span>
  );
}
