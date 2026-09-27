import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// "Callouts" com a paleta do sistema: azulejo (info), ocre (atenção), verde (ok), ferro (perigo), violeta (Julia-1).
const alertVariants = cva(
  "relative w-full rounded-md border px-4 py-3.5 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-surface border-transparent shadow-hair text-ink-900",
        info: "bg-azulejo-50 border-azulejo-200 text-ink-900 [&>svg]:text-azulejo-700",
        warn: "bg-ochre-50 border-ochre-300 text-ink-900 [&>svg]:text-ochre-700",
        ok: "bg-green-50 border-green-200 text-ink-900 [&>svg]:text-green-700",
        danger: "bg-iron-50 border-iron-300 text-ink-900 [&>svg]:text-iron-600",
        julia: "bg-julia-bg border-julia-border text-ink-900 [&>svg]:text-julia",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("col-start-2 flex min-h-4 flex-wrap items-center gap-2 font-semibold tracking-snug", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("col-start-2 grid justify-items-start gap-1 text-sm text-ink-600 [&_p]:leading-relaxed", className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
