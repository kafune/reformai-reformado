import { describe, expect, it } from "bun:test";

import type { CaseStatus } from "./rules/status";
import {
  ForbiddenError,
  assertCan,
  can,
  canViewCase,
  caseFilterForUser,
  type CaseAction,
  type CaseForPermissions,
  type UserForPermissions,
} from "./permissions";

const admin: UserForPermissions = { id: "u-admin", role: "ADMIN", condominiumId: null };
const syndicA: UserForPermissions = { id: "u-syndic-a", role: "SYNDIC", condominiumId: "condo-a" };
const syndicB: UserForPermissions = { id: "u-syndic-b", role: "SYNDIC", condominiumId: "condo-b" };
const resident: UserForPermissions = { id: "u-res", role: "RESIDENT", condominiumId: "condo-a" };
const neighbor: UserForPermissions = { id: "u-res-2", role: "RESIDENT", condominiumId: "condo-a" };

const caseWith = (status: CaseStatus): CaseForPermissions => ({
  residentId: resident.id,
  condominiumId: "condo-a",
  status,
});

describe("canViewCase", () => {
  const c = caseWith("UNDER_REVIEW");
  it("admin vê tudo", () => expect(canViewCase(admin, c)).toBe(true));
  it("síndico vê só o próprio condomínio", () => {
    expect(canViewCase(syndicA, c)).toBe(true);
    expect(canViewCase(syndicB, c)).toBe(false);
  });
  it("síndico sem condomínio não vê nada", () => {
    expect(canViewCase({ ...syndicA, condominiumId: null }, c)).toBe(false);
  });
  it("morador vê só as próprias obras", () => {
    expect(canViewCase(resident, c)).toBe(true);
    expect(canViewCase(neighbor, c)).toBe(false);
  });
});

describe("can — morador dono", () => {
  it.each<[CaseAction, CaseStatus[]]>([
    ["edit", ["DRAFT", "CHANGES_REQUESTED"]],
    ["upload", ["DRAFT", "CHANGES_REQUESTED"]],
    ["submit", ["DRAFT", "CHANGES_REQUESTED"]],
    ["start", ["APPROVED"]],
    ["report_completion", ["IN_PROGRESS"]],
    ["cancel", ["DRAFT", "UNDER_REVIEW", "CHANGES_REQUESTED", "APPROVED"]],
    ["review", []],
    ["confirm_completion", []],
  ])("%s só em %p", (action, allowed) => {
    const all: CaseStatus[] = ["DRAFT", "UNDER_REVIEW", "CHANGES_REQUESTED", "APPROVED", "REJECTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
    expect(all.filter((s) => can(resident, action, caseWith(s)))).toEqual(allowed);
  });

  it("vizinho não faz nada na obra alheia", () => {
    expect(can(neighbor, "edit", caseWith("DRAFT"))).toBe(false);
    expect(can(neighbor, "cancel", caseWith("DRAFT"))).toBe(false);
  });
});

describe("can — síndico e admin", () => {
  it("revisam só obras em análise", () => {
    expect(can(syndicA, "review", caseWith("UNDER_REVIEW"))).toBe(true);
    expect(can(admin, "review", caseWith("UNDER_REVIEW"))).toBe(true);
    expect(can(syndicA, "review", caseWith("DRAFT"))).toBe(false);
    expect(can(syndicA, "review", caseWith("APPROVED"))).toBe(false);
  });

  it("síndico de outro condomínio não revisa", () => {
    expect(can(syndicB, "review", caseWith("UNDER_REVIEW"))).toBe(false);
  });

  it("confirmam conclusão só de obra em execução", () => {
    expect(can(syndicA, "confirm_completion", caseWith("IN_PROGRESS"))).toBe(true);
    expect(can(syndicA, "confirm_completion", caseWith("APPROVED"))).toBe(false);
  });

  it("não fazem ações de morador", () => {
    for (const action of ["edit", "upload", "submit", "start", "report_completion"] as const) {
      expect(can(syndicA, action, caseWith("DRAFT"))).toBe(false);
      expect(can(admin, action, caseWith("APPROVED"))).toBe(false);
    }
  });

  it("admin cancela até em execução, mas não obra finalizada; síndico não cancela", () => {
    expect(can(admin, "cancel", caseWith("IN_PROGRESS"))).toBe(true);
    expect(can(admin, "cancel", caseWith("COMPLETED"))).toBe(false);
    expect(can(admin, "cancel", caseWith("REJECTED"))).toBe(false);
    expect(can(syndicA, "cancel", caseWith("DRAFT"))).toBe(false);
  });
});

describe("assertCan", () => {
  it("lança ForbiddenError quando não pode", () => {
    expect(() => assertCan(neighbor, "edit", caseWith("DRAFT"))).toThrow(ForbiddenError);
    expect(() => assertCan(resident, "edit", caseWith("DRAFT"))).not.toThrow();
  });
});

describe("caseFilterForUser", () => {
  it("admin: sem filtro; síndico: condomínio; morador: residentId", () => {
    expect(caseFilterForUser(admin)).toEqual({});
    expect(caseFilterForUser(syndicA)).toEqual({ condominiumId: "condo-a" });
    expect(caseFilterForUser(resident)).toEqual({ residentId: "u-res" });
  });
  it("síndico sem condomínio não lista nada", () => {
    expect(caseFilterForUser({ ...syndicA, condominiumId: null })).toEqual({ condominiumId: "__none__" });
  });
});
