import { expect, test } from "@playwright/test";

test("parcourt le scénario commercial mock en lecture contrôlée", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("SURFCE", { exact: true }).first()).toBeVisible();

  await page.getByRole("link", { name: "Explorer" }).click();
  await expect(page).toHaveURL(/\/explore/);
  await page.getByPlaceholder("Nom, activité, secteur…").fill("agences de communication");
  await page.getByRole("button", { name: "Rechercher", exact: true }).click();
  await expect(page.getByText("Studio Huit Communication", { exact: true }).first()).toBeVisible();

  await page.goto("/companies/50000000-0000-0000-0000-000000000001");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Studio Huit");
  await expect(page.getByText("Persona", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Recommandations", { exact: true }).first()).toBeVisible();

  await page.goto("/campaigns/72000000-0000-0000-0000-000000000001");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Afterwork agences parisiennes",
  );
  await expect(page.getByText("Opposition avant chaque envoi", { exact: true })).toBeVisible();

  await page.goto("/inbox");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Chaque réponse devient un signal",
  );
  await expect(page.getByText("Aucune conversation dans ce filtre")).toBeVisible();

  await page.goto("/opportunities/82000000-0000-0000-0000-000000000001");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Studio Huit");
  await expect(page.getByText("Rendez-vous", { exact: true }).first()).toBeVisible();
});

test("rend les preuves de conformité et l’opposition visibles", async ({ page }) => {
  await page.goto("/settings/compliance");
  await expect(page.getByRole("heading", { name: "Conformité, avec preuve." })).toBeVisible();
  await expect(page.getByText("Oppositions", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Preuve conservée/).first()).toBeVisible();
  await expect(
    page.getByText("Opposition globale conservée avant toute anonymisation."),
  ).toBeVisible();
});
