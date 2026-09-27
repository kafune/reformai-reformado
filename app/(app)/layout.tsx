import { AppShell, type NavItem } from "@/components/app-shell";
import { Icon } from "@/components/ui/icon";
import { logout } from "@/lib/actions/auth";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { caseFilterForUser } from "@/lib/permissions";
import { unitShort } from "@/lib/format";

const AVATAR_COLOR: Record<CurrentUser["role"], string> = {
  RESIDENT: "var(--rai-clay-500)",
  SYNDIC: "var(--rai-azulejo-600)",
  ADMIN: "var(--rai-green-600)",
};

async function navFor(user: CurrentUser): Promise<{ items: NavItem[]; brandLabel: string; brandSub: string; sub: string }> {
  if (user.role === "RESIDENT") {
    const unit = await db.unit.findFirst({ where: { residentId: user.id } });
    return {
      brandLabel: user.condominium?.name ?? "Condomínio",
      brandSub: "Condomínio",
      sub: unit ? `Morador · ${unitShort(unit)}` : "Morador",
      items: [
        { href: "/obras", label: "Minhas obras", icon: "list" },
        { href: "/obras/nova", label: "Nova obra", icon: "plus" },
        { href: "/conta", label: "Minha conta", icon: "user" },
      ],
    };
  }

  const pending = await db.case.count({ where: { ...caseFilterForUser(user), status: "UNDER_REVIEW" } });

  if (user.role === "SYNDIC") {
    return {
      brandLabel: user.condominium?.name ?? "Sem condomínio",
      brandSub: "Condomínio",
      sub: "Síndico",
      items: [
        { href: "/obras", label: "Obras", icon: "list", count: pending },
        { href: "/art", label: "Painel ART/RRT", icon: "shield" },
        { href: `/admin/condominios/${user.condominiumId}`, label: "Cadastro de moradores", icon: "qr" },
        { href: "/conta", label: "Minha conta", icon: "user" },
      ],
    };
  }

  return {
    brandLabel: "Administradora",
    brandSub: "Todos os condomínios",
    sub: "Administradora",
    items: [
      { href: "/obras", label: "Obras", icon: "list", count: pending },
      { href: "/art", label: "Painel ART/RRT", icon: "shield" },
      { href: "/admin/condominios", label: "Condomínios", icon: "building" },
      { href: "/admin/usuarios", label: "Usuários", icon: "users" },
      { href: "/conta", label: "Minha conta", icon: "settings" },
    ],
  };
}

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  const { items, brandLabel, brandSub, sub } = await navFor(user);
  return (
    <AppShell
      nav={items}
      brandLabel={brandLabel}
      brandSub={brandSub}
      user={{ name: user.name, sub, color: AVATAR_COLOR[user.role] }}
      footer={
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm text-bone-400 transition-colors hover:bg-white/5 hover:text-bone-50"
          >
            <Icon name="logout" />
            Sair
          </button>
        </form>
      }
    >
      {children}
    </AppShell>
  );
}
