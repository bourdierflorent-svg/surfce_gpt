import { MockCompanyRegistryProvider } from "./mock";
import type { CompanyRegistryProvider } from "./types";

export function getCompanyRegistryProvider(): CompanyRegistryProvider {
  const provider = process.env.COMPANY_REGISTRY_PROVIDER?.trim().toLowerCase() || "mock";
  if (provider === "mock") return new MockCompanyRegistryProvider();

  throw new Error(
    `Le registre ${provider} n’est pas activé. Configurez un provider serveur autorisé ou revenez à COMPANY_REGISTRY_PROVIDER=mock.`,
  );
}

export type * from "./types";
