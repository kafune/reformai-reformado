import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export type Crumb = string | { label: string; href: string };

/** Cabeçalho de página ("TopBar") — breadcrumb, título, subtítulo, badges e ações. */
export function PageHeader({
  title,
  subtitle,
  breadcrumb,
  badges,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  breadcrumb?: Crumb[];
  /** Chips ao lado do título (status, risco). */
  badges?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-divider bg-paper px-4 py-4 md:px-8 md:py-5">
      <div className="min-w-0">
        {breadcrumb && breadcrumb.length > 0 && (
          <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs">
            {breadcrumb.map((b, i) => {
              const last = i === breadcrumb.length - 1;
              const label = typeof b === "string" ? b : b.label;
              return (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <Icon name="chevR" size={11} className="text-ink-300" />}
                  {typeof b === "string" ? (
                    <span className={last ? "text-ink-700" : "text-ink-400"}>{label}</span>
                  ) : (
                    <Link href={b.href} className={cn("hover:underline", last ? "text-ink-700" : "text-ink-400")}>
                      {label}
                    </Link>
                  )}
                </span>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-snug text-ink-900">{title}</h1>
          {badges}
        </div>
        {subtitle && <div className="mt-1 text-sm text-ink-500">{subtitle}</div>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{children}</div>}
    </header>
  );
}

/** Área de conteúdo da página, abaixo do cabeçalho. */
export function PageBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex flex-1 flex-col gap-5 px-4 py-6 md:px-8 md:pb-12", className)}>{children}</div>;
}

/** Nota discreta de rodapé: "A plataforma não emite ART/RRT." */
export function Disclaimer({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-bone-100 px-3 py-2.5">
      <Icon name="shield" size={14} className="mt-0.5 shrink-0 text-ink-400" />
      <p className="text-[11px] leading-relaxed text-ink-500">{children}</p>
    </div>
  );
}
