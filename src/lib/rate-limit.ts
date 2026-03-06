import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

let redis: Redis | null = null;
let cachedGlobalLimiter: Ratelimit | null | undefined;
const keyLimiterCache = new Map<number, Ratelimit>();

function isPlaceholder(value: string): boolean {
  return value.includes("your-redis");
}

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token || isPlaceholder(url) || isPlaceholder(token)) return null;

  try {
    // Validate URL shape early so bad env values don't take down API routes.
    new URL(url);
  } catch {
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}

// Global rate limit: 30 requests per 10 seconds per IP
const globalLimiter = () => {
  if (cachedGlobalLimiter !== undefined) return cachedGlobalLimiter;
  const r = getRedis();
  if (!r) {
    cachedGlobalLimiter = null;
    return cachedGlobalLimiter;
  }
  cachedGlobalLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(30, "10 s"),
    prefix: "tokenmart:global",
  });
  return cachedGlobalLimiter;
};

// Per-key rate limit (configurable RPM)
export function createKeyLimiter(rpm: number) {
  const normalizedRpm = Number.isFinite(rpm) ? Math.max(1, Math.floor(rpm)) : 60;
  const cachedLimiter = keyLimiterCache.get(normalizedRpm);
  if (cachedLimiter) return cachedLimiter;

  const r = getRedis();
  if (!r) return null;
  const limiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(normalizedRpm, "60 s"),
    prefix: "tokenmart:key",
  });
  keyLimiterCache.set(normalizedRpm, limiter);
  return limiter;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export async function checkGlobalRateLimit(
  request: NextRequest
): Promise<RateLimitResult> {
  const limiter = globalLimiter();
  if (!limiter) {
    return { allowed: true, limit: 0, remaining: 0, reset: 0 };
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  try {
    const result = await limiter.limit(ip);
    return {
      allowed: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch {
    // Fail open to avoid hard outages when Redis is down/misconfigured.
    return { allowed: true, limit: 0, remaining: 0, reset: 0 };
  }
}

export async function checkKeyRateLimit(
  keyId: string,
  rpm: number = 60
): Promise<RateLimitResult> {
  const limiter = createKeyLimiter(rpm);
  if (!limiter) {
    return { allowed: true, limit: 0, remaining: 0, reset: 0 };
  }

  try {
    const result = await limiter.limit(keyId);
    return {
      allowed: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch {
    // Fail open to avoid blocking valid traffic on transient Redis issues.
    return { allowed: true, limit: 0, remaining: 0, reset: 0 };
  }
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
  };
}

export function rateLimitResponse(): NextResponse {
  return NextResponse.json(
    { error: { code: 429, message: "Rate limit exceeded" } },
    { status: 429 }
  );
}
