/**
 * tokenHelper.ts
 * 
 * Helper functions for storing, retrieving, and removing JWT tokens
 * from browser localStorage.
 */

/** Key used to store JWT token in localStorage */
const TOKEN_KEY = "jwtToken";

/**
 * Stores the JWT token in localStorage.
 * @param token - JWT token string
 */
export const storeToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    // Optional: console log for debugging
    // console.log("Token stored:", token);
  } catch (error) {
    console.error("Error storing token:", error);
  }
};

/**
 * Retrieves the JWT token from localStorage.
 * @returns The JWT token string or null if not found
 */
export const getToken = (): string | null => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    // Optional: console log for debugging
    // console.log("Token retrieved:", token);
    return token;
  } catch (error) {
    console.error("Error retrieving token:", error);
    return null;
  }
};

/**
 * Removes the JWT token from localStorage.
 */
export const removeToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    // Optional: console log for debugging
    // console.log("Token removed");
  } catch (error) {
    console.error("Error removing token:", error);
  }
};
