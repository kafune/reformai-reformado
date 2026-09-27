import * as React from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const inputClass =
  "h-10 w-full min-w-0 rounded-sm border border-line-strong bg-surface px-3 py-1 text-base text-ink-900 transition-[color,box-shadow] outline-none placeholder:text-ink-300 read-only:bg-bone-100 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm max-md:min-h-11 focus-visible:ring-2 focus-visible:ring-green-400 aria-invalid:border-iron-500 aria-invalid:ring-iron-300";

function Input({ className, type, icon, ...props }: React.ComponentProps<"input"> & { icon?: IconName }) {
  if (!icon) {
    return <input type={type} data-slot="input" className={cn(inputClass, className)} {...props} />;
  }
  return (
    <div className="relative">
      <Icon name={icon} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-400" />
      <input type={type} data-slot="input" className={cn(inputClass, "pl-9", className)} {...props} />
    </div>
  );
}

export { Input, inputClass };
