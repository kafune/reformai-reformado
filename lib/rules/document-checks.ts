// Checagens determinísticas sobre o texto extraído de um documento (PLAN.md, Fase 7 revisada).
// Puro: sem Prisma, sem Next. Os achados pré-preenchem a nota do síndico e entram no contexto da Julia-1.

import type { DocumentType } from "./checklist";
import { SERVICE_BY_KEY, isServiceKey } from "./services";

export type DocumentCheck = {
  code: string;
  /** true = confere; false = problema; null = não dá para checar (dado não informado). */
  ok: boolean | null;
  message: string;
};

export type DocumentCheckInput = {
  type: DocumentType;
  text: string | null;
  artNumber: string | null;
  professionalReg: string | null;
  professionalName: string | null;
  unitNumber: string;
  unitBlock: string;
  condominiumAddress: string;
  services: string[]; // ServiceKey
};

/** Só dígitos e letras, minúsculo, sem acento — para comparar números e nomes com tolerância. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** Palavras que denunciam cada serviço numa ART/RRT ou memorial. */
const SERVICE_KEYWORDS: Partial<Record<string, string[]>> = {
  ELECTRICAL: ["eletric", "elétric", "instalacoes eletricas", "instalações elétricas"],
  PLUMBING: ["hidraul", "hidrául", "hidrossanit", "agua fria", "água fria", "esgoto"],
  GAS: ["gas", "gás", "glp"],
  WATERPROOFING: ["impermeabiliza"],
  MASONRY_DEMOLITION: ["demoli", "alvenaria"],
  STRUCTURAL: ["estrutur", "viga", "pilar", "laje", "prumada"],
  FACADE: ["fachada"],
  EXTERNAL_FRAMES: ["esquadria", "janela", "caixilho"],
  LAYOUT_CHANGE: ["layout", "divisoria", "divisória", "parede"],
  FLOORING_WITH_DEMOLITION: ["piso", "contrapiso"],
  HEAVY_FIXED_EQUIPMENT: ["equipamento"],
};

const contains = (haystack: string, needle: string) => normalize(haystack).includes(normalize(needle));

export function checkDocument(input: DocumentCheckInput): DocumentCheck[] {
  const checks: DocumentCheck[] = [];
  const text = input.text?.trim() ?? "";

  if (text.length < 20) {
    checks.push({ code: "no_text", ok: false, message: "Não foi possível ler texto no arquivo (imagem sem OCR ou PDF vazio); confira manualmente." });
    return checks;
  }
  const lower = text.toLowerCase();

  if (input.type === "ART_RRT") {
    const mentionsArt = /\b(art|rrt|anota[cç][aã]o de responsabilidade|registro de responsabilidade)\b/i.test(text);
    checks.push({
      code: "is_art",
      ok: mentionsArt,
      message: mentionsArt ? "O documento se identifica como ART/RRT." : "O documento não menciona ART nem RRT; confira se é o arquivo certo.",
    });

    if (input.artNumber && normalize(input.artNumber).length >= 4) {
      const found = contains(text, input.artNumber);
      checks.push({
        code: "art_number",
        ok: found,
        message: found ? `Nº da ART/RRT informado (${input.artNumber}) aparece no documento.` : `Nº da ART/RRT informado (${input.artNumber}) não aparece no documento.`,
      });
    } else {
      checks.push({ code: "art_number", ok: null, message: "Nº da ART/RRT não informado pelo morador; não dá para conferir." });
    }

    if (input.professionalReg && normalize(input.professionalReg).length >= 4) {
      // compara só os dígitos do registro (CREA-SP 5069871234 → 5069871234)
      const digits = input.professionalReg.replace(/\D/g, "");
      const found = digits.length >= 4 ? normalize(text).includes(digits) : contains(text, input.professionalReg);
      checks.push({
        code: "professional_reg",
        ok: found,
        message: found ? `Registro do profissional (${input.professionalReg}) aparece no documento.` : `Registro do profissional (${input.professionalReg}) não aparece no documento.`,
      });
    } else {
      checks.push({ code: "professional_reg", ok: null, message: "Registro CREA/CAU não informado; não dá para conferir." });
    }

    if (input.professionalName) {
      const parts = input.professionalName.split(/\s+/).filter((p) => p.length > 3 && !/^(eng|arq|dr|dra|sr|sra)\.?$/i.test(p));
      const found = parts.length > 0 && parts.every((p) => contains(text, p));
      checks.push({
        code: "professional_name",
        ok: parts.length ? found : null,
        message: found ? "Nome do profissional aparece no documento." : "Nome do profissional não aparece (ou aparece diferente) no documento.",
      });
    }

    for (const key of input.services.filter(isServiceKey)) {
      const service = SERVICE_BY_KEY[key];
      if (!service.requiresArt) continue;
      const keywords = SERVICE_KEYWORDS[key] ?? [];
      const found = keywords.some((k) => lower.includes(k.toLowerCase()));
      checks.push({
        code: `service_${key}`,
        ok: found,
        message: found ? `Serviço "${service.label}" aparece na ART/RRT.` : `Serviço "${service.label}" não aparece na ART/RRT; a ART deve cobrir todos os serviços declarados.`,
      });
    }
  }

  // Unidade/endereço: vale para qualquer documento
  const unitFound =
    (input.unitBlock ? contains(text, input.unitBlock) && contains(text, input.unitNumber) : contains(text, input.unitNumber)) ||
    contains(text, input.condominiumAddress);
  checks.push({
    code: "unit",
    ok: unitFound,
    message: unitFound ? "Endereço/unidade aparece no documento." : "Endereço ou unidade não aparece no documento.",
  });

  if (input.type === "RESPONSIBILITY_TERM") {
    const signed = /assin/i.test(text) || /\bde acordo\b/i.test(text);
    checks.push({ code: "signature", ok: signed, message: signed ? "Há menção a assinatura." : "Não há menção a assinatura; confira se o termo está assinado." });
  }

  return checks;
}

/** Resumo para a nota do síndico e para o contexto da Julia-1: só os problemas. */
export function checkProblems(checks: readonly DocumentCheck[]): string[] {
  return checks.filter((c) => c.ok === false).map((c) => c.message);
}
