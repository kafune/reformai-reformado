import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Tons do "Concreto Verde". Os nomes semânticos antigos (ok/warn/info/destructive)
// continuam valendo e apontam para o mesmo tom.
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-medium leading-tight w-fit whitespace-nowrap shrink-0 gap-1.5 [&>svg]:size-3 [&>svg]:pointer-events-none overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-green-700 text-bone-50",
        neutral: "bg-bone-200 text-ink-700",
        secondary: "bg-bone-200 text-ink-700",
        green: "bg-green-100 text-green-800",
        ok: "bg-green-100 text-green-800",
        ochre: "bg-ochre-100 text-ochre-700",
        warn: "bg-ochre-100 text-ochre-700",
        clay: "bg-clay-100 text-clay-600",
        iron: "bg-iron-100 text-iron-700",
        destructive: "bg-iron-100 text-iron-700",
        azulejo: "bg-azulejo-100 text-azulejo-700",
        info: "bg-azulejo-100 text-azulejo-700",
        violet: "bg-violet-100 text-violet-700",
        julia: "bg-violet-100 text-violet-700",
        inkSolid: "bg-ink-900 text-bone-50",
        outline: "shadow-hair text-ink-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  dot = false,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean; dot?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </Comp>
  );
}

export { Badge, badgeVariants };
