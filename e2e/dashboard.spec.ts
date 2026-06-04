import { expect, test } from "@playwright/test";
import { cleanupE2eData, login } from "./helpers";

test.afterAll(async () => {
  await cleanupE2eData();
});

test("login opens the commercial dashboard", async ({ page }) => {
  await login(page);

  await expect(page.getByRole("heading", { name: "Resumen comercial" })).toBeVisible();
  await expect(page.getByText("Pipeline activo")).toBeVisible();
  await expect(page.getByText("Leads IA prioritarios")).toBeVisible();
  await expect(page.getByText("Inbox reciente")).toBeVisible();
});
