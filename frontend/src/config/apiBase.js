/**
 * Dev: mặc định gọi API qua proxy Vite (same-origin /api → localhost:8080).
 * Production + nginx/cloudflared: để trống → gọi /api cùng origin (điện thoại khác mạng vẫn được).
 */
export function resolveApiBaseUrl() {
  const raw = import.meta.env.VITE_API_BASE_URL
  const trimmed =
    raw == null || String(raw).trim() === ""
      ? ""
      : String(raw).trim().replace(/\/$/, "")

  if (import.meta.env.DEV) {
    if (!trimmed || trimmed.includes(":8000")) {
      return ""
    }
    return trimmed
  }

  return trimmed
}

function isLoopbackHostname(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  )
}

/**
 * Origin backend cho OAuth.
 * Trên điện thoại/LAN/tunnel: luôn dùng cùng origin trình duyệt (nginx :8001, cloudflared…).
 * Desktop dev localhost: mặc định :8080 hoặc env.
 */
export function resolveBackendOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) {
    const hostname = window.location.hostname
    if (!isLoopbackHostname(hostname)) {
      return window.location.origin
    }
  }

  const fromEnv =
    import.meta.env.VITE_BACKEND_ORIGIN ?? import.meta.env.VITE_API_BASE_URL
  const trimmed =
    fromEnv == null || String(fromEnv).trim() === ""
      ? ""
      : String(fromEnv).trim().replace(/\/$/, "")

  if (import.meta.env.DEV) {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin
    }
    if (!trimmed || trimmed.includes(":8000")) {
      return "http://localhost:8080"
    }
    return trimmed
  }

  if (trimmed) {
    return trimmed
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin
  }

  return "http://localhost:8080"
}
