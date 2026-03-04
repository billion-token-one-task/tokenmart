import type { ChatStreamChunk } from "@/types/tokenhall";

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
  onChunk?: (chunk: ChatStreamChunk) => void,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

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
      } catch (err) {
        // If the provider stream throws, forward a final error event and
        // close gracefully so the client is not left hanging.
        const errorPayload = {
          error: {
            message:
              err instanceof Error ? err.message : "Unknown streaming error",
            type: "provider_error",
          },
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(errorPayload)}\n\n`),
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },

    cancel() {
      // The consumer cancelled the stream (e.g. client disconnected).
      // The async iterable will be garbage-collected; nothing special to do.
    },
  });
}
