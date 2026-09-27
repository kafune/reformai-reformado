"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-[18px] shrink-0 rounded-xs border-[1.5px] border-ink-300 bg-surface transition-colors outline-none focus-visible:ring-2 focus-visible:ring-green-400 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-green-700 data-[state=checked]:bg-green-700 data-[state=checked]:text-bone-50 aria-invalid:border-iron-500",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <CheckIcon className="size-3" strokeWidth={2.4} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
