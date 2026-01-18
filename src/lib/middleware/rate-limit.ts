import { NextRequest } from 'next/server';
import crypto from 'crypto';

interface RateLimitState {
  count: number;
  resetAt: number;
}

// In-memory rate limit store (use database in production for multi-instance deployments)
const rateLimitStore = new Map<string, RateLimitState>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, state] of rateLimitStore.entries()) {
    if (state.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate a client fingerprint from request
 * Uses IP address and User-Agent for identification
 */
export function getClientFingerprint(request: NextRequest): string {
  // Get IP address (check various headers for proxy/load balancer scenarios)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp || request.ip || 'unknown';

  // Get User-Agent
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Create hash of IP + User-Agent for fingerprinting
  const hash = crypto.createHash('sha256').update(`${ip}:${userAgent}`).digest('hex');
  return hash;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Check rate limit for a client (internal function)
 * @param fingerprint - Client fingerprint
 * @param limit - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns Rate limit result
 */
function checkRateLimitInternal(
  fingerprint: string,
  limit: number = 1,
  windowMs: number = 60 * 1000 // 1 minute default
): RateLimitResult {
  const now = Date.now();
  const state = rateLimitStore.get(fingerprint);

  if (!state || state.resetAt < now) {
    // No existing state or window expired, create new window
    const newState: RateLimitState = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(fingerprint, newState);

    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetAt: newState.resetAt,
    };
  }

  // Window exists, check count
  if (state.count >= limit) {
    const retryAfter = Math.ceil((state.resetAt - now) / 1000);
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt: state.resetAt,
      retryAfter,
    };
  }

  // Increment count
  state.count += 1;
  rateLimitStore.set(fingerprint, state);

  return {
    allowed: true,
    limit,
    remaining: limit - state.count,
    resetAt: state.resetAt,
  };
}

/**
 * Middleware function for rate limiting API routes
 * @param request - Next.js request object
 * @param limit - Maximum requests allowed (default: 1)
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns Rate limit result or null if allowed
 */
export function rateLimit(
  request: NextRequest,
  limit: number = 1,
  windowMs: number = 60 * 1000
): RateLimitResult | null {
  const fingerprint = getClientFingerprint(request);
  const result = checkRateLimitInternal(fingerprint, limit, windowMs);

  if (!result.allowed) {
    return result;
  }

  return null; // Null means allowed (no error)
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
    ...(result.retryAfter && {
      'Retry-After': result.retryAfter.toString(),
    }),
  };
}
