import type { ChatStreamChunk } from "@/types/tokenhall";

export interface SSEStreamCompletion {
  completed: boolean;
  error?: Error;
}

export interface SSEStreamOptions {
  onChunk?: (chunk: ChatStreamChunk) => void;
  onError?: (error: Error) => void;
  onComplete?: (result: SSEStreamCompletion) => void;
}

function normalizeStreamOptions(
  optionsOrOnChunk?: SSEStreamOptions | ((chunk: ChatStreamChunk) => void),
): SSEStreamOptions {
  if (!optionsOrOnChunk) return {};
  if (typeof optionsOrOnChunk === "function") {
    return { onChunk: optionsOrOnChunk };
  }
  return optionsOrOnChunk;
}

/**
 * Convert an async iterable of ChatStreamChunk objects into a
 * ReadableStream<Uint8Array> formatted as Server-Sent Events (SSE).
 *
 * Each chunk is serialised as:
 *   data: {JSON}\n\n
 *
 * The stream terminates with:
 *   data: [DONE]\n\n
 *
 * @param providerStream  The async iterable produced by a provider adapter.
 * @param onChunk         Optional callback invoked for every chunk (useful for
 *                        accumulating token counts, logging, etc.).
 */
export function createSSEStream(
  providerStream: AsyncIterable<ChatStreamChunk>,
  optionsOrOnChunk?: SSEStreamOptions | ((chunk: ChatStreamChunk) => void),
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const { onChunk, onError, onComplete } = normalizeStreamOptions(
    optionsOrOnChunk,
  );

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of providerStream) {
          if (onChunk) {
            onChunk(chunk);
          }

          const payload = `data: ${JSON.stringify(chunk)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        }

        // Signal end-of-stream per the OpenAI SSE convention.
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
        onComplete?.({ completed: true });
      } catch (err) {
        // If the provider stream throws, forward a final error event and
        // close gracefully so the client is not left hanging.
        const error =
          err instanceof Error ? err : new Error("Unknown streaming error");
        const errorPayload = {
          error: {
            message: error.message,
            type: "provider_error",
          },
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(errorPayload)}\n\n`),
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
        onError?.(error);
        onComplete?.({ completed: false, error });
      }
    },

    cancel() {
      // The consumer cancelled the stream (e.g. client disconnected).
      // The async iterable will be garbage-collected; nothing special to do.
    },
  });
}
