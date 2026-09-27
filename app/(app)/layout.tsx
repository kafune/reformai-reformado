import { AppShell } from "@/components/app-shell";
import type { NavItem } from "@/components/nav-links";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { caseFilterForUser } from "@/lib/permissions";
import { unitShort } from "@/lib/format";

async function navFor(user: CurrentUser): Promise<{ items: NavItem[]; subtitle: string }> {
  if (user.role === "RESIDENT") {
    const unit = await db.unit.findFirst({ where: { residentId: user.id } });
    return {
      subtitle: `Morador · ${unit ? unitShort(unit) : (user.condominium?.name ?? "")}`,
      items: [
        { href: "/obras", label: "Minhas obras", icon: "▦" },
        { href: "/obras/nova", label: "Nova obra", icon: "＋" },
        { href: "/conta", label: "Minha conta", icon: "◍" },
      ],
    };
  }

  const pending = await db.case.count({ where: { ...caseFilterForUser(user), status: "UNDER_REVIEW" } });

  if (user.role === "SYNDIC") {
    return {
      subtitle: `Síndico · ${user.condominium?.name ?? "sem condomínio"}`,
      items: [
        { href: "/obras", label: "Obras", icon: "▦", count: pending },
        { href: "/art", label: "Painel ART/RRT", icon: "◈" },
        { href: `/admin/condominios/${user.condominiumId}`, label: "Cadastro de moradores", icon: "⌗" },
        { href: "/conta", label: "Minha conta", icon: "◍" },
      ],
    };
  }

  return {
    subtitle: "Administradora",
    items: [
      { href: "/obras", label: "Obras", icon: "▦", count: pending },
      { href: "/art", label: "Painel ART/RRT", icon: "◈" },
      { href: "/admin/condominios", label: "Condomínios", icon: "⌂" },
      { href: "/admin/usuarios", label: "Usuários", icon: "◍" },
      { href: "/conta", label: "Minha conta", icon: "⚙" },
    ],
  };
}

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  const { items, subtitle } = await navFor(user);
  return (
    <AppShell user={{ name: user.name, subtitle }} items={items}>
      {children}
    </AppShell>
  );
}
