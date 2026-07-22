import { MockWebsiteEnrichmentProvider } from "./mock-website";
import type { WebsiteEnrichmentProvider } from "./types";

export function getWebsiteEnrichmentProvider(): WebsiteEnrichmentProvider {
  return new MockWebsiteEnrichmentProvider();
}

export type * from "./types";
