import type { Metadata } from "next";

import { DeleteAccountForm, PasswordForm, ProfileForm } from "@/components/account/account-forms";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-5">
          <ProfileForm initial={{ name: user.name, phone: user.phone, email: user.email }} />
          <PasswordForm />
          <DeleteAccountForm />
        </div>
        <aside className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Seus dados (LGPD)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Consentimento registrado em {user.lgpdConsentAt ? formatDate(user.lgpdConsentAt) : "—"}. Você pode baixar tudo o que a
                plataforma guarda sobre você em um arquivo JSON.
              </p>
              <Button asChild variant="outline">
                <a href="/api/me/export" download>
                  Baixar meus dados
                </a>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
