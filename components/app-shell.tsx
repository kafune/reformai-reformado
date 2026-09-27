"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Icon, type IconName } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  count?: number;
};

/** Item ativo = href que é o prefixo mais longo da rota atual ("/obras/nova" não acende "Obras"). */
function activeHref(items: NavItem[], pathname: string): string {
  return (
    items
      .filter((n) => pathname === n.href || pathname.startsWith(`${n.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? ""
  );
}

/**
 * Casca de aplicação — sidebar escura (ink-900) + área principal.
 * Mobile: a sidebar vira drawer acionado pelo botão da barra superior.
 */
export function AppShell({
  nav,
  brandLabel,
  brandSub,
  user,
  footer,
  children,
}: {
  nav: NavItem[];
  brandLabel: string;
  brandSub: string;
  user: { name: string; sub?: string; color?: string };
  /** Ex.: o formulário de sair (server action). */
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();
  const current = activeHref(nav, pathname);

  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[236px_minmax(0,1fr)]">
      {/* Barra superior — apenas mobile */}
      <div className="flex items-center justify-between border-b border-white/10 bg-ink-900 px-4 py-2.5 lg:hidden">
        <Link href="/obras" aria-label="Início">
          <Logo
            size={28}
            variant="lockup"
            color="var(--rai-bone-50)"
            accent="var(--rai-green-300)"
          />
        </Link>
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          aria-label="Abrir menu"
          className="flex size-11 items-center justify-center rounded-sm text-bone-100 hover:bg-white/5"
        >
          <Icon name="list" size={20} />
        </button>
      </div>

      {/* Overlay do drawer — apenas mobile */}
      {navOpen && (
        <div
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-40 bg-[var(--rai-overlay)] lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Coluna escura: no desktop estica na altura da página; o <aside> fica fixo na tela ao rolar. */}
      <div className="lg:bg-ink-900">
        <aside
          className={cn(
            "flex w-[236px] flex-col gap-2 bg-ink-900 px-4 pt-6 pb-5 text-bone-100",
            "fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-rai",
            "lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-auto lg:translate-x-0 lg:transition-none",
            navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          )}
        >
          <div className="flex items-center justify-between px-2 pb-5">
            <Link href="/obras" aria-label="Início">
              <Logo
                size={32}
                variant="lockup"
                color="var(--rai-bone-50)"
                accent="var(--rai-green-300)"
              />
            </Link>
            <button
              type="button"
              onClick={() => setNavOpen(false)}
              aria-label="Fechar menu"
              className="flex size-9 items-center justify-center rounded-sm text-bone-300 hover:bg-white/5 lg:hidden"
            >
              <Icon name="close" size={18} />
            </button>
          </div>

          {/* Identidade: condomínio ou administradora */}
          <div className="mb-2 border-b border-white/10 px-2 pb-3">
            <Eyebrow className="text-bone-400">{brandSub}</Eyebrow>
            <div className="mt-0.5 truncate text-sm font-medium text-bone-50">
              {brandLabel}
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {nav.map((n) => {
              const active = current === n.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setNavOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-[rgba(58,129,99,0.18)] font-medium text-green-300"
                      : "text-bone-200 hover:bg-white/5",
                  )}
                >
                  <Icon name={n.icon} />
                  <span className="flex-1 truncate">{n.label}</span>
                  {n.count ? (
                    <span className="rounded-full bg-ochre-500 px-1.5 font-mono text-[10px] font-semibold text-ink-900">
                      {n.count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2.5 border-t border-white/10 px-2 pt-3">
            <Avatar name={user.name} size={32} color={user.color} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-bone-50">
                {user.name}
              </div>
              {user.sub && (
                <div className="truncate text-xs text-bone-400">{user.sub}</div>
              )}
            </div>
          </div>

          {footer && <div className="px-2 pt-2">{footer}</div>}
        </aside>
      </div>

      <main className="flex min-w-0 flex-col">{children}</main>
    </div>
  );
}
