import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/print-button";
import { Logo } from "@/components/ui/logo";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canViewCondominium } from "@/lib/permissions";
import { signupLink } from "@/lib/signup-link";

export const metadata: Metadata = { title: "Cartaz de cadastro" };

/** Cartaz A4 com o QR do link de cadastro, para o mural do condomínio. */
export default async function SignupPosterPage({ params }: PageProps<"/admin/condominios/[id]/cartaz">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!canViewCondominium(user, id)) notFound();
  const c = await db.condominium.findUnique({ where: { id } });
  if (!c) notFound();
  const { url, qrSvg } = await signupLink(c.signupCode);

  return (
    <>
      <div className="mx-auto flex max-w-[210mm] justify-end px-3 pt-4 print:hidden">
        <PrintButton />
      </div>
      <article className="print-sheet mx-3 my-3 flex flex-col items-center gap-6 bg-white p-8 text-center text-ink-900 shadow-3 md:mx-auto md:my-6 md:min-h-[297mm] md:w-[210mm] md:justify-center md:p-[22mm_20mm] print:m-0 print:min-h-0 print:w-auto print:shadow-none">
        <Logo size={40} variant="lockup" />
        <p className="font-mono text-xs tracking-caps text-green-700 uppercase">{c.name}</p>
        <h1 className="text-3xl font-semibold tracking-tight">Vai reformar seu apartamento?</h1>
        <p className="max-w-md text-base text-ink-500">
          Cadastre a obra pelo aplicativo do condomínio. Você fica sabendo se precisa de ART/RRT, quais documentos enviar e acompanha a
          liberação pelo síndico.
        </p>
        <div className="rounded-lg border-2 border-ink-900 p-4 [&>svg]:size-[260px]" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        <p className="text-sm">
          Aponte a câmera do celular para o código ou acesse
          <br />
          <span className="font-mono text-base font-semibold">{url}</span>
        </p>
        <div className="mt-4 grid max-w-md grid-cols-3 gap-4 text-left">
          {[
            ["01", "Cadastre a obra"],
            ["02", "Anexe os documentos"],
            ["03", "Receba a liberação"],
          ].map(([n, t]) => (
            <div key={n}>
              <div className="font-mono text-xs tracking-wide text-green-700">{n}</div>
              <div className="mt-0.5 text-sm font-medium">{t}</div>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-md border-t border-ink-200 pt-4 text-xs text-ink-500">
          A plataforma não emite ART/RRT. A responsabilidade técnica é do profissional habilitado contratado por você.
        </p>
      </article>
    </>
  );
}
