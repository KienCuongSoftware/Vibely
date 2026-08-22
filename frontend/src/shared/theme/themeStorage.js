export const APPEARANCE_STORAGE_KEY = "vibely:appearance";

export const APPEARANCE_PREFERENCES = ["system", "dark", "light"];

export const APPEARANCE_OPTIONS = [
  { value: "system", labelKey: "appearance.automatic" },
  { value: "dark", labelKey: "appearance.darkMode" },
  { value: "light", labelKey: "appearance.lightMode" },
];

export function readAppearancePreference() {
  try {
    const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (APPEARANCE_PREFERENCES.includes(stored)) return stored;
  } catch {
    // ignore
  }
  return "system";
}

export function writeAppearancePreference(preference) {
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, preference);
  } catch {
    // ignore
  }
}

export function resolveAppearance(preference) {
  if (preference === "light" || preference === "dark") return preference;
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "dark";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyResolvedTheme(resolved) {
  const root = document.documentElement;
  root.dataset.vibelyTheme = resolved;
  root.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", resolved === "light" ? "#ffffff" : "#000000");
  }
}

export function applyStoredAppearance() {
  const preference = readAppearancePreference();
  applyResolvedTheme(resolveAppearance(preference));
  return preference;
}
