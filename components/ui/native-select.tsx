import * as React from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/** `<select>` nativo com o visual do design system (funciona em formulários de server action). */
function NativeSelect({ className, size = "default", ...props }: Omit<React.ComponentProps<"select">, "size"> & { size?: "sm" | "default" }) {
  return (
    <div className={cn("relative", className)}>
      <select
        data-slot="native-select"
        className={cn(
          "w-full appearance-none rounded-sm border border-line-strong bg-surface pr-9 pl-3 text-ink-900 outline-none focus-visible:ring-2 focus-visible:ring-green-400 disabled:cursor-not-allowed disabled:opacity-50",
          size === "sm" ? "h-8 text-xs" : "h-10 text-base max-md:min-h-11 md:text-sm",
        )}
        {...props}
      />
      <Icon name="chev" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-500" />
    </div>
  );
}

export { NativeSelect };
