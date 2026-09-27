"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: string; count?: number };

export function NavLinks({ items, className }: { items: NavItem[]; className?: string }) {
  const pathname = usePathname();
  return (
    <nav className={cn("flex flex-col gap-0.5", className)}>
      {items.map((item) => {
        const active =
          item.href === "/obras"
            ? pathname === "/obras" || (pathname.startsWith("/obras/") && !pathname.startsWith("/obras/nova"))
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
              active && "bg-primary-soft text-primary hover:bg-primary-soft hover:text-primary",
            )}
          >
            <span className="w-4 text-center" aria-hidden>
              {item.icon}
            </span>
            {item.label}
            {item.count ? (
              <span className="ml-auto rounded-full bg-warn-soft px-1.5 text-[11.5px] font-semibold text-warn">
                {item.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
