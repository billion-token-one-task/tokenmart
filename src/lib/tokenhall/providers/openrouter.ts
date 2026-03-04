import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatStreamChunk,
  ModelInfo,
} from "@/types/tokenhall";
import type { ProviderAdapter } from "./types";
import { ProviderError } from "./types";

const BASE_URL = "https://openrouter.ai/api/v1";
const HTTP_REFERER = process.env.NEXT_PUBLIC_APP_URL ?? "https://tokenmart.ai";
const X_TITLE = "TokenMart / TokenHall";

/**
 * OpenRouter provider adapter.
 *
 * OpenRouter exposes an OpenAI-compatible API, so the request/response
 * mapping is mostly pass-through.  This is the PRIMARY provider -- models
 * specified with a slash (e.g. "openai/gpt-4o") route here by default.
 */
export class OpenRouterAdapter implements ProviderAdapter {
  readonly name = "openrouter";

  // ── Non-streaming chat completion ──────────────────────────────────

  async chat(
    request: ChatCompletionRequest,
    apiKey: string,
  ): Promise<ChatCompletionResponse> {
    const body = this.buildRequestBody(request, false);

    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: this.headers(apiKey),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "unknown error");
      throw new ProviderError(
        `OpenRouter API error (${res.status}): ${errorBody}`,
        res.status,
        this.name,
        errorBody,
      );
    }

    const json = await res.json();
    return this.normaliseResponse(json);
  }

  // ── Streaming chat completion ──────────────────────────────────────

  async *chatStream(
    request: ChatCompletionRequest,
    apiKey: string,
  ): AsyncIterable<ChatStreamChunk> {
    const body = this.buildRequestBody(request, true);

    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: this.headers(apiKey),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "unknown error");
      throw new ProviderError(
        `OpenRouter streaming error (${res.status}): ${errorBody}`,
        res.status,
        this.name,
        errorBody,
      );
    }

    if (!res.body) {
      throw new ProviderError(
        "OpenRouter returned no response body for streaming request",
        500,
        this.name,
      );
    }

    yield* this.readSSEStream(res.body);
  }

  // ── Model listing ──────────────────────────────────────────────────

  async listModels(apiKey: string): Promise<ModelInfo[]> {
    const res = await fetch(`${BASE_URL}/models`, {
      method: "GET",
      headers: this.headers(apiKey),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "unknown error");
      throw new ProviderError(
        `OpenRouter models error (${res.status}): ${errorBody}`,
        res.status,
        this.name,
        errorBody,
      );
    }

    const json = await res.json();
    const data: Record<string, unknown>[] = (json.data as Record<string, unknown>[]) ?? [];

    return data.map((m) => ({
      id: String(m.id ?? ""),
      name: String(m.name ?? m.id ?? ""),
      provider: "openrouter",
      description: m.description ? String(m.description) : null,
      context_length: Number(m.context_length ?? 0),
      max_output_tokens: m.top_provider
        ? Number(
            (m.top_provider as Record<string, unknown>).max_completion_tokens ??
              0,
          ) || null
        : null,
      pricing: {
        prompt: String(
          (m.pricing as Record<string, unknown>)?.prompt ?? "0",
        ),
        completion: String(
          (m.pricing as Record<string, unknown>)?.completion ?? "0",
        ),
      },
      supports_streaming: true,
      supports_tools: Boolean(
        (m.supported_parameters as string[] | undefined)?.includes("tools"),
      ),
      supports_vision: Boolean(
        (m.architecture as Record<string, unknown>)?.input_modalities
          ? (
              (m.architecture as Record<string, unknown>)
                .input_modalities as string[]
            ).includes("image")
          : false,
      ),
    }));
  }

  // ── Internals ──────────────────────────────────────────────────────

  private headers(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": HTTP_REFERER,
      "X-Title": X_TITLE,
    };
  }

  /**
   * Build the request body.  We pass through most fields since OpenRouter
   * speaks OpenAI-compatible JSON.
   */
  private buildRequestBody(
    request: ChatCompletionRequest,
    stream: boolean,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      stream,
    };

    if (request.models) body.models = request.models;
    if (request.temperature !== undefined)
      body.temperature = request.temperature;
    if (request.top_p !== undefined) body.top_p = request.top_p;
    if (request.frequency_penalty !== undefined)
      body.frequency_penalty = request.frequency_penalty;
    if (request.presence_penalty !== undefined)
      body.presence_penalty = request.presence_penalty;
    if (request.max_tokens !== undefined)
      body.max_tokens = request.max_tokens;
    if (request.max_completion_tokens !== undefined)
      body.max_completion_tokens = request.max_completion_tokens;
    if (request.stop !== undefined) body.stop = request.stop;
    if (request.tools) body.tools = request.tools;
    if (request.tool_choice !== undefined)
      body.tool_choice = request.tool_choice;
    if (request.response_format)
      body.response_format = request.response_format;
    if (request.seed !== undefined) body.seed = request.seed;
    if (request.user) body.user = request.user;
    if (request.provider) body.provider = request.provider;

    // Request usage info in streaming mode so we get token counts.
    if (stream) {
      body.stream_options = { include_usage: true };
    }

    return body;
  }

  /**
   * Normalise an OpenRouter non-streaming response to the standard
   * ChatCompletionResponse shape.
   */
  private normaliseResponse(json: Record<string, unknown>): ChatCompletionResponse {
    const usage = json.usage as Record<string, number> | undefined;
    return {
      id: String(json.id ?? `or-${Date.now()}`),
      object: "chat.completion",
      created: Number(json.created ?? Math.floor(Date.now() / 1000)),
      model: String(json.model ?? ""),
      choices: (json.choices as ChatCompletionResponse["choices"]) ?? [],
      usage: {
        prompt_tokens: usage?.prompt_tokens ?? 0,
        completion_tokens: usage?.completion_tokens ?? 0,
        total_tokens: usage?.total_tokens ?? 0,
      },
    };
  }

  /**
   * Read an SSE response body and yield ChatStreamChunk objects.
   *
   * Handles the standard "data: {json}\n\n" / "data: [DONE]" protocol.
   */
  private async *readSSEStream(
    body: ReadableStream<Uint8Array>,
  ): AsyncIterable<ChatStreamChunk> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // Keep the last (potentially incomplete) line in the buffer.
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) continue; // comment or blank
          if (!trimmed.startsWith("data: ")) continue;

          const payload = trimmed.slice(6); // strip "data: "
          if (payload === "[DONE]") return;

          try {
            const chunk = JSON.parse(payload) as ChatStreamChunk;
            // Normalise the object type.
            chunk.object = "chat.completion.chunk";
            yield chunk;
          } catch {
            // Skip malformed JSON lines -- they sometimes appear during
            // transient issues.
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
