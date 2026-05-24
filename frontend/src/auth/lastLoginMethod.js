const STORAGE_KEY = "vibely_last_login_method";

/** @typedef {"google" | "facebook" | "line" | "email"} LastLoginMethod */

const VALID = new Set(["google", "facebook", "line", "email"]);

/**
 * @param {string | null | undefined} value
 * @returns {LastLoginMethod | null}
 */
export function normalizeLastLoginMethod(value) {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  return VALID.has(normalized) ? /** @type {LastLoginMethod} */ (normalized) : null;
}

/** @returns {LastLoginMethod | null} */
export function getLastLoginMethod() {
  try {
    return normalizeLastLoginMethod(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

/**
 * Chỉ gọi sau đăng nhập thành công (OAuth exchange xong hoặc email/password OK).
 * Không gọi khi bắt đầu OAuth hay khi người dùng hủy — tránh ghi đè phương thức cũ.
 *
 * @param {LastLoginMethod} method
 */
export function setLastLoginMethod(method) {
  const normalized = normalizeLastLoginMethod(method);
  if (!normalized) return;
  try {
    localStorage.setItem(STORAGE_KEY, normalized);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("vibely:last-login-method-changed"));
    }
  } catch {
    // ignore quota / private mode
  }
}
