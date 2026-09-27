import type { Tx } from "@/lib/db";

/** Próximo protocolo do ano: RF-2026-000123. Chamar dentro da transação que cria a obra. */
export async function nextProtocol(tx: Tx, now = new Date()): Promise<string> {
  const year = now.getFullYear();
  const prefix = `RF-${year}-`;
  const last = await tx.case.findFirst({
    where: { protocol: { startsWith: prefix } },
    orderBy: { protocol: "desc" },
    select: { protocol: true },
  });
  const seq = last ? Number(last.protocol.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(seq).padStart(6, "0")}`;
}
