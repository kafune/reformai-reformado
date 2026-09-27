import Link from "next/link";

import { RiskBadge } from "@/components/risk-badge";
import { StatusBadge } from "@/components/status-badge";
import type { RiskLevel } from "@/lib/rules/risk";
import type { CaseStatus } from "@/lib/rules/status";

/** Cartão de obra (lista do morador): protocolo mono, serviços, risco, status e data. */
export function CaseCard({
  href,
  protocol,
  title,
  subtitle,
  risk,
  score,
  status,
  updated,
  footer,
}: {
  href: string;
  protocol: string;
  title: string;
  subtitle?: string;
  risk: RiskLevel;
  score?: number;
  status: CaseStatus;
  updated?: string;
  /** Linha extra (ex.: situação da ART/RRT). */
  footer?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-md bg-surface p-[18px] shadow-hair transition-shadow duration-150 ease-rai hover:shadow-2"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-xs tracking-wide text-ink-500">{protocol}</div>
          <div className="mt-1 text-md font-semibold tracking-snug text-ink-900">{title}</div>
          {subtitle && <div className="mt-0.5 text-xs text-ink-500">{subtitle}</div>}
        </div>
        <RiskBadge level={risk} score={score} size="sm" />
      </div>
      {footer && <div className="text-xs text-ink-600">{footer}</div>}
      <div className="flex items-center justify-between border-t border-divider pt-3">
        <StatusBadge status={status} />
        {updated && <span className="font-mono text-xs text-ink-400">{updated}</span>}
      </div>
    </Link>
  );
}
