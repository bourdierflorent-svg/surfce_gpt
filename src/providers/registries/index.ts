import { MockCompanyRegistryProvider } from "./mock";
import { SireneCompanyRegistryProvider } from "./sirene";
import type { CompanyRegistryProvider } from "./types";

export function getCompanyRegistryProvider(): CompanyRegistryProvider {
  const provider = process.env.COMPANY_REGISTRY_PROVIDER?.trim().toLowerCase() || "mock";
  if (provider === "mock") return new MockCompanyRegistryProvider();
  if (provider === "sirene" || provider === "insee" || provider === "insee_sirene") {
    return new SireneCompanyRegistryProvider(
      process.env.SIRENE_API_BASE_URL ?? "",
      process.env.SIRENE_API_KEY ?? "",
    );
  }

  throw new Error(`Le registre ${provider} n’est pas supporté par SURFCE.`);
}

export type * from "./types";
