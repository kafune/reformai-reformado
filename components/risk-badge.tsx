import { cn } from "@/lib/utils";
import { RISK_LABEL, type RiskLevel } from "@/lib/rules/risk";

const TOKEN: Record<RiskLevel, string> = { LOW: "low", MEDIUM: "medium", HIGH: "high", CRITICAL: "critical" };
const CODE: Record<RiskLevel, string> = { LOW: "LOW", MEDIUM: "MED", HIGH: "HIGH", CRITICAL: "CRIT" };

/** Selo de risco: etiqueta mono sólida + rótulo, tokens --risk-* (app/globals.css). */
export function RiskBadge({
  level,
  score,
  size = "md",
  className,
}: {
  level: RiskLevel;
  score?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const t = TOKEN[level];
  const sm = size === "sm";
  return (
    <span
      className={cn("inline-flex shrink-0 items-stretch overflow-hidden rounded-sm whitespace-nowrap", className)}
      style={{
        background: `var(--risk-${t}-bg)`,
        color: `var(--risk-${t}-fg)`,
        boxShadow: `inset 0 0 0 1px var(--risk-${t}-edge)`,
      }}
      title={`Risco ${RISK_LABEL[level].toLowerCase()}${score !== undefined ? ` · ${score}/100` : ""}`}
    >
      <span
        className="flex items-center font-mono font-medium text-bone-50"
        style={{ background: `var(--risk-${t}-edge)`, padding: sm ? "2px 7px" : "4px 9px", fontSize: sm ? 10 : 11, letterSpacing: ".08em" }}
      >
        {CODE[level]}
      </span>
      <span className="flex items-center gap-1.5 font-medium whitespace-nowrap" style={{ padding: sm ? "2px 8px" : "4px 10px", fontSize: sm ? 11 : 12 }}>
        Risco {RISK_LABEL[level].toLowerCase()}
        {score !== undefined && (
          <span className="font-mono opacity-70" style={{ fontSize: sm ? 10 : 11 }}>
            · {score}/100
          </span>
        )}
      </span>
    </span>
  );
}
