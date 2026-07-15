const PENDING_BAN_KEY = "vibely:pendingAccountBanned";

let banHandler = null;

export function onAccountBanned(handler) {
  banHandler = typeof handler === "function" ? handler : null;
  return () => {
    if (banHandler === handler) banHandler = null;
  };
}

export function emitAccountBanned(payload = {}) {
  try {
    sessionStorage.setItem(PENDING_BAN_KEY, JSON.stringify(payload ?? {}));
  } catch {
    // sessionStorage may be unavailable
  }
  if (typeof banHandler === "function") {
    banHandler(payload);
  }
}

export function consumePendingAccountBanned() {
  try {
    const raw = sessionStorage.getItem(PENDING_BAN_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_BAN_KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
