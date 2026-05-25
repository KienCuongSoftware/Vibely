import { FEED_CONFIG } from "./feedConfig.js";

/**
 * Drops oldest metadata rows when the in-memory list grows too large.
 * Returns { items, activeIndex } with index adjusted after head trim.
 */
export function trimFeedItemsIfNeeded(items, activeIndex) {
  const max = FEED_CONFIG.MAX_ITEMS_IN_MEMORY;
  const batch = FEED_CONFIG.TRIM_BATCH;
  if (!Array.isArray(items) || items.length <= max) {
    return { items, activeIndex };
  }
  const remove = Math.min(batch, items.length - max + batch);
  if (remove <= 0) return { items, activeIndex };
  return {
    items: items.slice(remove),
    activeIndex: Math.max(0, activeIndex - remove),
  };
}
