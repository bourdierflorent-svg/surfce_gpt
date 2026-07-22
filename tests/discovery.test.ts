import { describe, expect, it } from "vitest";

import { discoverySearchSchema } from "@/features/discovery/schemas";
import { createCircleRing, distanceInMeters, isPointInPolygon } from "@/lib/geo/geometry";
import { MockPlacesProvider } from "@/providers/places/mock";

describe("geographic helpers", () => {
  it("computes a plausible distance and a closed radius ring", () => {
    const distance = distanceInMeters(
      { latitude: 48.8667, longitude: 2.3333 },
      { latitude: 48.8721, longitude: 2.3135 },
    );
    expect(distance).toBeGreaterThan(1_000);
    expect(distance).toBeLessThan(2_000);

    const ring = createCircleRing({ latitude: 48.8667, longitude: 2.3333 }, 2_000, 16);
    expect(ring).toHaveLength(17);
    expect(ring[0]).toEqual(ring.at(-1));
  });

  it("detects whether a point is inside a polygon", () => {
    const ring: [number, number][] = [
      [2.3, 48.84],
      [2.37, 48.84],
      [2.37, 48.89],
      [2.3, 48.89],
    ];
    expect(isPointInPolygon({ latitude: 48.86, longitude: 2.33 }, ring)).toBe(true);
    expect(isPointInPolygon({ latitude: 48.9, longitude: 2.4 }, ring)).toBe(false);
  });
});

describe("MockPlacesProvider", () => {
  const provider = new MockPlacesProvider();

  it("returns only fictional, zero-cost candidates inside a radius", async () => {
    const result = await provider.search({
      mode: "radius",
      center: { latitude: 48.8667, longitude: 2.3333 },
      radiusMeters: 5_000,
    });
    expect(result.total).toBeGreaterThanOrEqual(8);
    expect(result.isFictional).toBe(true);
    expect(result.estimatedExternalCost).toBe(0);
    expect(
      result.results.every((candidate) => candidate.domain?.endsWith(".example") ?? true),
    ).toBe(true);
  });

  it("filters by polygon, text and available website", async () => {
    const result = await provider.search({
      mode: "polygon",
      query: "communication",
      polygon: [
        [2.29, 48.84],
        [2.39, 48.84],
        [2.39, 48.89],
        [2.29, 48.89],
      ],
      filters: { hasWebsite: true },
    });
    expect(result.results.map((candidate) => candidate.tradeName)).toEqual([
      "Studio Huit Communication",
      "Atelier Signal",
    ]);
  });

  it("loads details by stable provider reference", async () => {
    expect((await provider.getDetails("mock-place-rive-conseil"))?.tradeName).toBe(
      "Cabinet Rive Conseil",
    );
    expect(await provider.getDetails("unknown")).toBeNull();
  });
});

describe("discovery input validation", () => {
  it("requires a radius center or at least three polygon points", () => {
    expect(discoverySearchSchema.safeParse({ mode: "radius", filters: {} }).success).toBe(false);
    expect(
      discoverySearchSchema.safeParse({
        mode: "polygon",
        polygon: [
          [2.3, 48.8],
          [2.4, 48.8],
        ],
        filters: {},
      }).success,
    ).toBe(false);
  });
});
