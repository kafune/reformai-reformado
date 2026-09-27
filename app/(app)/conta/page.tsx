import type { Metadata } from "next";

import { DeleteAccountForm, PasswordForm, ProfileForm } from "@/components/account/account-forms";
import { PageBody, PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Icon } from "@/components/ui/icon";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Minha conta" };

const ROLE_LABEL: Record<string, string> = { ADMIN: "Administradora", SYNDIC: "Síndico", RESIDENT: "Morador" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  return (
    <>
      <PageHeader
        title="Minha conta"
        subtitle={`${ROLE_LABEL[user.role] ?? user.role}${user.condominium ? ` · ${user.condominium.name}` : ""} · desde ${formatDate(user.createdAt)}`}
      />
      <PageBody>
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex flex-col gap-5">
            <ProfileForm initial={{ name: user.name, phone: user.phone, email: user.email }} />
            <PasswordForm />
            <DeleteAccountForm />
          </div>
          <aside className="flex flex-col gap-4">
            <div className="rounded-md bg-surface p-5 shadow-hair">
              <div className="flex items-center gap-3">
                <Avatar name={user.name} size={44} />
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold tracking-snug text-ink-900">{user.name}</div>
                  <div className="truncate text-xs text-ink-500">{user.email}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <Badge variant="neutral">{ROLE_LABEL[user.role] ?? user.role}</Badge>
                {user.condominium && <Badge variant="green">{user.condominium.name}</Badge>}
              </div>
            </div>

            <Card>
              <CardHeader>
                <Eyebrow>LGPD</Eyebrow>
                <CardTitle className="mt-1">Seus dados</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-ink-500">
                  Consentimento registrado em {user.lgpdConsentAt ? formatDate(user.lgpdConsentAt) : "—"}. Você pode baixar tudo o que a plataforma
                  guarda sobre você em um arquivo JSON.
                </p>
                <Button asChild variant="outline">
                  <a href="/api/me/export" download>
                    <Icon name="download" />
                    Baixar meus dados
                  </a>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
