import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/print-button";
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
      <article className="print-sheet mx-3 my-3 flex flex-col items-center gap-6 bg-white p-8 text-center shadow-md md:mx-auto md:my-6 md:min-h-[297mm] md:w-[210mm] md:justify-center md:p-[22mm_20mm] print:m-0 print:min-h-0 print:w-auto print:shadow-none">
        <div className="flex items-center gap-2.5 text-lg font-bold">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-base text-primary-foreground">R</span>
          ReformAI
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Vai reformar seu apartamento?</h1>
        <p className="max-w-md text-base text-muted-foreground">
          Cadastre a obra pelo aplicativo do condomínio. Você fica sabendo se precisa de ART/RRT, quais documentos enviar
          e acompanha a liberação pelo síndico.
        </p>
        <div className="rounded-xl border-2 p-4 [&>svg]:size-[260px]" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        <p className="text-sm">
          Aponte a câmera do celular para o código ou acesse
          <br />
          <span className="font-mono text-base font-semibold">{url}</span>
        </p>
        <p className="mt-6 text-lg font-semibold">{c.name}</p>
        <p className="text-xs text-muted-foreground">A plataforma não emite ART/RRT. A responsabilidade técnica é do profissional habilitado contratado por você.</p>
      </article>
    </>
  );
}
