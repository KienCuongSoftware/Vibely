import { useSyncExternalStore } from "react";
import { getLastLoginMethod, setLastLoginMethod } from "./lastLoginMethod.js";

export const LAST_LOGIN_METHOD_CHANGED = "vibely:last-login-method-changed";

function subscribe(onStoreChange) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const notify = () => onStoreChange();

  window.addEventListener("storage", notify);
  window.addEventListener(LAST_LOGIN_METHOD_CHANGED, notify);
  window.addEventListener("pageshow", notify);
  window.addEventListener("focus", notify);
  document.addEventListener("visibilitychange", notify);

  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(LAST_LOGIN_METHOD_CHANGED, notify);
    window.removeEventListener("pageshow", notify);
    window.removeEventListener("focus", notify);
    document.removeEventListener("visibilitychange", notify);
  };
}

function getSnapshot() {
  return getLastLoginMethod();
}

/** Luôn đồng bộ với localStorage (kể cả khi quay lại từ OAuth / bfcache). */
export function useLastLoginMethod() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** @param {import("./lastLoginMethod.js").LastLoginMethod} method */
export function persistLastLoginMethod(method) {
  setLastLoginMethod(method);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(LAST_LOGIN_METHOD_CHANGED));
  }
}
