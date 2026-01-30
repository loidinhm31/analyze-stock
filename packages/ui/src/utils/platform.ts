/**
 * Platform detection utilities for cross-platform support
 */

/**
 * Port for the embedded web server
 */
export const WEB_APP_PORT = 25095;

/**
 * Check if running inside Tauri webview
 */
export const isTauri = (): boolean => {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

/**
 * Check if running in web browser
 */
export const isWeb = (): boolean => !isTauri();

/**
 * Check if on mobile device
 */
export const isMobile = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("android") || ua.includes("iphone") || ua.includes("ipad");
};

/**
 * Check if on desktop Tauri
 */
export const isDesktop = (): boolean => isTauri() && !isMobile();

/**
 * Get platform name for logging
 */
export const getPlatformName = (): "tauri" | "web" => {
  return isTauri() ? "tauri" : "web";
};

/**
 * Check if native file system access is available
 */
export const hasNativeFileSystem = (): boolean => isTauri();

/**
 * Check if native notifications are available
 */
export const hasNativeNotifications = (): boolean => isTauri();

// Session storage keys
const DESKTOP_MODE_KEY = "browser_sync_desktop_mode";
const SESSION_TOKEN_KEY = "browser_sync_session_token";

/**
 * Check if browser was opened from desktop app
 */
export const isOpenedFromDesktop = (): boolean => {
  if (isTauri()) return false;

  // Check cached result
  const storedMode = sessionStorage.getItem(DESKTOP_MODE_KEY);
  if (storedMode === "true") return true;
  if (storedMode === "false") return false;

  // Validate origin
  const origin = window.location.origin;
  const validOrigins = [
    `http://localhost:${WEB_APP_PORT}`, // Production embedded server
    "http://localhost:1420", // Vite dev server
  ];

  if (!validOrigins.includes(origin)) {
    sessionStorage.setItem(DESKTOP_MODE_KEY, "false");
    return false;
  }

  // Check for session token in URL
  const params = new URLSearchParams(window.location.search);
  const sessionToken = params.get("session");

  if (sessionToken) {
    sessionStorage.setItem(DESKTOP_MODE_KEY, "true");
    sessionStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
    return true;
  }

  // Check stored token from previous navigation
  const storedToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
  if (storedToken) {
    sessionStorage.setItem(DESKTOP_MODE_KEY, "true");
    return true;
  }

  sessionStorage.setItem(DESKTOP_MODE_KEY, "false");
  return false;
};

/**
 * Get session token for API authentication
 */
export const getSessionToken = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get("session");
  if (urlToken) {
    sessionStorage.setItem(SESSION_TOKEN_KEY, urlToken);
    return urlToken;
  }
  return sessionStorage.getItem(SESSION_TOKEN_KEY);
};

/**
 * Initialize session token from URL or sessionStorage
 * This MUST be called before any API operations in browser mode
 * Provides detailed logging for debugging
 *
 * @returns The session token if found, null otherwise
 */
export const initializeSessionToken = (): string | null => {
  // If running in Tauri, no session token needed
  if (isTauri()) {
    console.log("[Session] Running in Tauri mode - no session token needed");
    return null;
  }

  console.log("[Session] Initializing session token...");
  console.log("[Session] Current URL:", window.location.href);
  console.log("[Session] Search params:", window.location.search);

  // First, try to get token from URL
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get("session");

  if (urlToken) {
    console.log(
      "[Session] ✅ Found token in URL:",
      urlToken.substring(0, 8) + "...",
    );
    sessionStorage.setItem(SESSION_TOKEN_KEY, urlToken);
    sessionStorage.setItem(DESKTOP_MODE_KEY, "true");
    return urlToken;
  }

  // If not in URL, check sessionStorage
  const storedToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
  if (storedToken) {
    console.log(
      "[Session] ✅ Found token in sessionStorage:",
      storedToken.substring(0, 8) + "...",
    );
    sessionStorage.setItem(DESKTOP_MODE_KEY, "true");
    return storedToken;
  }

  // No token found
  console.error("[Session] ❌ No session token found!");
  console.error("[Session] Browser mode requires session token.");
  console.error("[Session] Please open the app from the desktop application.");
  sessionStorage.setItem(DESKTOP_MODE_KEY, "false");
  return null;
};

/**
 * Clear the desktop mode session data
 */
export const clearDesktopModeSession = (): void => {
  sessionStorage.removeItem(DESKTOP_MODE_KEY);
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
};

/**
 * Get the URL for the embedded web server
 */
export const getWebAppUrl = (): string => {
  return `http://localhost:${WEB_APP_PORT}`;
};
