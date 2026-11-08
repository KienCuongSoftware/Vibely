const STORAGE_KEY = "vibely_feed_auto_scroll";

export function readStoredFeedAutoScroll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return false;
    return raw === "1" || raw === "true";
  } catch {
    return false;
  }
}

export function writeStoredFeedAutoScroll(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore quota */
  }
}
