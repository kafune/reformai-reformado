import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";
import { auth } from "@/lib/auth";

export const metadata: Metadata = { title: "Entrar" };

const STEPS = [
  ["01", "Cadastre a obra", "O sistema diz se exige ART/RRT e quais documentos enviar."],
  ["02", "Anexe os documentos", "ART/RRT, memorial, projeto — só o que a obra pedir."],
  ["03", "Receba a liberação", "Síndico ou administradora confere e libera. Sempre uma decisão humana."],
] as const;

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/obras");

  return (
    <div className="min-h-screen lg:grid lg:h-screen lg:grid-cols-2 lg:overflow-hidden">
      {/* Esquerda — formulário */}
      <div className="flex flex-col overflow-y-auto bg-paper px-6 py-10 sm:px-10 lg:px-16">
        <Logo size={32} variant="lockup" />

        <div className="flex max-w-[360px] flex-1 flex-col justify-center py-10">
          <p className="font-mono text-xs tracking-caps text-green-700 uppercase">Entrar</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">Bem-vindo de volta.</h1>
          <p className="mt-1.5 mb-5 text-base text-ink-500">
            Cadastre a obra, anexe os documentos e acompanhe a liberação.
          </p>

          <LoginForm />

          <p className="mt-5 text-sm text-ink-500">
            É morador e ainda não tem conta? Use o QR code ou o link que o síndico divulgou no condomínio.
          </p>

          <div className="mt-6 border-t border-divider pt-4 text-xs leading-relaxed text-ink-500">
            Ao continuar, você concorda com o tratamento dos seus dados conforme a LGPD.{" "}
            <strong className="text-ink-700">A plataforma não emite ART/RRT.</strong>
          </div>
        </div>

        <div className="font-mono text-[10px] tracking-caps text-ink-400 uppercase">ReformAI · administradora de condomínios</div>
      </div>

      {/* Direita — concreto verde */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-green-900 px-14 py-10 text-bone-50 lg:flex">
        <svg
          className="pointer-events-none absolute -top-20 -right-[100px] opacity-[0.18]"
          width={640}
          height={640}
          viewBox="0 0 640 640"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="320" cy="320" r="300" stroke="var(--rai-green-300)" strokeWidth="1" />
          <circle cx="320" cy="320" r="220" stroke="var(--rai-green-300)" strokeWidth="1" />
          <circle cx="320" cy="320" r="140" stroke="var(--rai-green-300)" strokeWidth="1" />
          <path d="M120 320 Q320 120 520 320 Q320 520 120 320" stroke="var(--rai-green-400)" strokeWidth="1.5" fill="none" />
        </svg>

        <div className="relative">
          <Badge>3 passos · ~5 min</Badge>
        </div>

        <div className="relative">
          <h2 className="text-3xl leading-[1.1] font-semibold tracking-tight">
            Reforma na unidade
            <br />
            <span className="text-green-300">com regra clara.</span>
            <br />
            Liberação por pessoa.
          </h2>

          <div className="mt-6 grid max-w-[420px] gap-3">
            {STEPS.map(([n, t, d]) => (
              <div key={n} className="grid grid-cols-[36px_1fr] items-start gap-3">
                <div className="pt-0.5 font-mono text-sm tracking-[0.05em] text-green-300">{n}</div>
                <div>
                  <div className="text-base font-medium text-bone-50">{t}</div>
                  <div className="mt-0.5 text-sm leading-normal text-ink-200">{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex max-w-[460px] items-center gap-3.5 rounded-sm bg-green-800 px-4 py-3.5">
          <span className="shrink-0 text-green-300">
            <Icon name="shield" size={18} />
          </span>
          <div className="text-xs leading-normal text-ink-200">
            <strong className="text-bone-50">A plataforma não emite ART/RRT.</strong>
            <br />A emissão é do profissional habilitado contratado pelo morador. Cada decisão fica registrada.
          </div>
        </div>
      </div>
    </div>
  );
}
