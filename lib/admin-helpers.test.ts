import { describe, expect, it } from "bun:test";

import { generateSignupCode, parseUnitLines } from "./admin-helpers";

describe("generateSignupCode", () => {
  it("usa a primeira palavra significativa do nome, sem acento, e 4 caracteres", () => {
    const code = generateSignupCode("Residencial Jardim das Acácias", () => 0);
    expect(code).toBe("JARDIM-AAAA");
    expect(generateSignupCode("Edifício Solar das Palmeiras", () => 0.99)).toBe("SOLAR-9999");
    expect(generateSignupCode("Ed. XY", () => 0)).toBe("COND-AAAA");
  });
  it("só letras, números e hífen", () => {
    expect(generateSignupCode("Condomínio Vila-Nova & Cia")).toMatch(/^[A-Z0-9]+-[A-Z2-9]{4}$/);
  });
});

describe("parseUnitLines", () => {
  it("aceita bloco;número, vírgula, tab e só número", () => {
    expect(parseUnitLines("A;101\nb,102\nC\t103\n\n  21  \n")).toEqual([
      { block: "A", number: "101" },
      { block: "B", number: "102" },
      { block: "C", number: "103" },
      { block: "", number: "21" },
    ]);
  });
  it("ignora repetidas e inválidas", () => {
    expect(parseUnitLines("A;101\nA;101\n;\nA;12345678901")).toEqual([{ block: "A", number: "101" }]);
  });
});
