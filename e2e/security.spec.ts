import { expect, test } from "@playwright/test";

const validDiscoverySearch = {
  query: "communication",
  category: "",
  city: "Paris",
  district: "",
  mode: "radius",
  center: { latitude: 48.8667, longitude: 2.3333 },
  radiusMeters: 4_500,
  filters: {},
};

test("expose une sonde vivante et les en-têtes de sécurité", async ({ request }) => {
  const response = await request.get("/api/health/live");
  expect(response.status()).toBe(200);
  expect(response.headers()["x-request-id"]).toMatch(/^[a-zA-Z0-9._-]+$/);
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  await expect(response.json()).resolves.toMatchObject({
    status: "ok",
    service: "surfce-web",
  });
});

test("refuse une mutation API sans preuve d’origine", async ({ request }) => {
  const response = await request.post("/api/discovery/search", {
    data: validDiscoverySearch,
  });
  expect(response.status()).toBe(403);
  await expect(response.json()).resolves.toMatchObject({
    error: "Origine de la requête non autorisée.",
  });
});

test("accepte une mutation same-origin et retourne la recherche mock", async ({ page }) => {
  await page.goto("/dashboard");
  const result = await page.evaluate(async (payload) => {
    const response = await fetch("/api/discovery/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    return {
      status: response.status,
      requestId: response.headers.get("x-request-id"),
      body: await response.json(),
    };
  }, validDiscoverySearch);

  expect(result.status).toBe(200);
  expect(result.requestId).toBeTruthy();
  expect(result.body).toMatchObject({
    provider: "mock_places",
    isFictional: true,
  });
  expect(result.body.results.length).toBeGreaterThan(0);
});
