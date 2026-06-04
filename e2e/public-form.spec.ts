import { expect, test } from "@playwright/test";
import { cleanupE2eData, demoAgencyId, prisma } from "./helpers";

test.beforeEach(async () => {
  await cleanupE2eData();
});

test.afterAll(async () => {
  await cleanupE2eData();
  await prisma.$disconnect();
});

test("public form creates a contact, submission, workflow run and pipeline deal", async ({ page }) => {
  const agencyId = await demoAgencyId();
  const stamp = String(Date.now());
  const email = `form-${stamp}@e2e.local`;

  await page.goto("/f/demo-agency/demo-form-lead-capture");
  await page.fill("#firstName", "E2EForm");
  await page.fill("#lastName", stamp);
  await page.fill("#email", email);
  await page.fill("#phone", `+1 555 ${stamp.slice(-4)}`);
  await page.selectOption("#package", "Crecimiento");
  await page.fill("#message", "Consulta E2E desde formulario");
  await page.getByRole("button", { name: "Enviar formulario" }).click();

  await expect(page.getByText("Formulario enviado")).toBeVisible();

  const contact = await prisma.contact.findFirst({
    where: { agencyId, email },
    include: {
      formSubmissions: true,
      workflowRuns: true,
      deals: { include: { stage: { include: { pipeline: true } } } }
    }
  });

  expect(contact).not.toBeNull();
  expect(contact?.source).toBe("Form");
  expect(contact?.tags).toContain("form-lead");
  expect(contact?.formSubmissions.length).toBeGreaterThan(0);
  expect(contact?.workflowRuns.length).toBeGreaterThan(0);
  expect(contact?.deals.some((deal) => deal.title.startsWith("Lead de formulario:") && deal.stage.pipeline.agencyId === agencyId)).toBe(true);
});
