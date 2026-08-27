/** Survives reload until the next successful login. */
export const LOGGED_OUT_GUARD_KEY = "vibely:logged-out-guard";

export function setLoggedOutGuard() {
  try {
    localStorage.setItem(LOGGED_OUT_GUARD_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearLoggedOutGuard() {
  try {
    localStorage.removeItem(LOGGED_OUT_GUARD_KEY);
  } catch {
    /* ignore */
  }
}

export function hasLoggedOutGuard() {
  try {
    return localStorage.getItem(LOGGED_OUT_GUARD_KEY) === "1";
  } catch {
    return false;
  }
}
