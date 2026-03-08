import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatMessage,
  ChatStreamChunk,
  ModelInfo,
  ToolCall,
  ToolDefinition,
} from "@/types/tokenhall";
import type { ProviderAdapter } from "./types";
import { ProviderError } from "./types";

const BASE_URL = "https://api.anthropic.com/v1";
const ANTHROPIC_VERSION = "2023-06-01";

// ─────────────────────────────────────────────────────────────────────────────
// Internal Anthropic-format types
// ─────────────────────────────────────────────────────────────────────────────

interface AnthropicContentBlock {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string | AnthropicContentBlock[];
}

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

interface AnthropicTool {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
}

interface AnthropicResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: "end_turn" | "max_tokens" | "stop_sequence" | "tool_use" | null;
  usage: { input_tokens: number; output_tokens: number };
}

// ─────────────────────────────────────────────────────────────────────────────
// Adapter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Direct Anthropic Messages API adapter.
 *
 * Translates between the OpenAI-style TokenHall types and Anthropic's native
 * Messages format, then translates the response back.
 */
export class AnthropicAdapter implements ProviderAdapter {
  readonly name = "anthropic";

  // ── Non-streaming ──────────────────────────────────────────────────

  async chat(
    request: ChatCompletionRequest,
    apiKey: string,
  ): Promise<ChatCompletionResponse> {
    const body = this.buildRequestBody(request, false);

    const res = await fetch(`${BASE_URL}/messages`, {
      method: "POST",
      headers: this.headers(apiKey),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "unknown error");
      throw new ProviderError(
        `Anthropic API error (${res.status}): ${errorBody}`,
        res.status,
        this.name,
        errorBody,
      );
    }

    const json = (await res.json()) as AnthropicResponse;
    return this.toOpenAIResponse(json);
  }

  // ── Streaming ──────────────────────────────────────────────────────

  async *chatStream(
    request: ChatCompletionRequest,
    apiKey: string,
  ): AsyncIterable<ChatStreamChunk> {
    const body = this.buildRequestBody(request, true);

    const res = await fetch(`${BASE_URL}/messages`, {
      method: "POST",
      headers: this.headers(apiKey),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "unknown error");
      throw new ProviderError(
        `Anthropic streaming error (${res.status}): ${errorBody}`,
        res.status,
        this.name,
        errorBody,
      );
    }

    if (!res.body) {
      throw new ProviderError(
        "Anthropic returned no response body for streaming request",
        500,
        this.name,
      );
    }

    yield* this.readAnthropicStream(res.body);
  }

  // ── Model listing ──────────────────────────────────────────────────

  async listModels(apiKey: string): Promise<ModelInfo[]> {
    // Anthropic does not expose a public /models endpoint, so we return a
    // curated static list of the most commonly used models.
    void apiKey;
    return [
      this.modelEntry("claude-sonnet-4-20250514", "Claude Sonnet 4", 200000, 8192, 3, 15),
      this.modelEntry("claude-opus-4-20250514", "Claude Opus 4", 200000, 32000, 15, 75),
      this.modelEntry("claude-3-5-haiku-20241022", "Claude 3.5 Haiku", 200000, 8192, 0.8, 4),
    ];
  }

  // ── Format translation helpers ─────────────────────────────────────

  private headers(apiKey: string): Record<string, string> {
    return {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "Content-Type": "application/json",
    };
  }

  /**
   * Convert a TokenHall/OpenAI-style request body into Anthropic Messages
   * format.
   */
  private buildRequestBody(
    request: ChatCompletionRequest,
    stream: boolean,
  ): Record<string, unknown> {
    const { system, messages } = this.convertMessages(request.messages);

    const body: Record<string, unknown> = {
      model: request.model,
      messages,
      stream,
    };

    if (system) body.system = system;

    // max_tokens is required by Anthropic
    body.max_tokens =
      request.max_tokens ?? request.max_completion_tokens ?? 4096;

    if (request.temperature !== undefined)
      body.temperature = request.temperature;
    if (request.top_p !== undefined) body.top_p = request.top_p;
    if (request.stop !== undefined) {
      body.stop_sequences = Array.isArray(request.stop)
        ? request.stop
        : [request.stop];
    }

    // Convert OpenAI-format tools to Anthropic format
    if (request.tools && request.tools.length > 0) {
      body.tools = this.convertTools(request.tools);
    }
    if (request.tool_choice !== undefined) {
      body.tool_choice = this.convertToolChoice(request.tool_choice);
    }

    return body;
  }

  /**
   * Separate the system message from conversation messages and convert
   * content into Anthropic's block format.
   */
  private convertMessages(messages: ChatMessage[]): {
    system: string | undefined;
    messages: AnthropicMessage[];
  } {
    let system: string | undefined;
    const out: AnthropicMessage[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        // Anthropic expects a single top-level "system" string.
        const text =
          typeof msg.content === "string"
            ? msg.content
            : msg.content
                .filter((p) => p.type === "text")
                .map((p) => p.text ?? "")
                .join("\n");
        system = system ? `${system}\n${text}` : text;
        continue;
      }

      if (msg.role === "tool") {
        // Tool result messages map to user messages with tool_result content.
        out.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: msg.tool_call_id ?? "",
              content:
                typeof msg.content === "string"
                  ? msg.content
                  : JSON.stringify(msg.content),
            },
          ],
        });
        continue;
      }

      const role: "user" | "assistant" =
        msg.role === "assistant" ? "assistant" : "user";

      // If the assistant message contains tool_calls, represent them as
      // tool_use content blocks.
      if (msg.role === "assistant" && msg.tool_calls?.length) {
        const blocks: AnthropicContentBlock[] = [];

        // Include any text content first.
        if (msg.content) {
          const text =
            typeof msg.content === "string"
              ? msg.content
              : msg.content
                  .filter((p) => p.type === "text")
                  .map((p) => p.text ?? "")
                  .join("");
          if (text) {
            blocks.push({ type: "text", text });
          }
        }

        for (const tc of msg.tool_calls) {
          blocks.push({
            type: "tool_use",
            id: tc.id,
            name: tc.function.name,
            input: JSON.parse(tc.function.arguments || "{}"),
          });
        }

        out.push({ role: "assistant", content: blocks });
        continue;
      }

      // Standard text message.
      if (typeof msg.content === "string") {
        out.push({ role, content: msg.content });
      } else if (Array.isArray(msg.content)) {
        const blocks: AnthropicContentBlock[] = msg.content.map((part) => {
          if (part.type === "text") {
            return { type: "text" as const, text: part.text ?? "" };
          }
          // Image parts -- Anthropic uses a different format but we pass
          // a simplified text fallback for now.
          return {
            type: "text" as const,
            text: `[image: ${part.image_url?.url ?? "unknown"}]`,
          };
        });
        out.push({ role, content: blocks });
      }
    }

    // Anthropic requires messages to alternate user/assistant.  Merge
    // consecutive same-role messages.
    const merged: AnthropicMessage[] = [];
    for (const m of out) {
      const last = merged[merged.length - 1];
      if (last && last.role === m.role) {
        // Merge content into the previous message.
        const prevContent = this.ensureBlocks(last.content);
        const newContent = this.ensureBlocks(m.content);
        last.content = [...prevContent, ...newContent];
      } else {
        merged.push({
          role: m.role,
          content: m.content,
        });
      }
    }

    return { system, messages: merged };
  }

  private ensureBlocks(
    content: string | AnthropicContentBlock[],
  ): AnthropicContentBlock[] {
    if (typeof content === "string") {
      return [{ type: "text", text: content }];
    }
    return content;
  }

  private convertTools(tools: ToolDefinition[]): AnthropicTool[] {
    return tools.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: (t.function.parameters as Record<string, unknown>) ?? {
        type: "object",
        properties: {},
      },
    }));
  }

  private convertToolChoice(
    choice: ChatCompletionRequest["tool_choice"],
  ): Record<string, unknown> | undefined {
    if (choice === "none") return { type: "none" };
    if (choice === "auto") return { type: "auto" };
    if (choice === "required") return { type: "any" };
    if (typeof choice === "object" && choice.function?.name) {
      return { type: "tool", name: choice.function.name };
    }
    return undefined;
  }

  /**
   * Convert a non-streaming Anthropic response back to OpenAI format.
   */
  private toOpenAIResponse(ar: AnthropicResponse): ChatCompletionResponse {
    const message = this.anthropicContentToMessage(ar.content);

    return {
      id: ar.id,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: ar.model,
      choices: [
        {
          index: 0,
          message,
          finish_reason: this.mapStopReason(ar.stop_reason),
        },
      ],
      usage: {
        prompt_tokens: ar.usage.input_tokens,
        completion_tokens: ar.usage.output_tokens,
        total_tokens: ar.usage.input_tokens + ar.usage.output_tokens,
      },
    };
  }

  /**
   * Convert Anthropic content blocks to an OpenAI-style ChatMessage.
   */
  private anthropicContentToMessage(
    blocks: AnthropicContentBlock[],
  ): ChatMessage {
    const textParts: string[] = [];
    const toolCalls: ToolCall[] = [];

    for (const block of blocks) {
      if (block.type === "text" && block.text) {
        textParts.push(block.text);
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id ?? `call_${Date.now()}`,
          type: "function",
          function: {
            name: block.name ?? "",
            arguments: JSON.stringify(block.input ?? {}),
          },
        });
      }
    }

    const message: ChatMessage = {
      role: "assistant",
      content: textParts.join(""),
    };

    if (toolCalls.length > 0) {
      message.tool_calls = toolCalls;
    }

    return message;
  }

  private mapStopReason(
    reason: AnthropicResponse["stop_reason"],
  ): "stop" | "length" | "tool_calls" | "content_filter" | null {
    switch (reason) {
      case "end_turn":
      case "stop_sequence":
        return "stop";
      case "max_tokens":
        return "length";
      case "tool_use":
        return "tool_calls";
      default:
        return null;
    }
  }

  // ── Streaming SSE reader ───────────────────────────────────────────

  /**
   * Read Anthropic's SSE streaming events and yield OpenAI-compatible
   * ChatStreamChunk objects.
   *
   * Anthropic stream event types:
   *   message_start     -> contains message metadata and input token count
   *   content_block_start -> new content block beginning
   *   content_block_delta -> incremental text or tool input
   *   content_block_stop  -> content block finished
   *   message_delta     -> stop reason and output token count
   *   message_stop      -> stream finished
   */
  private async *readAnthropicStream(
    body: ReadableStream<Uint8Array>,
  ): AsyncIterable<ChatStreamChunk> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    // Accumulated state across events.
    let messageId = "";
    let model = "";
    let inputTokens = 0;
    let outputTokens = 0;
    let currentBlockIndex = 0;
    let currentToolCallId: string | undefined;
    let currentToolCallName: string | undefined;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        let currentEvent = "";

        for (const line of lines) {
          const trimmed = line.trim();

          if (trimmed.startsWith("event: ")) {
            currentEvent = trimmed.slice(7);
            continue;
          }

          if (!trimmed.startsWith("data: ")) continue;

          const payload = trimmed.slice(6);

          let data: Record<string, unknown>;
          try {
            data = JSON.parse(payload);
          } catch {
            continue;
          }

          switch (currentEvent) {
            case "message_start": {
              const msg = data.message as Record<string, unknown>;
              messageId = String(msg?.id ?? `anth-${Date.now()}`);
              model = String(msg?.model ?? "");
              const usage = msg?.usage as Record<string, number> | undefined;
              inputTokens = usage?.input_tokens ?? 0;

              // Emit the initial chunk with role.
              yield this.makeChunk(messageId, model, 0, {
                role: "assistant",
                content: "",
              });
              break;
            }

            case "content_block_start": {
              const block = data.content_block as AnthropicContentBlock;
              currentBlockIndex = Number(data.index ?? 0);

              if (block?.type === "tool_use") {
                currentToolCallId = block.id;
                currentToolCallName = block.name;
                // Emit the tool_call start.
                yield this.makeChunk(messageId, model, 0, {
                  role: "assistant",
                  content: "",
                  tool_calls: [
                    {
                      index: currentBlockIndex,
                      id: currentToolCallId ?? "",
                      type: "function",
                      function: {
                        name: currentToolCallName ?? "",
                        arguments: "",
                      },
                    },
                  ],
                } as unknown as Partial<ChatMessage>);
              }
              break;
            }

            case "content_block_delta": {
              const delta = data.delta as Record<string, unknown>;
              if (delta?.type === "text_delta") {
                yield this.makeChunk(messageId, model, 0, {
                  content: String(delta.text ?? ""),
                });
              } else if (delta?.type === "input_json_delta") {
                // Tool call argument streaming.
                yield this.makeChunk(messageId, model, 0, {
                  tool_calls: [
                    {
                      index: currentBlockIndex,
                      function: {
                        arguments: String(delta.partial_json ?? ""),
                      },
                    },
                  ],
                } as unknown as Partial<ChatMessage>);
              }
              break;
            }

            case "message_delta": {
              const delta = data.delta as Record<string, unknown>;
              const usage = data.usage as Record<string, number> | undefined;
              outputTokens = usage?.output_tokens ?? outputTokens;

              const stopReason = this.mapStopReason(
                delta?.stop_reason as AnthropicResponse["stop_reason"],
              );

              yield {
                id: messageId,
                object: "chat.completion.chunk",
                created: Math.floor(Date.now() / 1000),
                model,
                choices: [
                  {
                    index: 0,
                    delta: {},
                    finish_reason: stopReason,
                  },
                ],
                usage: {
                  prompt_tokens: inputTokens,
                  completion_tokens: outputTokens,
                  total_tokens: inputTokens + outputTokens,
                },
              };
              break;
            }

            case "message_stop":
              // End of stream, nothing to emit.
              return;

            default:
              // ping, error, or unknown events -- ignore
              break;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private makeChunk(
    id: string,
    model: string,
    index: number,
    delta: Partial<ChatMessage>,
  ): ChatStreamChunk {
    return {
      id,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{ index, delta, finish_reason: null }],
    };
  }

  private modelEntry(
    id: string,
    name: string,
    ctx: number,
    maxOut: number,
    promptPricePerMillion: number,
    completionPricePerMillion: number,
  ): ModelInfo {
    return {
      id,
      name,
      provider: "anthropic",
      description: null,
      context_length: ctx,
      max_output_tokens: maxOut,
      pricing: {
        prompt: String(promptPricePerMillion),
        completion: String(completionPricePerMillion),
      },
      supports_streaming: true,
      supports_tools: true,
      supports_vision: true,
    };
  }
}
