/**
 * Token blocklist — Redis-backed for production, in-memory fallback for dev.
 *
 * Redis is required for multi-instance deployments so that a logout on one
 * instance is honoured by all others.  If REDIS_URL is not set the code falls
 * back to the original in-memory Map (single-instance only).
 */

import Redis from 'ioredis';

// ---------------------------------------------------------------------------
// Redis client (lazy — only created when REDIS_URL is present)
// ---------------------------------------------------------------------------
let redis: Redis | null = null;

const getRedis = (): Redis | null => {
  if (redis) return redis;
  const url = process.env.REDIS_URL;
  if (!url) return null;

  redis = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  });

  redis.on('connect',    () => console.log('[redis] connected'));
  redis.on('error',      (e) => console.error('[redis] error', e.message));
  redis.on('reconnecting', () => console.warn('[redis] reconnecting…'));

  return redis;
};

// ---------------------------------------------------------------------------
// In-memory fallback (single-instance only)
// ---------------------------------------------------------------------------
interface BlocklistEntry { exp: number }
const memBlocklist = new Map<string, BlocklistEntry>();

setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  for (const [token, entry] of memBlocklist) {
    if (entry.exp < now) memBlocklist.delete(token);
  }
}, 15 * 60 * 1000);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Add a token to the blocklist.
 * @param token  Raw JWT string
 * @param exp    Token expiry as Unix seconds (from JWT payload)
 */
export const blockToken = async (token: string, exp: number): Promise<void> => {
  const ttl = exp - Math.floor(Date.now() / 1000);
  if (ttl <= 0) return; // already expired — no need to store

  const r = getRedis();
  if (r) {
    // Store with TTL so Redis auto-expires the key
    await r.set(`bl:${token}`, '1', 'EX', ttl).catch((e) =>
      console.error('[blocklist] redis SET failed', e.message),
    );
  } else {
    memBlocklist.set(token, { exp });
  }
};

/**
 * Check whether a token has been revoked.
 */
export const isTokenBlocked = async (token: string): Promise<boolean> => {
  const r = getRedis();
  if (r) {
    const val = await r.get(`bl:${token}`).catch(() => null);
    return val !== null;
  }
  return memBlocklist.has(token);
};

/**
 * Gracefully close the Redis connection on shutdown.
 */
export const closeBlocklist = async (): Promise<void> => {
  if (redis) {
    await redis.quit().catch(() => {});
    redis = null;
  }
};
