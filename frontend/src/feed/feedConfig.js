/** TikTok-style feed tuning — single source of truth for windowing & visibility. */
export const FEED_CONFIG = Object.freeze({
  /** Items per keyset API request */
  PAGE_SIZE: 8,
  /** HLS/video elements mounted within ±N of active index (target 3–7 players) */
  MEDIA_WINDOW_RADIUS: 2,
  /** @tanstack/react-virtual overscan rows (DOM shells only; media gated separately) */
  VIRTUAL_OVERSCAN: 1,
  /** Trigger cursor fetch when this many slots from end */
  NEAR_END_SLOTS: 4,
  /** IntersectionObserver: become active slide */
  ACTIVE_INDEX_MIN_RATIO: 0.5,
  /** Start playback when slide is this visible */
  PLAY_VISIBILITY_RATIO: 0.7,
  /** Pause when slide drops below this visibility */
  PAUSE_VISIBILITY_RATIO: 0.2,
  /** HLS manifest prefetch for upcoming items */
  PREFETCH_AHEAD_COUNT: 2,
  /** Soft cap on feed items kept in React state (metadata only) */
  MAX_ITEMS_IN_MEMORY: 120,
  /** Trim from head when list exceeds cap (keeps scroll index stable) */
  TRIM_BATCH: 40,
});
