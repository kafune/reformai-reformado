import { describe, expect, it } from "bun:test";

import { calculateRisk, riskLevelForScore } from "./risk";
import { NO_FLAGS, SERVICES, SERVICE_BY_KEY, type ServiceKey } from "./services";

const flags = (partial: Partial<typeof NO_FLAGS>) => ({ ...NO_FLAGS, ...partial });

describe("riskLevelForScore — limites dos níveis", () => {
  it.each([
    [0, "LOW"],
    [20, "LOW"],
    [21, "MEDIUM"],
    [45, "MEDIUM"],
    [46, "HIGH"],
    [70, "HIGH"],
    [71, "CRITICAL"],
    [100, "CRITICAL"],
  ] as const)("score %i → %s", (score, level) => {
    expect(riskLevelForScore(score)).toBe(level);
  });
});

describe("calculateRisk — pontuação", () => {
  it("obra vazia: 0 pontos, BAIXO, sem ART, sem orientação", () => {
    expect(calculateRisk([], NO_FLAGS)).toEqual({
      score: 0,
      level: "LOW",
      requiresArt: false,
      guidance: [],
    });
  });

  it("soma os pontos dos serviços", () => {
    const r = calculateRisk(["PAINTING", "FLOORING"], NO_FLAGS);
    expect(r.score).toBe(15);
    expect(r.level).toBe("LOW");
  });

  it("não conta um serviço repetido duas vezes", () => {
    expect(calculateRisk(["ELECTRICAL", "ELECTRICAL"], NO_FLAGS).score).toBe(30);
  });

  it("chega exatamente em cada limite pela tabela", () => {
    expect(calculateRisk(["LAYOUT_CHANGE"], NO_FLAGS).level).toBe("LOW"); // 20
    expect(calculateRisk(["FLOORING_WITH_DEMOLITION"], NO_FLAGS).level).toBe("MEDIUM"); // 25
    expect(calculateRisk(["FACADE"], NO_FLAGS).level).toBe("MEDIUM"); // 45
    expect(calculateRisk(["FACADE", "PAINTING"], NO_FLAGS).level).toBe("HIGH"); // 50
    expect(calculateRisk(["STRUCTURAL"], flags({ affectsCommonArea: true })).level).toBe("HIGH"); // 70
    expect(calculateRisk(["STRUCTURAL", "AIR_CONDITIONING"], NO_FLAGS).level).toBe("CRITICAL"); // 75
  });

  it("elétrica + demolição de alvenaria = ALTO, 70 pontos (exemplo do mockup)", () => {
    const r = calculateRisk(["ELECTRICAL", "MASONRY_DEMOLITION"], NO_FLAGS);
    expect(r.score).toBe(70);
    expect(r.level).toBe("HIGH");
    expect(r.requiresArt).toBe(true);
  });

  it("teto de 100 pontos", () => {
    const r = calculateRisk(["STRUCTURAL", "FACADE", "GAS"], flags({ affectsStructure: true }));
    expect(r.score).toBe(100);
    expect(r.level).toBe("CRITICAL");
  });

  it("flags somam pontos: área comum +10, fachada +20, estrutura +30", () => {
    expect(calculateRisk([], flags({ affectsCommonArea: true })).score).toBe(10);
    expect(calculateRisk([], flags({ affectsFacade: true })).score).toBe(20);
    expect(calculateRisk([], flags({ affectsStructure: true })).score).toBe(30);
    expect(
      calculateRisk([], flags({ affectsCommonArea: true, affectsFacade: true, affectsStructure: true })).score,
    ).toBe(60);
  });
});

describe("calculateRisk — exige ART/RRT", () => {
  it.each(SERVICES.map((s) => [s.key, s.requiresArt] as const))(
    "serviço %s → requiresArt %p (igual à tabela)",
    (key, expected) => {
      expect(calculateRisk([key], NO_FLAGS).requiresArt).toBe(expected);
    },
  );

  it("um serviço que exige, no meio de outros que não, já exige", () => {
    expect(calculateRisk(["PAINTING", "FLOORING", "GAS"], NO_FLAGS).requiresArt).toBe(true);
  });

  it("afetar área comum não força ART", () => {
    expect(calculateRisk(["PAINTING"], flags({ affectsCommonArea: true })).requiresArt).toBe(false);
  });

  it("afetar fachada ou estrutura força ART, mesmo com serviço que não exige", () => {
    expect(calculateRisk(["PAINTING"], flags({ affectsFacade: true })).requiresArt).toBe(true);
    expect(calculateRisk(["PAINTING"], flags({ affectsStructure: true })).requiresArt).toBe(true);
    expect(calculateRisk([], flags({ affectsStructure: true })).requiresArt).toBe(true);
  });
});

describe("calculateRisk — orientações", () => {
  it("traz a orientação de cada serviço que exige ART, sem repetição", () => {
    const services: ServiceKey[] = ["PLUMBING", "WATERPROOFING", "ELECTRICAL", "PAINTING"];
    const r = calculateRisk(services, NO_FLAGS);
    expect(r.guidance).toEqual([
      "Engenheiro civil (CREA) ou arquiteto (CAU)", // hidráulica e impermeabilização: mesmo texto
      "Engenheiro eletricista/civil (CREA) ou arquiteto (CAU)",
    ]);
    expect(SERVICE_BY_KEY.PLUMBING.guidance).toBe(SERVICE_BY_KEY.WATERPROOFING.guidance);
    expect(new Set(r.guidance).size).toBe(r.guidance.length);
  });

  it("serviços sem ART não geram orientação", () => {
    expect(calculateRisk(["PAINTING", "FLOORING", "AIR_CONDITIONING"], NO_FLAGS).guidance).toEqual([]);
  });

  it("flag de estrutura sozinha exige ART mas não tem orientação de serviço", () => {
    const r = calculateRisk([], flags({ affectsStructure: true }));
    expect(r.requiresArt).toBe(true);
    expect(r.guidance).toEqual([]);
  });
});
