import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatStreamChunk,
  TokenUsage,
} from "@/types/tokenhall";
import { getProviderForModel } from "./providers/registry";
import { ProviderError } from "./providers/types";
import type { ProviderAdapter } from "./providers/types";
import { decryptProviderKey } from "./encryption";
import {
  calculateCostFromPricing,
  checkBalance,
  deductCredits,
  getModelPricing,
} from "./billing";
import { createSSEStream } from "./streaming";

// ─────────────────────────────────────────────────────────────────────────────
// Request router
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Route a TokenHall chat completion request to the appropriate LLM provider,
 * handle billing, and record the generation.
 *
 * @param request  The incoming chat completion request.
 * @param agentId  The authenticated agent making the request.
 * @param keyId    The tokenhall_api_keys row ID used for authentication.
 * @returns A `ChatCompletionResponse` for non-streaming requests, or a
 *          `ReadableStream<Uint8Array>` (SSE-formatted) for streaming.
 */
export async function routeRequest(
  request: ChatCompletionRequest,
  agentId: string,
  keyId: string,
): Promise<ChatCompletionResponse | ReadableStream<Uint8Array>> {
  const startTime = Date.now();

  // ── 1. Resolve provider ────────────────────────────────────────────

  const resolved = getProviderForModel(request.model);
  if (!resolved) {
    throw new RouterError(
      `No provider found for model "${request.model}"`,
      400,
    );
  }
  const { provider, providerName } = resolved;

  // ── 2. Resolve API key (BYOK or platform default) ──────────────────

  const apiKey = await resolveApiKey(agentId, providerName);
  if (!apiKey) {
    throw new RouterError(
      `No API key available for provider "${providerName}". ` +
        "Either set a BYOK key or ensure the platform default is configured.",
      403,
    );
  }

  // ── 3. Pre-flight balance check ────────────────────────────────────

  // Estimate token cost based on message length as a rough heuristic.
  // We use a generous estimate so we don't block requests that would
  // actually be affordable.
  const estimatedInputTokens = estimateInputTokens(request);
  const estimatedOutputTokens =
    request.max_tokens ?? request.max_completion_tokens ?? 1024;
  const pricing = await getModelPricing(request.model);
  const estimatedCost = calculateCostFromPricing(
    pricing,
    estimatedInputTokens,
    estimatedOutputTokens,
  );

  // Only enforce balance checks when there is a non-zero cost (i.e. the
  // model exists in our pricing table).
  if (estimatedCost > 0) {
    const hasBalance = await checkBalance(agentId, estimatedCost, keyId);
    if (!hasBalance) {
      throw new RouterError(
        "Insufficient credit balance or key credit limit exceeded for this request",
        402,
      );
    }
  }

  // ── 4. Dispatch to provider ────────────────────────────────────────

  if (request.stream) {
    return handleStreaming(
      request,
      provider,
      providerName,
      apiKey,
      agentId,
      keyId,
      startTime,
      pricing,
    );
  }

  return handleNonStreaming(
    request,
    provider,
    providerName,
    apiKey,
    agentId,
    keyId,
    startTime,
    pricing,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Non-streaming path
// ─────────────────────────────────────────────────────────────────────────────

async function handleNonStreaming(
  request: ChatCompletionRequest,
  provider: ProviderAdapter,
  providerName: string,
  apiKey: string,
  agentId: string,
  keyId: string,
  startTime: number,
  pricing: Awaited<ReturnType<typeof getModelPricing>>,
): Promise<ChatCompletionResponse> {
  let response: ChatCompletionResponse;

  try {
    response = await provider.chat(request, apiKey);
  } catch (err) {
    // Record a failed generation.
    await recordGeneration({
      agentId,
      keyId,
      modelId: request.model,
      providerName,
      inputTokens: 0,
      outputTokens: 0,
      totalCost: 0,
      latencyMs: Date.now() - startTime,
      status: "error",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });

    if (err instanceof ProviderError) throw err;
    throw new RouterError(
      err instanceof Error ? err.message : "Provider request failed",
      502,
    );
  }

  // ── Post-call billing and recording ──────────────────────────────

  const latencyMs = Date.now() - startTime;
  const usage = response.usage;
  const actualCost = calculateCostFromPricing(
    pricing,
    usage.prompt_tokens,
    usage.completion_tokens,
  );

  // Deduct credits.
  if (actualCost > 0) {
    const deducted = await deductCredits(
      agentId,
      actualCost,
      `Generation: ${request.model}`,
      response.id,
      keyId,
    );
    if (!deducted) {
      await recordGeneration({
        agentId,
        keyId,
        modelId: request.model,
        providerName,
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalCost: actualCost,
        latencyMs,
        status: "error",
        errorMessage:
          "Generation completed but credit settlement failed due to insufficient balance",
      });
      throw new RouterError(
        "Insufficient credit balance during post-generation settlement",
        402,
      );
    }
  }

  await recordGeneration({
    agentId,
    keyId,
    modelId: request.model,
    providerName,
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    totalCost: actualCost,
    latencyMs,
    status: "success",
  });

  return response;
}

// ─────────────────────────────────────────────────────────────────────────────
// Streaming path
// ─────────────────────────────────────────────────────────────────────────────

async function handleStreaming(
  request: ChatCompletionRequest,
  provider: ProviderAdapter,
  providerName: string,
  apiKey: string,
  agentId: string,
  keyId: string,
  startTime: number,
  pricing: Awaited<ReturnType<typeof getModelPricing>>,
): Promise<ReadableStream<Uint8Array>> {
  let providerStream: AsyncIterable<ChatStreamChunk>;

  try {
    providerStream = provider.chatStream(request, apiKey);
  } catch (err) {
    await recordGeneration({
      agentId,
      keyId,
      modelId: request.model,
      providerName,
      inputTokens: 0,
      outputTokens: 0,
      totalCost: 0,
      latencyMs: Date.now() - startTime,
      status: "error",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });

    if (err instanceof ProviderError) throw err;
    throw new RouterError(
      err instanceof Error ? err.message : "Provider streaming failed",
      502,
    );
  }

  // We accumulate usage info from the final chunk(s).
  let lastUsage: TokenUsage | undefined;
  let lastId = "";
  let streamCompleted = false;
  let streamErrorMessage: string | undefined;

  const sseStream = createSSEStream(providerStream, {
    onChunk(chunk) {
      if (chunk.usage) lastUsage = chunk.usage;
      if (chunk.id) lastId = chunk.id;
    },
    onError(error) {
      streamErrorMessage = error.message;
    },
    onComplete(result) {
      streamCompleted = result.completed;
      if (result.error) {
        streamErrorMessage = result.error.message;
      }
    },
  });

  // Wrap the SSE stream so we can perform billing after it completes.
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = sseStream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } catch (err) {
        // Forward the error to the client.
        const encoder = new TextEncoder();
        const errorPayload = {
          error: {
            message:
              err instanceof Error ? err.message : "Streaming error",
            type: "provider_error",
          },
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(errorPayload)}\n\n`),
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } finally {
        reader.releaseLock();
        controller.close();

        // ── Post-stream billing (async, best-effort) ──────────

        const latencyMs = Date.now() - startTime;
        const inputTokens = lastUsage?.prompt_tokens ?? 0;
        const outputTokens = lastUsage?.completion_tokens ?? 0;
        const actualCost = calculateCostFromPricing(
          pricing,
          inputTokens,
          outputTokens,
        );

        let settled = true;
        if (actualCost > 0) {
          settled = await deductCredits(
            agentId,
            actualCost,
            `Generation (stream): ${request.model}`,
            lastId || undefined,
            keyId,
          ).catch(() => false);
        }

        await recordGeneration({
          agentId,
          keyId,
          modelId: request.model,
          providerName,
          inputTokens,
          outputTokens,
          totalCost: actualCost,
          latencyMs,
          status: streamCompleted && settled ? "success" : "error",
          errorMessage: streamCompleted
            ? settled
              ? undefined
              : "Stream completed but credit settlement failed due to insufficient balance"
            : streamErrorMessage ?? "Provider stream failed",
        }).catch((err) => {
          console.error("Failed to record generation after stream:", err);
        });
      }
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// API key resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the API key for a provider, preferring the agent's own BYOK key
 * and falling back to the platform's environment variable.
 */
async function resolveApiKey(
  agentId: string,
  providerName: string,
): Promise<string | null> {
  const supabase = createAdminClient();

  // 1. Check for a BYOK key associated with the agent.
  const { data: providerKey } = await supabase
    .from("provider_keys")
    .select("encrypted_key, iv")
    .eq("agent_id", agentId)
    .eq("provider", providerName)
    .is("account_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (providerKey) {
    try {
      return decryptProviderKey(providerKey.encrypted_key, providerKey.iv);
    } catch (err) {
      console.error(
        `Failed to decrypt BYOK key for agent ${agentId}, provider ${providerName}:`,
        err,
      );
      // Fall through to platform default.
    }
  }

  // 2. Also check for account-level BYOK keys if the agent has an owner.
  const { data: agent } = await supabase
    .from("agents")
    .select("owner_account_id")
    .eq("id", agentId)
    .single();

  if (agent?.owner_account_id) {
    const { data: accountKey } = await supabase
      .from("provider_keys")
      .select("encrypted_key, iv")
      .eq("account_id", agent.owner_account_id)
      .eq("provider", providerName)
      .is("agent_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (accountKey) {
      try {
        return decryptProviderKey(accountKey.encrypted_key, accountKey.iv);
      } catch (err) {
        console.error(
          `Failed to decrypt account BYOK key for provider ${providerName}:`,
          err,
        );
      }
    }
  }

  // 3. Fall back to platform default from environment variables.
  return getPlatformKey(providerName);
}

/**
 * Return the platform's default API key for a given provider from
 * environment variables.
 */
function getPlatformKey(providerName: string): string | null {
  switch (providerName) {
    case "openrouter":
      return process.env.OPENROUTER_API_KEY ?? null;
    case "openai":
      return process.env.OPENAI_API_KEY ?? null;
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY ?? null;
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Generation recording
// ─────────────────────────────────────────────────────────────────────────────

interface GenerationRecord {
  agentId: string;
  keyId: string;
  modelId: string;
  providerName: string;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  latencyMs: number;
  status: string;
  errorMessage?: string;
}

async function recordGeneration(record: GenerationRecord): Promise<void> {
  const supabase = createAdminClient();

  const payload = {
    agent_id: record.agentId,
    tokenhall_key_id: record.keyId,
    model_id: record.modelId,
    provider: record.providerName,
    input_tokens: record.inputTokens,
    output_tokens: record.outputTokens,
    total_cost: record.totalCost.toFixed(10),
    latency_ms: record.latencyMs,
    status: record.status,
    error_message: record.errorMessage ?? null,
  };

  let { error } = await supabase.from("generations").insert(payload);

  // Backward compatibility: some environments still constrain successful
  // rows to "completed" instead of "success".
  if (error?.code === "23514" && record.status === "success") {
    const retry = await supabase.from("generations").insert({
      ...payload,
      status: "completed",
    });
    error = retry.error;
  }

  if (error) {
    console.error("Failed to record generation:", error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Token estimation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rough estimate of input token count based on message character lengths.
 * Uses ~4 characters per token as a conservative approximation.
 */
function estimateInputTokens(request: ChatCompletionRequest): number {
  let charCount = 0;
  for (const msg of request.messages) {
    if (typeof msg.content === "string") {
      charCount += msg.content.length;
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "text" && part.text) {
          charCount += part.text.length;
        }
      }
    }
  }
  // ~4 chars per token is a conservative estimate for English text.
  return Math.ceil(charCount / 4);
}

// ─────────────────────────────────────────────────────────────────────────────
// Error type
// ─────────────────────────────────────────────────────────────────────────────

export class RouterError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "RouterError";
  }
}
