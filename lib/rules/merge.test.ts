import { describe, expect, it } from "bun:test";

import { requiredDocuments } from "./checklist";
import { mergeClassification, type JuliaClassification, type RulesClassification } from "./merge";
import { calculateRisk } from "./risk";
import { NO_FLAGS } from "./services";

function rulesFor(...services: Parameters<typeof calculateRisk>[0]): RulesClassification {
  const risk = calculateRisk(services, NO_FLAGS);
  return { ...risk, requiredDocs: requiredDocuments(risk) };
}

// Elétrica + demolição: ALTO, 70, exige ART, termo + ART + memorial.
const rules = rulesFor("ELECTRICAL", "MASONRY_DEMOLITION");

const agree: JuliaClassification = {
  level: "HIGH",
  requiresArt: true,
  requiredDocs: ["RESPONSIBILITY_TERM", "ART_RRT", "DESCRIPTIVE_MEMORIAL"],
  guidance: [],
  reason: "Concordo com a tabela.",
};

describe("mergeClassification — sem Julia", () => {
  it("devolve exatamente o resultado das regras", () => {
    const c = mergeClassification(rules, null);
    expect(c).toEqual({
      score: rules.score,
      level: rules.level,
      requiresArt: rules.requiresArt,
      requiredDocs: [...rules.requiredDocs],
      guidance: [...rules.guidance],
      classifiedBy: "rules",
      addedByJulia: null,
    });
  });

  it("não compartilha os arrays de entrada", () => {
    const c = mergeClassification(rules, null);
    expect(c.requiredDocs).not.toBe(rules.requiredDocs);
    expect(c.guidance).not.toBe(rules.guidance);
  });
});

describe("mergeClassification — a Julia só aumenta", () => {
  it("quando concorda, o resultado é o da tabela, marcado como rules+julia sem acréscimos", () => {
    const c = mergeClassification(rules, agree);
    expect(c.level).toBe("HIGH");
    expect(c.requiresArt).toBe(true);
    expect(c.requiredDocs).toEqual([...rules.requiredDocs]);
    expect(c.guidance).toEqual([...rules.guidance]);
    expect(c.classifiedBy).toBe("rules+julia");
    expect(c.addedByJulia).toEqual({
      level: false,
      requiresArt: false,
      docs: [],
      guidance: [],
      reason: "Concordo com a tabela.",
    });
  });

  it("nunca reduz o nível", () => {
    const c = mergeClassification(rules, { ...agree, level: "LOW" });
    expect(c.level).toBe("HIGH");
    expect(c.addedByJulia?.level).toBe(false);
  });

  it("pode aumentar o nível e a tela sabe que foi a Julia", () => {
    const c = mergeClassification(rules, { ...agree, level: "CRITICAL", reason: "Parede com prumada." });
    expect(c.level).toBe("CRITICAL");
    expect(c.addedByJulia?.level).toBe(true);
    expect(c.addedByJulia?.reason).toBe("Parede com prumada.");
  });

  it("nunca dispensa ART/RRT exigida pela tabela", () => {
    const c = mergeClassification(rules, { ...agree, requiresArt: false, requiredDocs: [] });
    expect(c.requiresArt).toBe(true);
    expect(c.requiredDocs).toContain("ART_RRT");
    expect(c.addedByJulia?.requiresArt).toBe(false);
  });

  it("pode exigir ART onde a tabela não exige", () => {
    const low = rulesFor("PAINTING"); // BAIXO, sem ART, sem documentos
    const c = mergeClassification(low, { ...agree, level: "LOW", requiredDocs: ["ART_RRT"], reason: "Pintura em fachada." });
    expect(c.requiresArt).toBe(true);
    expect(c.requiredDocs).toEqual(["ART_RRT"]);
    expect(c.addedByJulia).toMatchObject({ requiresArt: true, docs: ["ART_RRT"] });
  });

  it("nunca remove documento exigido pela tabela", () => {
    const c = mergeClassification(rules, { ...agree, requiredDocs: ["RESPONSIBILITY_TERM"] });
    expect(c.requiredDocs).toEqual(["RESPONSIBILITY_TERM", "ART_RRT", "DESCRIPTIVE_MEMORIAL"]);
    expect(c.addedByJulia?.docs).toEqual([]);
  });

  it("documentos obrigatórios = união, na ordem canônica, e os extras ficam marcados", () => {
    const c = mergeClassification(rules, { ...agree, requiredDocs: ["SCHEDULE", "PROJECT", "ART_RRT"] });
    expect(c.requiredDocs).toEqual(["RESPONSIBILITY_TERM", "ART_RRT", "DESCRIPTIVE_MEMORIAL", "PROJECT", "SCHEDULE"]);
    expect(c.addedByJulia?.docs).toEqual(["PROJECT", "SCHEDULE"]);
  });

  it("orientações = tabela + extras da Julia, sem repetir", () => {
    const extra = "Peça ao profissional um laudo das instalações existentes na parede.";
    const c = mergeClassification(rules, {
      ...agree,
      guidance: [rules.guidance[0], extra, extra],
    });
    expect(c.guidance).toEqual([...rules.guidance, extra]);
    expect(c.addedByJulia?.guidance).toEqual([extra]);
  });

  it("a pontuação é sempre a da tabela", () => {
    expect(mergeClassification(rules, { ...agree, level: "CRITICAL" }).score).toBe(70);
  });
});
