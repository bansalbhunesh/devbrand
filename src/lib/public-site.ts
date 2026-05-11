/**
 * Absolute site origin for OG URLs, canonical links, and client-only fallbacks.
 * Does not touch server secrets — safe to import from route modules and the client bundle.
 */
const DEFAULT_PRODUCTION_ORIGIN = "https://devbrand.ai";

export function getPublicSiteUrl(): string {
  const vite =
    typeof import.meta !== "undefined" && import.meta.env
      ? (import.meta.env.VITE_PUBLIC_APP_URL ||
          import.meta.env.VITE_APP_URL ||
          "")?.trim()
      : "";
  if (vite) {
    const withProto = /^https?:\/\//i.test(vite) ? vite : `https://${vite}`;
    try {
      return new URL(withProto).origin.replace(/\/+$/, "");
    } catch {
      /* fall through */
    }
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    try {
      return new URL(window.location.origin).origin.replace(/\/+$/, "");
    } catch {
      /* fall through */
    }
  }
  if (import.meta.env.PROD) return DEFAULT_PRODUCTION_ORIGIN;
  return "http://localhost:3000";
}
