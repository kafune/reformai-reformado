import { describe, expect, it } from "bun:test";

import { DOCUMENT_TYPES, requiredDocuments, sortDocuments } from "./checklist";

describe("requiredDocuments — por nível", () => {
  it("BAIXO: nenhum documento obrigatório", () => {
    expect(requiredDocuments({ level: "LOW", requiresArt: false })).toEqual([]);
  });

  it("MÉDIO: termo de responsabilidade", () => {
    expect(requiredDocuments({ level: "MEDIUM", requiresArt: false })).toEqual(["RESPONSIBILITY_TERM"]);
  });

  it("ALTO: + ART/RRT e memorial descritivo", () => {
    expect(requiredDocuments({ level: "HIGH", requiresArt: true })).toEqual([
      "RESPONSIBILITY_TERM",
      "ART_RRT",
      "DESCRIPTIVE_MEMORIAL",
    ]);
  });

  it("CRÍTICO: + projeto, cronograma e relação da equipe", () => {
    expect(requiredDocuments({ level: "CRITICAL", requiresArt: true })).toEqual([
      "RESPONSIBILITY_TERM",
      "ART_RRT",
      "DESCRIPTIVE_MEMORIAL",
      "PROJECT",
      "SCHEDULE",
      "TEAM_LIST",
    ]);
  });
});

describe("requiredDocuments — ART/RRT forçada", () => {
  it("BAIXO com ART exigida: só a ART/RRT", () => {
    expect(requiredDocuments({ level: "LOW", requiresArt: true })).toEqual(["ART_RRT"]);
  });

  it("MÉDIO com ART exigida: termo + ART/RRT, na ordem canônica", () => {
    expect(requiredDocuments({ level: "MEDIUM", requiresArt: true })).toEqual([
      "RESPONSIBILITY_TERM",
      "ART_RRT",
    ]);
  });

  it("ALTO sem flag de ART continua pedindo ART/RRT (o nível já pede), sem duplicar", () => {
    const docs = requiredDocuments({ level: "HIGH", requiresArt: false });
    expect(docs.filter((d) => d === "ART_RRT")).toHaveLength(1);
  });
});

describe("sortDocuments", () => {
  it("ordena na ordem canônica e remove repetidos", () => {
    expect(sortDocuments(["PROJECT", "ART_RRT", "PROJECT", "RESPONSIBILITY_TERM"])).toEqual([
      "RESPONSIBILITY_TERM",
      "ART_RRT",
      "PROJECT",
    ]);
  });

  it("a ordem canônica cobre todos os tipos", () => {
    expect(sortDocuments([...DOCUMENT_TYPES].reverse())).toEqual([...DOCUMENT_TYPES]);
  });
});
