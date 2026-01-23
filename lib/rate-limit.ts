/**
 * Rate Limiting Utility
 *
 * Provides rate limiting for API endpoints using a sliding window approach.
 * Uses in-memory storage which resets on deployment.
 *
 * For production with multiple serverless instances, consider using
 * Upstash Redis or similar distributed rate limiting solution.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  interval: number;  // Window size in milliseconds
  maxRequests: number;  // Maximum requests per window
}

// In-memory store for rate limiting
// In production with multiple instances, use Redis or similar
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configurations by endpoint type
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  upload: {
    interval: 60 * 60 * 1000,  // 1 hour
    maxRequests: 10,            // 10 uploads per hour
  },
  export: {
    interval: 60 * 60 * 1000,  // 1 hour
    maxRequests: 20,            // 20 exports per hour
  },
  api: {
    interval: 60 * 1000,        // 1 minute
    maxRequests: 100,           // 100 requests per minute
  },
};

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier for the rate limit (e.g., user ID + endpoint)
 * @param config - Rate limit configuration
 * @returns Object with success status and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // If no entry or window has expired, create new entry
  if (!entry || entry.resetAt <= now) {
    const resetAt = now + config.interval;
    rateLimitStore.set(identifier, { count: 1, resetAt });
    return { success: true, remaining: config.maxRequests - 1, resetAt };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  // Increment counter
  entry.count += 1;
  rateLimitStore.set(identifier, entry);

  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Create rate limit headers for response
 */
export function rateLimitHeaders(
  remaining: number,
  resetAt: number,
  limit: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(resetAt / 1000).toString(),
  };
}

/**
 * Create a rate limited response
 */
export function rateLimitExceededResponse(resetAt: number): Response {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
      },
    }
  );
}

// Clean up expired entries periodically (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt <= now) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}
