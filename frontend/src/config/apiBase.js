/**
 * Dev: mặc định gọi API qua proxy Vite (same-origin /api → localhost:8080).
 * Nếu VITE_API_BASE_URL trỏ nhầm :8000 trong khi backend là :8080, tự dùng proxy.
 */
export function resolveApiBaseUrl() {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (import.meta.env.DEV) {
    if (raw == null || String(raw).trim() === "") {
      return ""
    }
    const s = String(raw).trim().replace(/\/$/, "")
    if (s.includes(":8000")) {
      console.warn(
        "[Vibely] VITE_API_BASE_URL đang dùng cổng 8000; backend Spring thường là 8080 — dùng proxy dev (cùng origin).",
      )
      return ""
    }
    return s
  }
  return String(raw ?? "http://localhost:8080").replace(/\/$/, "")
}

/** Origin backend cho OAuth (luôn cần URL tuyệt đối tới cổng Spring Boot). */
export function resolveBackendOrigin() {
  const fromEnv =
    import.meta.env.VITE_BACKEND_ORIGIN ?? import.meta.env.VITE_API_BASE_URL
  if (import.meta.env.DEV) {
    if (
      fromEnv == null ||
      String(fromEnv).trim() === "" ||
      String(fromEnv).includes(":8000")
    ) {
      return "http://localhost:8080"
    }
    return String(fromEnv).trim().replace(/\/$/, "")
  }
  return String(fromEnv ?? "http://localhost:8080").replace(/\/$/, "")
}
