import { expect, test } from "@playwright/test";
import { cleanupE2eData, createManualDealContact, demoAgencyId, expectNoVisibleText, login, prisma } from "./helpers";

test.beforeEach(async () => {
  await cleanupE2eData();
});

test.afterAll(async () => {
  await cleanupE2eData();
  await prisma.$disconnect();
});

test("pipeline creates, edits and deletes a manual deal", async ({ page }) => {
  const agencyId = await demoAgencyId();
  const stamp = String(Date.now());
  await createManualDealContact(agencyId, stamp);
  const title = `E2E manual deal ${stamp}`;
  const updatedTitle = `E2E updated deal ${stamp}`;

  await login(page);
  await page.goto("/dashboard/pipelines");

  await page.getByRole("button", { name: "Oportunidad", exact: true }).click();
  await page.fill("#dealTitle", title);
  await page.fill("#dealValue", "777");
  await page.selectOption("#dealContact", { label: `E2EPipeline ${stamp}` });
  await page.getByRole("button", { name: "Crear", exact: true }).click();

  await expect(page.getByText(title)).toBeVisible();
  await expect(page.getByRole("button", { name: `Editar oportunidad ${title}` })).toBeVisible();

  await page.getByRole("button", { name: `Editar oportunidad ${title}` }).click();
  await page.fill("#editDealTitle", updatedTitle);
  await page.fill("#editDealValue", "999");
  await page.selectOption("#editDealStatus", "won");
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page.getByText(updatedTitle)).toBeVisible();
  await expect(page.getByText("Ganado")).toBeVisible();

  await page.getByRole("button", { name: `Editar oportunidad ${updatedTitle}` }).click();
  await page.getByRole("button", { name: "Eliminar" }).click();

  await expectNoVisibleText(page, updatedTitle);
});
