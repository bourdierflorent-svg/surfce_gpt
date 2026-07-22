import { MockAiProvider } from "./mock";
import type { AiProvider } from "./types";

export function getAiProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase() || "mock";
  if (provider === "mock") return new MockAiProvider();

  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      `Le provider IA ${provider} n’est pas configuré. Ajoutez sa clé côté serveur ou utilisez AI_PROVIDER=mock.`,
    );
  }

  throw new Error(`Le provider IA ${provider} n’est pas encore activé dans SURFCE.`);
}

export type * from "./types";
