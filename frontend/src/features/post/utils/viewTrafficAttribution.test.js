import { describe, expect, it } from "vitest";
import {
  resolveViewTrafficAttribution,
  sanitizeSearchQuery,
  withViewTrafficFields,
} from "@/features/post/utils/viewTrafficAttribution.js";

describe("viewTrafficAttribution", () => {
  it("keeps For You feed as foryou", () => {
    expect(
      resolveViewTrafficAttribution({ pathname: "/", feedMode: "for-you" }),
    ).toEqual({ source: "foryou" });
  });

  it("maps For You-style /@user/video permalink to foryou", () => {
    expect(
      resolveViewTrafficAttribution({
        pathname: "/@alice/video/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      }),
    ).toEqual({ source: "foryou" });
  });

  it("keeps explore arrivals as other", () => {
    expect(
      resolveViewTrafficAttribution({
        pathname: "/@alice/video/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        state: { fromExplore: true },
      }),
    ).toEqual({ source: "other" });
  });

  it("maps profile watch permalink to profile", () => {
    expect(
      resolveViewTrafficAttribution({
        pathname: "/@alice/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      }),
    ).toEqual({ source: "profile" });
  });

  it("reads search query from the URL", () => {
    expect(
      resolveViewTrafficAttribution({
        pathname: "/search",
        search: "?q=sunset%20beach",
      }),
    ).toEqual({ source: "search", searchQuery: "sunset beach" });
  });

  it("scopes location state to the focused feed video", () => {
    const state = {
      viewTrafficSource: "search",
      viewSearchQuery: "#dance",
      focusVideoPublicId: "vid-1",
    };
    expect(
      resolveViewTrafficAttribution({
        pathname: "/",
        feedMode: "for-you",
        state,
        videoPublicId: "vid-1",
      }),
    ).toEqual({ source: "search", searchQuery: "#dance" });
    expect(
      resolveViewTrafficAttribution({
        pathname: "/",
        feedMode: "for-you",
        state,
        videoPublicId: "vid-2",
      }),
    ).toEqual({ source: "foryou" });
  });

  it("sanitizes and attaches search fields on the view payload", () => {
    expect(sanitizeSearchQuery("  hello   world  ")).toBe("hello world");
    expect(
      withViewTrafficFields(
        { watchedMs: 2500 },
        { source: "search", searchQuery: "  hello   world  " },
      ),
    ).toEqual({
      watchedMs: 2500,
      source: "search",
      searchQuery: "hello world",
    });
  });
});
