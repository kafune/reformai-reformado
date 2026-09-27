"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/actions/state";

/** Botão que chama uma server action já "bound" (sem formulário), com confirmação opcional. */
export function ActionButton({
  action,
  children,
  confirm,
  variant = "outline",
  size = "sm",
  className,
}: {
  action: () => Promise<ActionState>;
  children: React.ReactNode;
  confirm?: string;
  variant?: "default" | "outline" | "ghost" | "destructive" | "julia" | "secondary";
  size?: "sm" | "default";
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => {
            setError(null);
            try {
              const r = await action();
              if (r.error) setError(r.error);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Não foi possível concluir.");
            }
          });
        }}
      >
        {pending ? "…" : children}
      </Button>
      {error && <span className="text-xs text-iron-600">{error}</span>}
    </span>
  );
}
