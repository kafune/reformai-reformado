// Helpers puros do admin (sem Prisma, sem Next), com teste.

/** Código do link/QR de cadastro: ACACIAS-7F3K (palavra do nome + 4 caracteres aleatórios sem 0/O/1/I). */
export function generateSignupCode(name: string, random: () => number = Math.random): string {
  const word =
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .split(/\s+/)
      .filter((w) => w.length > 3 && !/^(RESIDENCIAL|CONDOMINIO|EDIFICIO|CONJUNTO)$/.test(w))[0] ?? "COND";
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const suffix = Array.from({ length: 4 }, () => alphabet[Math.floor(random() * alphabet.length)]).join("");
  return `${word.replace(/[^A-Z0-9]/g, "").slice(0, 12)}-${suffix}`;
}

/** Uma unidade por linha: "bloco;número" (também , ou tab) ou só "número". Ignora vazias, inválidas e repetidas. */
export function parseUnitLines(text: string): { block: string; number: string }[] {
  const seen = new Set<string>();
  const units: { block: string; number: string }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const [a, b] = line.split(/[;,\t]/).map((p) => p.trim());
    const unit = b !== undefined ? { block: (a ?? "").toUpperCase(), number: b } : { block: "", number: a ?? "" };
    if (!unit.number || unit.number.length > 10 || unit.block.length > 10) continue;
    const key = `${unit.block}|${unit.number}`;
    if (seen.has(key)) continue;
    seen.add(key);
    units.push(unit);
  }
  return units;
}
