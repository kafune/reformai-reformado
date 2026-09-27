import { Button } from "@/components/ui/button";
import { NavLinks, type NavItem } from "@/components/nav-links";
import { logout } from "@/lib/actions/auth";
import { initials } from "@/lib/format";

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-1.5 text-[15px] font-bold">
      <span className="grid size-7 place-items-center rounded-lg bg-primary text-sm text-primary-foreground">
        R
      </span>
      ReformAI
    </div>
  );
}

export function AppShell({
  user,
  items,
  children,
}: {
  user: { name: string; subtitle: string };
  items: NavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen flex-col gap-4 border-r bg-background px-3.5 py-4 md:flex">
        <Brand />
        <NavLinks items={items} />
        <div className="mt-auto flex items-center gap-2.5 border-t pt-3.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
            {initials(user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{user.name}</div>
            <div className="truncate text-xs text-muted-foreground">{user.subtitle}</div>
          </div>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm" title="Sair">
              Sair
            </Button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Topbar (mobile) */}
        <header className="flex flex-col border-b bg-background md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Brand />
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                {initials(user.name)}
              </span>
              <form action={logout}>
                <Button type="submit" variant="ghost" size="sm">
                  Sair
                </Button>
              </form>
            </div>
          </div>
          <NavLinks items={items} className="flex-row gap-1 overflow-x-auto px-3 pb-2 [&>a]:shrink-0" />
        </header>

        <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-4 py-5 md:px-8 md:py-7 md:pb-16">
          {children}
        </main>
      </div>
    </div>
  );
}
