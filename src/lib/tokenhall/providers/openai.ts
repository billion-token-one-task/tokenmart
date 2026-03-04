import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatStreamChunk,
  ModelInfo,
} from "@/types/tokenhall";
import type { ProviderAdapter } from "./types";
import { ProviderError } from "./types";

const BASE_URL = "https://api.openai.com/v1";

/**
 * Direct OpenAI provider adapter.
 *
 * Handles models that should be routed straight to OpenAI (e.g. bare model
 * IDs like "gpt-4o" without a slash prefix).
 */
export class OpenAIAdapter implements ProviderAdapter {
  readonly name = "openai";

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
        `OpenAI API error (${res.status}): ${errorBody}`,
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
        `OpenAI streaming error (${res.status}): ${errorBody}`,
        res.status,
        this.name,
        errorBody,
      );
    }

    if (!res.body) {
      throw new ProviderError(
        "OpenAI returned no response body for streaming request",
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
        `OpenAI models error (${res.status}): ${errorBody}`,
        res.status,
        this.name,
        errorBody,
      );
    }

    const json = await res.json();
    const data: Record<string, unknown>[] = json.data ?? [];

    return data.map((m) => ({
      id: String(m.id ?? ""),
      name: String(m.id ?? ""),
      provider: "openai",
      description: null,
      context_length: 0, // OpenAI /models does not include context length
      max_output_tokens: null,
      pricing: { prompt: "0", completion: "0" }, // Not available from the models endpoint
      supports_streaming: true,
      supports_tools: true,
      supports_vision: String(m.id ?? "").includes("gpt-4"),
    }));
  }

  // ── Internals ──────────────────────────────────────────────────────

  private headers(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
  }

  private buildRequestBody(
    request: ChatCompletionRequest,
    stream: boolean,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      stream,
    };

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

    if (stream) {
      body.stream_options = { include_usage: true };
    }

    return body;
  }

  private normaliseResponse(json: Record<string, unknown>): ChatCompletionResponse {
    const usage = json.usage as Record<string, number> | undefined;
    return {
      id: String(json.id ?? `oai-${Date.now()}`),
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
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) continue;
          if (!trimmed.startsWith("data: ")) continue;

          const payload = trimmed.slice(6);
          if (payload === "[DONE]") return;

          try {
            const chunk = JSON.parse(payload) as ChatStreamChunk;
            chunk.object = "chat.completion.chunk";
            yield chunk;
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
