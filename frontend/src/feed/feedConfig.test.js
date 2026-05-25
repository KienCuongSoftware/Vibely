import { describe, expect, it } from "vitest";
import { FEED_CONFIG } from "./feedConfig.js";
import { trimFeedItemsIfNeeded } from "./trimFeedItems.js";

describe("feedConfig", () => {
  it("keeps media window small for mobile memory", () => {
    expect(FEED_CONFIG.MEDIA_WINDOW_RADIUS).toBeLessThanOrEqual(3);
    expect(FEED_CONFIG.MEDIA_WINDOW_RADIUS * 2 + 1).toBeLessThanOrEqual(7);
  });
});

describe("trimFeedItems", () => {
  it("trims oldest items when list exceeds cap", () => {
    const items = Array.from({ length: 150 }, (_, i) => ({ publicId: `id-${i}` }));
    const { items: out, activeIndex } = trimFeedItemsIfNeeded(items, 100);
    expect(out.length).toBeLessThan(items.length);
    expect(activeIndex).toBeLessThan(100);
  });
});
