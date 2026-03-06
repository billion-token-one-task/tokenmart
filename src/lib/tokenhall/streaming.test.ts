import assert from "node:assert/strict";
import test from "node:test";

import { createSSEStream } from "./streaming";
import type { ChatStreamChunk } from "@/types/tokenhall";

async function readStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let output = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    output += decoder.decode(value, { stream: true });
  }

  output += decoder.decode();
  reader.releaseLock();
  return output;
}

async function* successfulProviderStream(): AsyncIterable<ChatStreamChunk> {
  yield {
    id: "chunk-1",
    object: "chat.completion.chunk",
    created: 1,
    model: "gpt-test",
    choices: [
      {
        index: 0,
        delta: { role: "assistant", content: "hello" },
        finish_reason: null,
      },
    ],
    usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
  };
}

async function* failingProviderStream(): AsyncIterable<ChatStreamChunk> {
  yield {
    id: "chunk-2",
    object: "chat.completion.chunk",
    created: 2,
    model: "gpt-test",
    choices: [
      {
        index: 0,
        delta: { content: "partial" },
        finish_reason: null,
      },
    ],
  };

  throw new Error("provider exploded");
}

test("createSSEStream reports successful completion to callbacks", async () => {
  const seenChunks: ChatStreamChunk[] = [];
  let completed: boolean | null = null;
  let errorMessage: string | null = null;

  const stream = createSSEStream(successfulProviderStream(), {
    onChunk(chunk) {
      seenChunks.push(chunk);
    },
    onComplete(result) {
      completed = result.completed;
    },
    onError(error) {
      errorMessage = error.message;
    },
  });

  const body = await readStream(stream);

  assert.equal(seenChunks.length, 1);
  assert.equal(completed, true);
  assert.equal(errorMessage, null);
  assert.match(body, /data: \{"id":"chunk-1"/);
  assert.match(body, /data: \[DONE\]/);
});

test("createSSEStream reports provider failures without dropping the stream terminator", async () => {
  let completed: boolean | null = null;
  let errorMessage: string | null = null;

  const stream = createSSEStream(failingProviderStream(), {
    onComplete(result) {
      completed = result.completed;
    },
    onError(error) {
      errorMessage = error.message;
    },
  });

  const body = await readStream(stream);

  assert.equal(completed, false);
  assert.equal(errorMessage, "provider exploded");
  assert.match(body, /provider exploded/);
  assert.match(body, /data: \[DONE\]/);
});
