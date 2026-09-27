// Formatação de datas e textos para as telas (pt-BR).

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

export function formatDate(date: Date | null | undefined): string {
  return date ? dateFmt.format(date) : "—";
}

export function formatDateTime(date: Date): string {
  return `${dateFmt.format(date)}, ${timeFmt.format(date)}`;
}

/** "hoje, 10:42" · "ontem" · "há 3 dias" · "12/03/2026" */
export function formatRelative(date: Date, now = new Date()): string {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days <= 0) return `hoje, ${timeFmt.format(date)}`;
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  return dateFmt.format(date);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function unitLabel(unit: { block: string; number: string }): string {
  return unit.block ? `Bloco ${unit.block} · ${unit.number}` : `Unidade ${unit.number}`;
}

export function unitShort(unit: { block: string; number: string }): string {
  return unit.block ? `${unit.block} · ${unit.number}` : unit.number;
}
