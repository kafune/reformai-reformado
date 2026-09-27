import { describe, expect, it } from "bun:test";

import { artSituation, isArtAlarm, type DocForArt } from "./art";

const d = (status: DocForArt["status"], day: number, type = "ART_RRT"): DocForArt => ({
  type,
  status,
  createdAt: new Date(2026, 0, day),
});

describe("artSituation", () => {
  it("sem ART: faltando (outros documentos não contam)", () => {
    expect(artSituation([])).toBe("MISSING");
    expect(artSituation([d("APPROVED", 1, "RESPONSIBILITY_TERM")])).toBe("MISSING");
  });
  it("pendente: enviada", () => expect(artSituation([d("PENDING", 1)])).toBe("SENT"));
  it("reprovada: reprovada", () => expect(artSituation([d("REJECTED", 1)])).toBe("REJECTED"));
  it("qualquer aprovada vale, mesmo com uma reprovada mais nova", () => {
    expect(artSituation([d("APPROVED", 1), d("REJECTED", 2)])).toBe("APPROVED");
  });
  it("sem aprovada, vale a mais recente: reenvio depois de reprovação = enviada", () => {
    expect(artSituation([d("REJECTED", 1), d("PENDING", 2)])).toBe("SENT");
    expect(artSituation([d("PENDING", 1), d("REJECTED", 2)])).toBe("REJECTED");
  });
});

describe("isArtAlarm", () => {
  it("em execução sem ART aprovada é alarme", () => {
    expect(isArtAlarm({ status: "IN_PROGRESS", requiresArt: true }, "SENT")).toBe(true);
    expect(isArtAlarm({ status: "IN_PROGRESS", requiresArt: true }, "MISSING")).toBe(true);
    expect(isArtAlarm({ status: "APPROVED", requiresArt: true }, "REJECTED")).toBe(true);
  });
  it("não é alarme quando a ART está aprovada, não é exigida ou a obra não chegou lá", () => {
    expect(isArtAlarm({ status: "IN_PROGRESS", requiresArt: true }, "APPROVED")).toBe(false);
    expect(isArtAlarm({ status: "IN_PROGRESS", requiresArt: false }, "MISSING")).toBe(false);
    expect(isArtAlarm({ status: "UNDER_REVIEW", requiresArt: true }, "MISSING")).toBe(false);
    expect(isArtAlarm({ status: "COMPLETED", requiresArt: true }, "MISSING")).toBe(false);
  });
});
