/**
 * tokenHelper.ts
 * JWT token storage and decode utilities for client-side use.
 */

const TOKEN_KEY = "jwtToken";

export interface TokenPayload {
  userId?: string;
  id?: string;
  sub?: string;
  userType?: string;
  email?: string;
  registerNumber?: number;
  exp?: number;
  iat?: number;
}

// --------------------
// Storage
// --------------------

export const storeToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

export const hasToken = (): boolean => {
  return localStorage.getItem(TOKEN_KEY) !== null;
};

export const clearAuthData = (): void => {
  [TOKEN_KEY, "userData", "authData", "sessionData"].forEach(key =>
    localStorage.removeItem(key)
  );
};

// --------------------
// Decode & Inspect
// --------------------

export const decodeToken = (token: string): TokenPayload | null => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
    return JSON.parse(atob(padded)) as TokenPayload;
  } catch {
    return null;
  }
};

export const isStoredTokenExpired = (): boolean => {
  const token = getToken();
  if (!token) return true;
  const decoded = decodeToken(token);
  if (!decoded?.exp) return true;
  return decoded.exp < Math.floor(Date.now() / 1000);
};

export const getUserTypeFromStoredToken = (): string | null => {
  const token = getToken();
  if (!token) return null;
  return decodeToken(token)?.userType ?? null;
};

export const getUserIdFromStoredToken = (): string | null => {
  const token = getToken();
  if (!token) return null;
  const d = decodeToken(token);
  if (!d) return null;
  return d.userId ?? d.id ?? d.sub ?? null;
};

export const getStoredTokenExpiration = (): Date | null => {
  const token = getToken();
  if (!token) return null;
  const decoded = decodeToken(token);
  if (!decoded?.exp) return null;
  return new Date(decoded.exp * 1000);
};

export const validateStoredToken = (): boolean => {
  const token = getToken();
  if (!token) return false;
  const decoded = decodeToken(token);
  if (!decoded) return false;
  const hasId = !!(decoded.userId || decoded.id || decoded.sub);
  const hasType = !!decoded.userType;
  return hasId && hasType && !isStoredTokenExpired();
};

export default {
  storeToken,
  getToken,
  removeToken,
  hasToken,
  clearAuthData,
  decodeToken,
  isStoredTokenExpired,
  getUserTypeFromStoredToken,
  getUserIdFromStoredToken,
  getStoredTokenExpiration,
  validateStoredToken,
};
