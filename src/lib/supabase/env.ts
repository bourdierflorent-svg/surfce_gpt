import { z } from "zod";

const publicConfigSchema = z.object({
  url: z.string().url(),
  anonKey: z.string().min(1),
});

type Environment = Readonly<Record<string, string | undefined>>;

export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
}

export class SupabaseConfigurationError extends Error {
  constructor() {
    super("Supabase public configuration is missing or invalid.");
    this.name = "SupabaseConfigurationError";
  }
}

export function readSupabasePublicConfig(
  environment: Environment = process.env,
): SupabasePublicConfig | null {
  const parsed = publicConfigSchema.safeParse({
    url: environment.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  return parsed.success ? parsed.data : null;
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const config = readSupabasePublicConfig();

  if (!config) {
    throw new SupabaseConfigurationError();
  }

  return config;
}

export function isSupabaseConfigured(): boolean {
  return readSupabasePublicConfig() !== null;
}
