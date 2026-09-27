import { describe, expect, it } from "bun:test";

import { checkDocument, checkProblems, normalize, type DocumentCheckInput } from "./document-checks";

const base: DocumentCheckInput = {
  type: "ART_RRT",
  text: null,
  artNumber: "2620251234567",
  professionalReg: "CREA-SP 5069871234",
  professionalName: "Eng. Carla Nunes",
  unitNumber: "304",
  unitBlock: "B",
  condominiumAddress: "Rua das Acácias, 120",
  services: ["ELECTRICAL", "MASONRY_DEMOLITION"],
};

const goodArt = `ANOTAÇÃO DE RESPONSABILIDADE TÉCNICA - ART Nº 2620251234567
Profissional: Carla Nunes  Registro: 5069871234-SP
Endereço da obra: Rua das Acácias, 120, Bloco B, apto 304
Atividade: execução de instalações elétricas e demolição de alvenaria não estrutural.`;

const byCode = (checks: ReturnType<typeof checkDocument>) => Object.fromEntries(checks.map((c) => [c.code, c.ok]));

describe("normalize", () => {
  it("ignora acento, caixa e pontuação", () => {
    expect(normalize("CREA-SP 5.069.871/234")).toBe("creasp5069871234");
    expect(normalize("Acácias")).toBe("acacias");
  });
});

describe("checkDocument — ART/RRT", () => {
  it("sem texto: um único achado dizendo que não deu para ler", () => {
    expect(checkDocument(base)).toEqual([expect.objectContaining({ code: "no_text", ok: false })]);
    expect(checkDocument({ ...base, text: "   " })).toHaveLength(1);
  });

  it("ART completa: tudo confere", () => {
    const checks = checkDocument({ ...base, text: goodArt });
    expect(byCode(checks)).toEqual({
      is_art: true,
      art_number: true,
      professional_reg: true,
      professional_name: true,
      service_ELECTRICAL: true,
      service_MASONRY_DEMOLITION: true,
      unit: true,
    });
    expect(checkProblems(checks)).toEqual([]);
  });

  it("número da ART diferente do informado", () => {
    const checks = checkDocument({ ...base, artNumber: "9999999999999", text: goodArt });
    expect(byCode(checks).art_number).toBe(false);
    expect(checkProblems(checks)).toEqual(["Nº da ART/RRT informado (9999999999999) não aparece no documento."]);
  });

  it("serviço declarado que a ART não cobre (gás)", () => {
    const checks = checkDocument({ ...base, services: ["ELECTRICAL", "GAS"], text: goodArt });
    expect(byCode(checks).service_GAS).toBe(false);
    expect(checkProblems(checks)).toContain('Serviço "Gás" não aparece na ART/RRT; a ART deve cobrir todos os serviços declarados.');
  });

  it("serviço que não exige ART não é checado", () => {
    const checks = checkDocument({ ...base, services: ["PAINTING", "ELECTRICAL"], text: goodArt });
    expect(checks.find((c) => c.code === "service_PAINTING")).toBeUndefined();
  });

  it("dados não informados viram 'não dá para conferir' (ok = null), não erro", () => {
    const checks = checkDocument({ ...base, artNumber: null, professionalReg: null, text: goodArt });
    expect(byCode(checks).art_number).toBeNull();
    expect(byCode(checks).professional_reg).toBeNull();
    expect(checkProblems(checks)).toEqual([]);
  });

  it("documento que não é ART", () => {
    const checks = checkDocument({ ...base, text: "Memorial descritivo da reforma do apartamento 304 bloco B. Troca de piso e pintura." });
    expect(byCode(checks).is_art).toBe(false);
    expect(byCode(checks).unit).toBe(true);
  });

  it("unidade sem bloco e endereço ausente", () => {
    const checks = checkDocument({ ...base, unitBlock: "", unitNumber: "21", text: "ART 2620251234567 apto 21, Carla Nunes 5069871234 elétrica demolição" });
    expect(byCode(checks).unit).toBe(true);
    const missing = checkDocument({ ...base, text: "ART 2620251234567 Carla Nunes 5069871234 elétrica demolição" });
    expect(byCode(missing).unit).toBe(false);
  });
});

describe("checkDocument — outros tipos", () => {
  it("termo de responsabilidade: só unidade e assinatura", () => {
    const checks = checkDocument({ ...base, type: "RESPONSIBILITY_TERM", text: "Termo de responsabilidade. Unidade 304, bloco B. Assinatura: Ana Souza." });
    expect(byCode(checks)).toEqual({ unit: true, signature: true });
  });
  it("memorial: só unidade", () => {
    const checks = checkDocument({ ...base, type: "DESCRIPTIVE_MEMORIAL", text: "Memorial descritivo. Serviços na unidade 304 do bloco B." });
    expect(byCode(checks)).toEqual({ unit: true });
  });
});
