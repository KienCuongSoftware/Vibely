import { describe, expect, it, beforeEach } from "vitest";
import {
  getLastLoginMethod,
  normalizeLastLoginMethod,
  setLastLoginMethod,
} from "./lastLoginMethod.js";

describe("lastLoginMethod", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("normalizes valid providers", () => {
    expect(normalizeLastLoginMethod("Google")).toBe("google");
    expect(normalizeLastLoginMethod("facebook")).toBe("facebook");
    expect(normalizeLastLoginMethod("LINE")).toBe("line");
    expect(normalizeLastLoginMethod("email")).toBe("email");
    expect(normalizeLastLoginMethod("twitter")).toBeNull();
  });

  it("persists and reads last method", () => {
    setLastLoginMethod("facebook");
    expect(getLastLoginMethod()).toBe("facebook");
  });

  it("keeps previous method when a new value is not persisted", () => {
    setLastLoginMethod("facebook");
    // Simulate cancelled OAuth: never call setLastLoginMethod("line").
    expect(getLastLoginMethod()).toBe("facebook");
  });
});
