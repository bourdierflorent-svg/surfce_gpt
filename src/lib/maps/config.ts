type Environment = Readonly<Record<string, string | undefined>>;

export type PublicMapProvider = "maptiler" | "external";

export interface PublicMapConfig {
  provider: PublicMapProvider;
  styleUrl: string;
}

const defaultMapTilerStyleUrl = "https://api.maptiler.com/maps/streets-v4/style.json";

function validHttpsUrl(value: string | undefined) {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function isMapTilerHost(hostname: string) {
  return hostname === "maptiler.com" || hostname.endsWith(".maptiler.com");
}

export function readPublicMapConfig(
  environment: Environment = process.env,
): PublicMapConfig | null {
  const apiKey = environment.MAP_TILES_API_KEY?.trim();
  const explicitStyle = validHttpsUrl(environment.NEXT_PUBLIC_MAP_STYLE_URL);

  if (explicitStyle) {
    const isMapTiler = isMapTilerHost(explicitStyle.hostname);
    if (isMapTiler && !explicitStyle.searchParams.has("key")) {
      if (!apiKey) return null;
      explicitStyle.searchParams.set("key", apiKey);
    }

    return {
      provider: isMapTiler ? "maptiler" : "external",
      styleUrl: explicitStyle.toString(),
    };
  }

  if (!apiKey) return null;

  const styleUrl = new URL(defaultMapTilerStyleUrl);
  styleUrl.searchParams.set("key", apiKey);
  return { provider: "maptiler", styleUrl: styleUrl.toString() };
}
