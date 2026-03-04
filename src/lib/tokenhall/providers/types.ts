import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatStreamChunk,
  ModelInfo,
} from "@/types/tokenhall";

/**
 * Provider adapter interface.
 *
 * Every LLM provider (OpenRouter, OpenAI, Anthropic, etc.) implements this
 * interface so the router can call any of them interchangeably.
 */
export interface ProviderAdapter {
  /** Human-readable name used in logs and the generations table. */
  name: string;

  /**
   * Transform a TokenHall request into the provider's format and make the
   * API call, returning a normalised ChatCompletionResponse.
   */
  chat(
    request: ChatCompletionRequest,
    apiKey: string,
  ): Promise<ChatCompletionResponse>;

  /**
   * Stream a chat completion.  Returns an async iterable that yields
   * normalised ChatStreamChunk objects.
   */
  chatStream(
    request: ChatCompletionRequest,
    apiKey: string,
  ): AsyncIterable<ChatStreamChunk>;

  /**
   * List available models from this provider.
   */
  listModels(apiKey: string): Promise<ModelInfo[]>;
}

/**
 * Error thrown by a provider adapter when the upstream API returns an error.
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly providerName: string,
    public readonly upstream?: unknown,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
