import { cn } from "@/lib/utils";
import { RISK_LABEL, type RiskLevel } from "@/lib/rules/risk";

const CLASSES: Record<RiskLevel, string> = {
  LOW: "bg-risk-low-soft text-risk-low",
  MEDIUM: "bg-risk-medium-soft text-risk-medium",
  HIGH: "bg-risk-high-soft text-risk-high",
  CRITICAL: "bg-risk-critical-soft text-risk-critical",
};

export function RiskBadge({
  level,
  score,
  className,
}: {
  level: RiskLevel;
  score?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold tracking-wide uppercase",
        CLASSES[level],
        className,
      )}
    >
      {RISK_LABEL[level]}
      {score !== undefined && <span className="ml-1 font-semibold opacity-80">· {score}</span>}
    </span>
  );
}
