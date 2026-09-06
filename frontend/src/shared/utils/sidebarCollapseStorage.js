export const SIDEBAR_COLLAPSED_STORAGE_KEY = "vibely:sidebar-collapsed";

export function readSidebarCollapsedPreference() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeSidebarCollapsedPreference(collapsed) {
  try {
    localStorage.setItem(
      SIDEBAR_COLLAPSED_STORAGE_KEY,
      collapsed ? "1" : "0",
    );
  } catch {
    // ignore
  }
}
