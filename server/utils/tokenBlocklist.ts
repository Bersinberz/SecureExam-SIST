/**
 * In-memory token blocklist for logout / revocation.
 * Entries are auto-expired when the token's own exp passes,
 * so memory usage stays bounded even without Redis.
 *
 * For multi-instance deployments, replace with a Redis SET.
 */

interface BlocklistEntry {
  exp: number; // unix seconds
}

const blocklist = new Map<string, BlocklistEntry>();

// Purge expired entries every 15 minutes
setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  for (const [token, entry] of blocklist) {
    if (entry.exp < now) blocklist.delete(token);
  }
}, 15 * 60 * 1000);

export const blockToken = (token: string, exp: number): void => {
  blocklist.set(token, { exp });
};

export const isTokenBlocked = (token: string): boolean => {
  return blocklist.has(token);
};
