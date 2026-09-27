import { cn } from "@/lib/utils";

/** Rótulo mono-caps — assinatura tipográfica do sistema. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("font-mono text-xs font-medium tracking-caps text-ink-500 uppercase", className)}>{children}</div>
  );
}
