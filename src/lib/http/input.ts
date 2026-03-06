export interface ParseBoundedIntOptions {
  defaultValue: number;
  min?: number;
  max?: number;
}

export interface ParsePaginationOptions {
  defaultLimit?: number;
  defaultOffset?: number;
  maxLimit?: number;
}

export type JsonObjectResult<T extends object> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function readJsonObject<T extends object>(
  request: Request,
): Promise<JsonObjectResult<T>> {
  try {
    const payload: unknown = await request.json();
    if (!isPlainObject(payload)) {
      return { ok: false, error: "JSON body must be an object" };
    }
    return { ok: true, data: payload as T };
  } catch {
    return { ok: false, error: "Invalid JSON body" };
  }
}

export function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function parseBoundedInt(
  rawValue: string | null | undefined,
  options: ParseBoundedIntOptions,
): number {
  const {
    defaultValue,
    min = Number.MIN_SAFE_INTEGER,
    max = Number.MAX_SAFE_INTEGER,
  } = options;

  const fallback = Math.min(max, Math.max(min, defaultValue));
  if (rawValue == null) return fallback;

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed)) return fallback;

  return Math.min(max, Math.max(min, parsed));
}

export function parsePagination(
  searchParams: URLSearchParams,
  options?: ParsePaginationOptions,
) {
  const defaultLimit = options?.defaultLimit ?? 20;
  const defaultOffset = options?.defaultOffset ?? 0;
  const maxLimit = options?.maxLimit ?? 100;

  return {
    limit: parseBoundedInt(searchParams.get("limit"), {
      defaultValue: defaultLimit,
      min: 1,
      max: maxLimit,
    }),
    offset: parseBoundedInt(searchParams.get("offset"), {
      defaultValue: defaultOffset,
      min: 0,
    }),
  };
}
