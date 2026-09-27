import { describe, expect, it } from "bun:test";

import { hashPassword, verifyPassword } from "./password";

describe("senha com scrypt", () => {
  it("confere a senha certa e recusa a errada", async () => {
    const stored = await hashPassword("senha123");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("senha123", stored)).toBe(true);
    expect(await verifyPassword("senha124", stored)).toBe(false);
  });

  it("gera hashes diferentes para a mesma senha (salt)", async () => {
    expect(await hashPassword("x")).not.toBe(await hashPassword("x"));
  });

  it("recusa formato desconhecido sem quebrar", async () => {
    expect(await verifyPassword("senha123", "")).toBe(false);
    expect(await verifyPassword("senha123", "bcrypt$abc$def")).toBe(false);
  });
});
