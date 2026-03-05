"use client";

export interface JsonFetchResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  payload: unknown;
  errorMessage: string | null;
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function extractErrorMessage(payload: unknown): string | null {
  if (!payload) return null;

  if (typeof payload === "string") return payload;

  if (typeof payload === "object" && payload !== null) {
    const obj = payload as {
      message?: unknown;
      error?: unknown;
    };

    if (typeof obj.message === "string" && obj.message.trim()) {
      return obj.message;
    }

    if (typeof obj.error === "string" && obj.error.trim()) {
      return obj.error;
    }

    if (typeof obj.error === "object" && obj.error !== null) {
      const nested = obj.error as { message?: unknown };
      if (typeof nested.message === "string" && nested.message.trim()) {
        return nested.message;
      }
    }
  }

  return null;
}

const MISSING_AGENT_STATUSES = new Set([400, 403, 404]);
const MISSING_AGENT_PATTERNS = [
  "no agent",
  "agent associated",
  "agent authentication required",
  "register an agent",
  "agent is required",
];

export function isMissingAgentResponse(
  status: number,
  errorMessage?: string | null
): boolean {
  if (!MISSING_AGENT_STATUSES.has(status)) return false;
  if (!errorMessage) return false;

  const normalized = errorMessage.toLowerCase();
  return MISSING_AGENT_PATTERNS.some((pattern) =>
    normalized.includes(pattern)
  );
}

export async function fetchJsonResult<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<JsonFetchResult<T>> {
  try {
    const response = await fetch(input, init);
    const payload = await parseJsonSafely(response);
    const errorMessage = response.ok
      ? null
      : extractErrorMessage(payload) ??
        `Request failed with status ${response.status}`;

    return {
      ok: response.ok,
      status: response.status,
      data: response.ok ? (payload as T) : null,
      payload,
      errorMessage,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      payload: null,
      errorMessage:
        error instanceof Error ? error.message : "Network request failed",
    };
  }
}
