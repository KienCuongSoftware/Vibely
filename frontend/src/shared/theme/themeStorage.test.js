import { describe, expect, it } from "vitest";
import {
  resolveAppearance,
  APPEARANCE_PREFERENCES,
} from "@/shared/theme/themeStorage.js";

describe("themeStorage", () => {
  it("keeps explicit light and dark", () => {
    expect(resolveAppearance("light")).toBe("light");
    expect(resolveAppearance("dark")).toBe("dark");
  });

  it("lists system, dark, and light", () => {
    expect(APPEARANCE_PREFERENCES).toEqual(["system", "dark", "light"]);
  });
});
