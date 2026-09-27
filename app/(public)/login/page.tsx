import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/obras");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(1200px_500px_at_50%_-10%,#dcfce7_0%,transparent_60%)] px-4 py-6">
      <Card className="w-full max-w-[420px] gap-5 py-5">
        <CardHeader className="px-5">
          <div className="mb-2 flex items-center gap-2.5 text-[15px] font-bold">
            <span className="grid size-7 place-items-center rounded-lg bg-primary text-sm text-primary-foreground">
              R
            </span>
            ReformAI
          </div>
          <CardTitle className="text-[22px] tracking-tight">Entrar</CardTitle>
          <CardDescription>Acompanhe e autorize reformas no seu condomínio.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 px-5">
          <LoginForm />
          <p className="border-t pt-4 text-xs text-muted-foreground">
            É morador e ainda não tem conta? Use o QR code ou link que o síndico divulgou no
            condomínio.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
