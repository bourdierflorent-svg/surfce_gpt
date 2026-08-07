import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { readPublicMapConfig } from "@/lib/maps/config";

describe("MapLibre style configuration", () => {
  it("builds the current MapTiler streets style from the protected browser key", () => {
    const config = readPublicMapConfig({ MAP_TILES_API_KEY: "maptiler-browser-key" });

    expect(config?.provider).toBe("maptiler");
    const styleUrl = new URL(config!.styleUrl);
    expect(styleUrl.origin).toBe("https://api.maptiler.com");
    expect(styleUrl.pathname).toBe("/maps/streets-v4/style.json");
    expect(styleUrl.searchParams.get("key")).toBe("maptiler-browser-key");
  });

  it("adds the key to an explicit MapTiler style and accepts another HTTPS provider", () => {
    expect(
      readPublicMapConfig({
        MAP_TILES_API_KEY: "maptiler-browser-key",
        NEXT_PUBLIC_MAP_STYLE_URL: "https://api.maptiler.com/maps/bright-v2/style.json",
      })?.styleUrl,
    ).toContain("key=maptiler-browser-key");

    expect(
      readPublicMapConfig({
        NEXT_PUBLIC_MAP_STYLE_URL: "https://maps.example.com/style.json",
      }),
    ).toEqual({
      provider: "external",
      styleUrl: "https://maps.example.com/style.json",
    });
  });

  it("falls back locally when no usable HTTPS style is configured", () => {
    expect(readPublicMapConfig({})).toBeNull();
    expect(
      readPublicMapConfig({ NEXT_PUBLIC_MAP_STYLE_URL: "http://maps.example.com/style.json" }),
    ).toBeNull();
  });

  it("keeps a real map height after MapLibre applies its relative container rule", () => {
    const component = readFileSync(
      join(process.cwd(), "src/components/map/discovery-map.tsx"),
      "utf8",
    );
    expect(component).toContain('className="h-full min-h-[31rem] w-full"');
  });
});
