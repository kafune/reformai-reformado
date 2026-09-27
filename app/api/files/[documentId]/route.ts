// Único route handler de arquivo: checa permissão e redireciona para a URL assinada (1h).
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canViewCase } from "@/lib/permissions";
import { signedDownloadUrl } from "@/lib/storage";

export async function GET(_req: Request, { params }: RouteContext<"/api/files/[documentId]">) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Não autenticado", { status: 401 });
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user || !user.active) return new NextResponse("Não autenticado", { status: 401 });

  const { documentId } = await params;
  const doc = await db.document.findUnique({ where: { id: documentId }, include: { case: true } });
  if (!doc || !canViewCase(user, doc.case)) return new NextResponse("Não encontrado", { status: 404 });

  return NextResponse.redirect(await signedDownloadUrl(doc.storageKey, doc.fileName), 302);
}
