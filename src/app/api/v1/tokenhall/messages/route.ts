import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware";
import { checkKeyRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { routeRequest, RouterError } from "@/lib/tokenhall/router";
import { ProviderError } from "@/lib/tokenhall/providers/types";
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatMessage,
  ChatStreamChunk,
} from "@/types/tokenhall";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── Anthropic-format types ──────────────────────────────────────────────

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

interface AnthropicContentBlock {
  type: "text" | "image";
  text?: string;
  source?: { type: "base64"; media_type: string; data: string };
}

interface AnthropicRequest {
  model: string;
  messages: AnthropicMessage[];
  system?: string;
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  stop_sequences?: string[];
  tools?: unknown[];
  tool_choice?: unknown;
}

function anthropicError(message: string, type: string, status: number) {
  return Response.json(
    { type: "error", error: { type, message } },
    { status },
  );
}

// ── Request / Response transformers ─────────────────────────────────────

function anthropicToInternal(req: AnthropicRequest): ChatCompletionRequest {
  const messages: ChatMessage[] = [];

  // System message
  if (req.system) {
    messages.push({ role: "system", content: req.system });
  }

  // Convert Anthropic messages to internal format
  for (const msg of req.messages) {
    if (typeof msg.content === "string") {
      messages.push({ role: msg.role, content: msg.content });
    } else {
      // Convert content blocks to a single text (simplified)
      const textParts = msg.content
        .filter((b) => b.type === "text" && b.text)
        .map((b) => b.text!)
        .join("\n");
      messages.push({ role: msg.role, content: textParts || "" });
    }
  }

  return {
    model: req.model,
    messages,
    max_tokens: req.max_tokens,
    temperature: req.temperature,
    top_p: req.top_p,
    stop: req.stop_sequences,
    stream: req.stream,
  };
}

function internalToAnthropicResponse(
  res: ChatCompletionResponse,
  model: string,
) {
  const choice = res.choices[0];
  const content: { type: "text"; text: string }[] = [];

  if (choice?.message?.content) {
    const text =
      typeof choice.message.content === "string"
        ? choice.message.content
        : "";
    content.push({ type: "text", text });
  }

  const stopReason =
    choice?.finish_reason === "stop"
      ? "end_turn"
      : choice?.finish_reason === "length"
        ? "max_tokens"
        : choice?.finish_reason === "tool_calls"
          ? "tool_use"
          : "end_turn";

  return {
    id: res.id,
    type: "message",
    role: "assistant",
    model,
    content,
    stop_reason: stopReason,
    stop_sequence: null,
    usage: {
      input_tokens: res.usage.prompt_tokens,
      output_tokens: res.usage.completion_tokens,
    },
  };
}

// ── SSE helpers for Anthropic event format ──────────────────────────────

function encodeSSE(event: string, data: unknown): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/**
 * Transform an OpenAI-format SSE ReadableStream (from the router) into
 * Anthropic Messages API SSE format.
 *
 * The router returns SSE lines like `data: {chunk}\n\n` and `data: [DONE]\n\n`.
 * We parse those and re-emit as Anthropic events: message_start,
 * content_block_start, content_block_delta, content_block_stop,
 * message_delta, message_stop.
 */
function transformToAnthropicStream(
  openaiStream: ReadableStream<Uint8Array>,
  model: string,
  requestId: string,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  let sentStart = false;
  let sentBlockStart = false;
  let lastOutputTokens = 0;
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = openaiStream.getReader();

      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // Keep the last potentially incomplete line in the buffer
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;

            const payload = trimmed.slice(6); // Remove "data: "

            if (payload === "[DONE]") {
              // Close any open blocks
              if (sentBlockStart) {
                controller.enqueue(
                  encodeSSE("content_block_stop", {
                    type: "content_block_stop",
                    index: 0,
                  }),
                );
              }

              controller.enqueue(
                  encodeSSE("message_delta", {
                    type: "message_delta",
                    delta: { stop_reason: "end_turn", stop_sequence: null },
                    usage: { output_tokens: lastOutputTokens },
                  }),
                );

              controller.enqueue(
                encodeSSE("message_stop", { type: "message_stop" }),
              );
              continue;
            }

            let chunk: ChatStreamChunk;
            try {
              chunk = JSON.parse(payload);
            } catch {
              continue; // Skip malformed chunks
            }

            if (chunk.usage?.completion_tokens !== undefined) {
              lastOutputTokens = chunk.usage.completion_tokens;
            }

            // Emit message_start on first chunk
            if (!sentStart) {
              sentStart = true;
              controller.enqueue(
                encodeSSE("message_start", {
                  type: "message_start",
                  message: {
                    id: requestId,
                    type: "message",
                    role: "assistant",
                    model,
                    content: [],
                    stop_reason: null,
                    stop_sequence: null,
                    usage: { input_tokens: 0, output_tokens: 0 },
                  },
                }),
              );
            }

            const delta = chunk.choices?.[0]?.delta;
            if (delta?.content && typeof delta.content === "string") {
              // Emit content_block_start on first content delta
              if (!sentBlockStart) {
                sentBlockStart = true;
                controller.enqueue(
                  encodeSSE("content_block_start", {
                    type: "content_block_start",
                    index: 0,
                    content_block: { type: "text", text: "" },
                  }),
                );
              }

              controller.enqueue(
                encodeSSE("content_block_delta", {
                  type: "content_block_delta",
                  index: 0,
                  delta: { type: "text_delta", text: delta.content },
                }),
              );
            }

            const finishReason = chunk.choices?.[0]?.finish_reason;
            if (finishReason) {
              if (sentBlockStart) {
                controller.enqueue(
                  encodeSSE("content_block_stop", {
                    type: "content_block_stop",
                    index: 0,
                  }),
                );
                sentBlockStart = false;
              }

              const stopReason =
                finishReason === "stop"
                  ? "end_turn"
                  : finishReason === "length"
                    ? "max_tokens"
                    : "end_turn";

              controller.enqueue(
                encodeSSE("message_delta", {
                  type: "message_delta",
                  delta: { stop_reason: stopReason, stop_sequence: null },
                  usage: {
                    output_tokens: chunk.usage?.completion_tokens ?? lastOutputTokens,
                  },
                }),
              );
            }
          }
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown streaming error";
        controller.enqueue(
          encodeSSE("error", {
            type: "error",
            error: { type: "server_error", message },
          }),
        );
      } finally {
        reader.releaseLock();
        controller.close();
      }
    },
    cancel() {
      // Client disconnected
    },
  });
}

// ── POST handler ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const requestId = `msg_${randomUUID()}`;

  // ── Auth ──────────────────────────────────────────────────────────────
  const auth = await authenticateRequest(request, {
    requiredType: "tokenhall",
  });
  if (!auth.success) {
    return anthropicError(auth.error, "authentication_error", auth.status);
  }

  const { context } = auth;
  if (!context.agent_id) {
    return anthropicError(
      "API key is not associated with an agent",
      "invalid_request_error",
      400,
    );
  }

  // ── Rate limit ────────────────────────────────────────────────────────
  const rl = await checkKeyRateLimit(context.key_id, context.rate_limit_rpm ?? 60);
  if (!rl.allowed) {
    return anthropicError("Rate limit exceeded", "rate_limit_error", 429);
  }

  // ── Parse body ────────────────────────────────────────────────────────
  let body: AnthropicRequest;
  try {
    body = await request.json();
  } catch {
    return anthropicError("Invalid JSON body", "invalid_request_error", 400);
  }

  if (!body.model || !body.messages || !body.max_tokens) {
    return anthropicError(
      "model, messages, and max_tokens are required",
      "invalid_request_error",
      400,
    );
  }

  // ── Transform and route ───────────────────────────────────────────────
  // The router handles balance checks, billing, credit deduction, and
  // generation recording internally.
  const internalRequest = anthropicToInternal(body);

  const rlHeaders = rateLimitHeaders(rl);
  const baseHeaders: Record<string, string> = {
    "X-Request-Id": requestId,
    "Cache-Control": "no-store, no-transform",
    "Pragma": "no-cache",
    "Vary": "Authorization, X-Agent-Id",
    ...rlHeaders,
  };

  try {
    const result = await routeRequest(
      internalRequest,
      context.agent_id,
      context.key_id,
    );

    if (result instanceof ReadableStream) {
      // ── Streaming ───────────────────────────────────────────────────
      // The router returns OpenAI-format SSE. Transform to Anthropic format.
      const anthropicStream = transformToAnthropicStream(
        result,
        body.model,
        requestId,
      );

      return new Response(anthropicStream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Connection": "keep-alive",
          ...baseHeaders,
        },
      });
    } else {
      // ── Non-streaming ─────────────────────────────────────────────
      const response = result as ChatCompletionResponse;
      const anthropicResponse = internalToAnthropicResponse(
        response,
        body.model,
      );

      return Response.json(anthropicResponse, {
        headers: {
          "Content-Type": "application/json",
          ...baseHeaders,
        },
      });
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";

    if (err instanceof RouterError) {
      return anthropicError(
        message,
        err.status >= 500 ? "server_error" : "invalid_request_error",
        err.status,
      );
    }

    if (err instanceof ProviderError) {
      return anthropicError(message, "api_error", err.status);
    }

    return anthropicError(message, "server_error", 500);
  }
}
