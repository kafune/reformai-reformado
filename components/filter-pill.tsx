import Link from "next/link";

import { cn } from "@/lib/utils";

/** Pílula de filtro (link com query string): sólida (ink) quando ativa. */
export function FilterPill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
        active ? "bg-ink-900 text-bone-50" : "bg-surface text-ink-500 shadow-hair hover:bg-bone-100 hover:text-ink-900",
      )}
    >
      {children}
    </Link>
  );
}
