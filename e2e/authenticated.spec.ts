import { expect, test } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL?.trim();
const password = process.env.E2E_USER_PASSWORD;

test.describe("parcours authentifié SURFCE", () => {
  test.skip(!email || !password, "E2E_USER_EMAIL et E2E_USER_PASSWORD sont requis.");

  test("connecte le propriétaire, suit le parcours et confirme le blocage d’opposition", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Adresse e-mail").fill(email!);
    await page.getByLabel("Mot de passe").fill(password!);
    await page.getByRole("button", { name: "Continuer" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    for (const path of [
      "/explore",
      "/companies/50000000-0000-0000-0000-000000000001",
      "/campaigns/72000000-0000-0000-0000-000000000001",
      "/inbox/75000000-0000-0000-0000-000000000001",
      "/opportunities/82000000-0000-0000-0000-000000000001",
      "/settings/compliance",
      "/settings/audit",
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }

    const blockedEnrollment = await page.evaluate(async () => {
      const response = await fetch("/api/campaigns/72000000-0000-0000-0000-000000000002/enroll", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contactId: "70000000-0000-0000-0000-000000000015",
        }),
      });
      return {
        status: response.status,
        body: await response.json(),
      };
    });
    expect(blockedEnrollment.status, JSON.stringify(blockedEnrollment.body)).toBe(409);
    expect(blockedEnrollment.body).toMatchObject({
      safeToRetry: false,
    });
    expect(blockedEnrollment.body.error).toContain("opposition active");
  });
});
