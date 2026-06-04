import { expect, test } from "@playwright/test";
import { cleanupE2eData, createInboxConversation, demoAgencyId, login, prisma } from "./helpers";

test.beforeEach(async () => {
  await cleanupE2eData();
});

test.afterAll(async () => {
  await cleanupE2eData();
  await prisma.$disconnect();
});

test("inbox creates sales follow-up, marks hot lead and changes status", async ({ page }) => {
  const agencyId = await demoAgencyId();
  const stamp = String(Date.now());
  const { contactId, conversationId } = await createInboxConversation({ agencyId, stamp });

  await login(page);
  await page.goto("/dashboard/inbox");
  await page.getByPlaceholder("Buscar en inbox").fill(stamp);

  await expect(page.getByText(`E2EInbox ${stamp}`)).toBeVisible();
  await expect(page.getByText("Sin oportunidad abierta")).toBeVisible();

  await page.getByRole("button", { name: "Crear deal" }).click();
  await expect(page.getByText("Lead manual:")).toBeVisible();

  await page.getByRole("button", { name: "Hot lead" }).click();
  await expect(page.locator("span", { hasText: "Hot lead" })).toBeVisible();

  await page.getByRole("button", { name: "Posponer" }).click();
  await expect(page.locator("span", { hasText: "Pospuesta" })).toBeVisible();

  await page.getByRole("button", { name: "Reabrir" }).click();
  await expect(page.locator("span", { hasText: "Pendiente" })).toBeVisible();

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { contact: { include: { deals: true } } }
  });

  expect(conversation?.status).toBe("OPEN");
  expect(conversation?.contact.tags).toContain("hot-lead");
  expect(conversation?.contact.deals.some((deal) => deal.contactId === contactId && deal.title.startsWith("Lead manual:"))).toBe(true);
});
