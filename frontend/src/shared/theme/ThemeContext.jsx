import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  applyResolvedTheme,
  applyStoredAppearance,
  readAppearancePreference,
  resolveAppearance,
  writeAppearancePreference,
} from "@/shared/theme/themeStorage.js";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(() =>
    applyStoredAppearance(),
  );
  const [resolved, setResolved] = useState(() =>
    resolveAppearance(readAppearancePreference()),
  );

  useEffect(() => {
    const next = resolveAppearance(preference);
    setResolved(next);
    applyResolvedTheme(next);
    writeAppearancePreference(preference);

    if (preference !== "system" || typeof window.matchMedia !== "function") {
      return undefined;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const appearance = resolveAppearance("system");
      setResolved(appearance);
      applyResolvedTheme(appearance);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  const value = useMemo(
    () => ({
      preference,
      resolved,
      setPreference: setPreferenceState,
    }),
    [preference, resolved],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
