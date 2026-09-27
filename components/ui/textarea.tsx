import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-sm border border-line-strong bg-surface px-3 py-2 text-base text-ink-900 transition-[color,box-shadow] outline-none placeholder:text-ink-300 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:ring-2 focus-visible:ring-green-400",
        "aria-invalid:border-iron-500 aria-invalid:ring-iron-300",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
