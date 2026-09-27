import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "senha123";
const pdf = { name: "arquivo.pdf", mimeType: "application/pdf", buffer: readFileSync(path.join(__dirname, "fixtures/art.pdf")) };

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.click('button:has-text("Entrar")');
  await page.waitForURL("**/obras");
}

const badge = (page: Page) => page.locator("h1 ~ span").first();

test("morador cria e envia; síndico libera; obra vai até a conclusão", async ({ browser }) => {
  const resident = await (await browser.newContext()).newPage();
  const syndic = await (await browser.newContext()).newPage();

  // 1. Morador cria a obra (elétrica + demolição → exige ART/RRT)
  await login(resident, "morador@demo.com");
  await resident.goto("/obras/nova");
  await resident.fill("#description", "Integrar cozinha e sala derrubando a parede e refazer a elétrica da cozinha.");
  await resident.check('input[name="services"][value="ELECTRICAL"]');
  await resident.check('input[name="services"][value="MASONRY_DEMOLITION"]');
  await expect(resident.locator("aside.lg\\:sticky")).toContainText("Exige ART/RRT");
  await resident.click('button:has-text("Salvar rascunho")');
  await resident.waitForURL(/\/obras\/(?!nova)[a-z0-9]+$/);
  const caseUrl = resident.url();
  await expect(resident.locator('[data-slot="alert"]').first()).toContainText("Esta obra exige ART/RRT");
  await expect(resident.locator('button:has-text("Enviar para análise")')).toBeDisabled();

  // 2. Responsável técnico
  await resident.fill("#professionalName", "Eng. Carla Nunes");
  await resident.fill("#professionalReg", "CREA-SP 5069871234");
  await resident.fill("#artNumber", "2620251234567");
  await resident.click('button:has-text("Salvar")');
  await expect(resident.getByText("Responsável técnico salvo.")).toBeVisible();

  // 3. Documentos (um por tipo exigido; a Julia-1 pode ter acrescentado algum)
  for (let left = await resident.locator('input[type="file"]').count(); left > 0; left--) {
    await resident.locator('input[type="file"]').first().setInputFiles(pdf);
    await expect(resident.locator('input[type="file"]')).toHaveCount(left - 1, { timeout: 30_000 });
  }
  await expect(resident.locator('button:has-text("Enviar para análise")')).toBeEnabled();
  await resident.click('button:has-text("Enviar para análise")');
  await expect(badge(resident)).toHaveText("Em análise");

  // 4. Síndico confere todos os documentos e libera com condições
  await login(syndic, "sindico@demo.com");
  await syndic.goto(caseUrl);
  await expect(badge(syndic)).toHaveText("Em análise");
  const forms = syndic.locator('form:has(input[name="status"])');
  const n = await forms.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    await forms.nth(i).locator('input[value="APPROVED"]').check();
    await forms.nth(i).locator('button[type="submit"]').click();
    await expect(syndic.locator('[data-slot="badge"]:has-text("Aprovado")')).toHaveCount(i + 1, { timeout: 15_000 });
  }
  await expect(syndic.getByText("Documentos conferidos.")).toBeVisible();
  await expect(syndic.locator('button:has-text("Liberar obra")')).toBeDisabled(); // falta conferir a ART
  await syndic.check('input[name="artConfirmed"]');
  await syndic.fill("#conditions", "Obras só de segunda a sexta, das 8h às 17h.");
  await syndic.click('button:has-text("Liberar obra")');
  await expect(badge(syndic)).toHaveText("Liberada");

  // 5. Morador informa início e conclusão; síndico confirma
  await resident.reload();
  await expect(resident.locator('[data-slot="alert"]').first()).toContainText("Obra liberada");
  await resident.click('button:has-text("Informar início")');
  await expect(badge(resident)).toHaveText("Em execução");
  await resident.click('button:has-text("Informar conclusão")');
  await expect(resident.getByText("aguardando confirmação")).toBeVisible();

  await syndic.reload();
  await syndic.click('button:has-text("Confirmar conclusão")');
  await expect(badge(syndic)).toHaveText("Concluída");

  // 6. Termo de liberação imprimível
  await syndic.goto(`${caseUrl}/imprimir`);
  await expect(syndic.locator("h1")).toHaveText("Termo de liberação de obra");
  await expect(syndic.getByText("PRÉVIA")).toHaveCount(0);
  await expect(syndic.locator("td", { hasText: "Roberto Mendes (Síndico)" }).first()).toBeVisible();
});
