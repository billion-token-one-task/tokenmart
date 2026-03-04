import type { ProviderAdapter } from "./types";
import { OpenRouterAdapter } from "./openrouter";
import { OpenAIAdapter } from "./openai";
import { AnthropicAdapter } from "./anthropic";

// ─────────────────────────────────────────────────────────────────────────────
// Provider registry
// ─────────────────────────────────────────────────────────────────────────────

const providers: Record<string, ProviderAdapter> = {
  openrouter: new OpenRouterAdapter(),
  openai: new OpenAIAdapter(),
  anthropic: new AnthropicAdapter(),
};

/**
 * Retrieve a provider adapter by its registry name.
 *
 * @param name  One of "openrouter", "openai", "anthropic".
 * @returns The adapter instance or `null` if unknown.
 */
export function getProvider(name: string): ProviderAdapter | null {
  return providers[name] ?? null;
}

/**
 * Determine the correct provider adapter for a given model ID based on
 * naming conventions:
 *
 *   - Models containing "/" (e.g. "openai/gpt-4o", "anthropic/claude-3-opus")
 *     are routed through **OpenRouter** by default, since the slash-prefix is
 *     OpenRouter's model naming scheme.
 *
 *   - Models starting with "gpt-" or "o1-" or "o3-" or "o4-" or "dall-e"
 *     (bare OpenAI model IDs) are routed directly to **OpenAI**.
 *
 *   - Models starting with "claude-" are routed directly to **Anthropic**.
 *
 *   - Everything else falls back to **OpenRouter** as the universal gateway.
 */
export function getProviderForModel(
  modelId: string,
): { provider: ProviderAdapter; providerName: string } | null {
  // Slash-prefixed models always go through OpenRouter.
  if (modelId.includes("/")) {
    return { provider: providers.openrouter, providerName: "openrouter" };
  }

  // Bare OpenAI model IDs.
  if (
    modelId.startsWith("gpt-") ||
    modelId.startsWith("o1-") ||
    modelId.startsWith("o3-") ||
    modelId.startsWith("o4-") ||
    modelId.startsWith("dall-e") ||
    modelId.startsWith("chatgpt-")
  ) {
    return { provider: providers.openai, providerName: "openai" };
  }

  // Bare Anthropic model IDs.
  if (modelId.startsWith("claude-")) {
    return { provider: providers.anthropic, providerName: "anthropic" };
  }

  // Default: route through OpenRouter since it supports the widest range.
  return { provider: providers.openrouter, providerName: "openrouter" };
}

/**
 * Return the full list of registered provider names.
 */
export function listProviderNames(): string[] {
  return Object.keys(providers);
}
