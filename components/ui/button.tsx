import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Botões do "Concreto Verde": cantos de 4px, verde-canteiro sólido no primário,
// contorno ink no secundário (outline), ferro no destrutivo, violeta na Julia-1.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm border font-medium transition-colors duration-150 ease-rai disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-green-400 aria-invalid:ring-iron-300 aria-invalid:border-iron-500",
  {
    variants: {
      variant: {
        default: "bg-green-700 text-bone-50 border-green-700 hover:bg-green-800 hover:border-green-800",
        outline: "bg-transparent text-ink-900 border-ink-900 hover:bg-ink-900 hover:text-bone-50",
        secondary: "bg-green-100 text-green-800 border-transparent hover:bg-green-200",
        ghost: "bg-transparent text-ink-700 border-transparent hover:bg-bone-200",
        destructive: "bg-transparent text-iron-700 border-iron-300 hover:bg-iron-100 hover:border-iron-500",
        link: "border-transparent text-green-700 underline-offset-4 hover:underline",
        julia: "bg-violet-100 text-violet-700 border-violet-300 hover:bg-violet-50",
      },
      size: {
        default: "h-10 px-4 text-sm max-md:min-h-11",
        sm: "h-8 px-3 text-sm gap-1.5",
        lg: "h-12 px-5 text-base gap-2.5",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
