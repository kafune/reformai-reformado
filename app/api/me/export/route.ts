// LGPD: "Baixar meus dados" — JSON com o que a plataforma guarda sobre o usuário logado.
// Route handler porque é download de arquivo.
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Não autenticado", { status: 401 });
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, role: true, lgpdConsentAt: true, createdAt: true, condominium: { select: { name: true } } },
  });
  if (!user) return new NextResponse("Não autenticado", { status: 401 });

  const [units, cases, events, documents] = await Promise.all([
    db.unit.findMany({ where: { residentId: user.id }, select: { block: true, number: true, condominium: { select: { name: true } } } }),
    db.case.findMany({
      where: { residentId: user.id },
      select: {
        protocol: true, status: true, services: true, description: true, affectsCommonArea: true, affectsFacade: true, affectsStructure: true,
        plannedStart: true, plannedEnd: true, contractorName: true, riskScore: true, riskLevel: true, requiresArt: true, requiredDocs: true,
        professionalName: true, professionalType: true, professionalReg: true, artNumber: true, approvalConditions: true, startedAt: true, completedAt: true, createdAt: true,
      },
    }),
    db.caseEvent.findMany({ where: { userId: user.id }, select: { type: true, fromStatus: true, toStatus: true, message: true, createdAt: true, case: { select: { protocol: true } } }, orderBy: { createdAt: "asc" } }),
    db.document.findMany({ where: { uploadedById: user.id }, select: { type: true, fileName: true, status: true, reviewNote: true, createdAt: true, case: { select: { protocol: true } } } }),
  ]);

  const body = JSON.stringify({ exportadoEm: new Date().toISOString(), usuario: user, unidades: units, obras: cases, documentos: documents, eventos: events }, null, 2);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="reformai-meus-dados-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
