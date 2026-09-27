import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";

export type StatAccent = "green" | "ochre" | "azulejo" | "clay" | "iron";

/** Cartão de indicador: rótulo mono-caps, número grande tabular e um ponto de cor. */
export function StatCard({
  label,
  value,
  hint,
  accent = "green",
  alarm = false,
  className,
}: {
  label: string;
  value: number | string;
  hint?: string;
  accent?: StatAccent;
  /** Destaque de alerta (ferro) quando o valor exige ação. */
  alarm?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg p-5 shadow-hair",
        alarm ? "bg-iron-100 shadow-[inset_0_0_0_1px_var(--rai-iron-300)]" : "bg-surface",
        className,
      )}
    >
      <Eyebrow className={alarm ? "text-iron-600" : undefined}>{label}</Eyebrow>
      <div className={cn("mt-2 font-mono text-3xl font-semibold tracking-tight tabular-nums", alarm ? "text-iron-700" : "text-ink-900")}>
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-xs" style={{ color: alarm ? "var(--rai-iron-600)" : `var(--rai-${accent}-700)` }}>
          {hint}
        </div>
      )}
      <span
        className="absolute right-4 bottom-3.5 size-2 rounded-full opacity-40"
        style={{ background: `var(--rai-${alarm ? "iron" : accent}-500)` }}
        aria-hidden
      />
    </div>
  );
}
