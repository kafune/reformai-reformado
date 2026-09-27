// Aviso por e-mail nas mudanças de status importantes (PLAN.md Fase 10). Chamado pelas actions
// depois da transação; falha de e-mail nunca quebra a ação. Sem SMTP_URL, é no-op.
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { unitLabel } from "@/lib/format";
import type { CaseStatus } from "@/lib/rules/status";

function appUrl(path: string): string {
  return `${(process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "")}${path}`;
}

/** Síndicos ativos do condomínio + equipe da administradora. */
async function reviewerEmails(condominiumId: string): Promise<string[]> {
  const users = await db.user.findMany({
    where: { active: true, OR: [{ role: "ADMIN" }, { role: "SYNDIC", condominiumId }] },
    select: { email: true },
  });
  return users.map((u) => u.email).filter((e) => !e.endsWith("@anonimo.invalid"));
}

export async function notifyStatusChange(caseId: string, to: CaseStatus, message?: string | null): Promise<void> {
  const c = await db.case.findUnique({
    where: { id: caseId },
    include: { resident: { select: { name: true, email: true, active: true } }, unit: true, condominium: { select: { id: true, name: true } } },
  });
  if (!c) return;
  const link = appUrl(`/obras/${c.id}`);
  const where = `${c.condominium.name}, ${unitLabel(c.unit)}`;
  const footer = `\n\nAcesse: ${link}\n\nReformAI — a plataforma não emite ART/RRT.`;
  const resident = c.resident.active ? c.resident.email : null;

  switch (to) {
    case "UNDER_REVIEW":
      await sendMail(
        await reviewerEmails(c.condominium.id),
        `[ReformAI] Obra ${c.protocol} enviada para análise`,
        `${c.resident.name} enviou a obra ${c.protocol} (${where}) para análise.${c.requiresArt ? " A obra exige ART/RRT." : ""}${footer}`,
      );
      return;
    case "CHANGES_REQUESTED":
      if (resident) await sendMail(resident, `[ReformAI] Obra ${c.protocol}: correção solicitada`, `Sua obra ${c.protocol} (${where}) voltou para correção.\n\nO que foi pedido: ${message ?? "veja as notas nos documentos."}${footer}`);
      return;
    case "APPROVED":
      if (resident) await sendMail(resident, `[ReformAI] Obra ${c.protocol} liberada`, `Sua obra ${c.protocol} (${where}) foi liberada.${message ? `\n\nCondições: ${message}` : ""}\n\nQuando começar, informe o início na plataforma.${footer}`);
      return;
    case "REJECTED":
      if (resident) await sendMail(resident, `[ReformAI] Obra ${c.protocol} recusada`, `Sua obra ${c.protocol} (${where}) foi recusada.\n\nMotivo: ${message ?? "—"}${footer}`);
      return;
    case "COMPLETED":
      if (resident) await sendMail(resident, `[ReformAI] Obra ${c.protocol} concluída`, `A conclusão da obra ${c.protocol} (${where}) foi confirmada pelo condomínio.${footer}`);
      return;
    default:
      return;
  }
}

/** Morador informou a conclusão: avisa quem confirma. */
export async function notifyCompletionReported(caseId: string): Promise<void> {
  const c = await db.case.findUnique({ where: { id: caseId }, include: { resident: { select: { name: true } }, unit: true, condominium: { select: { id: true, name: true } } } });
  if (!c) return;
  await sendMail(
    await reviewerEmails(c.condominium.id),
    `[ReformAI] Obra ${c.protocol}: conclusão informada`,
    `${c.resident.name} informou a conclusão da obra ${c.protocol} (${c.condominium.name}, ${unitLabel(c.unit)}). Confirme na plataforma.\n\nAcesse: ${appUrl(`/obras/${c.id}`)}`,
  );
}
