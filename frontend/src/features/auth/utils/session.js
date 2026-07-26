/** Marker in AuthContext when the real JWT lives in httpOnly cookies. */
export const COOKIE_SESSION_MARKER = "cookie";

export function isCookieSession(token) {
  return token === COOKIE_SESSION_MARKER;
}

/** True when the app should send authenticated API requests (cookie or legacy bearer). */
export function hasAuthSession(token) {
  return Boolean(token);
}
