import { useEffect } from "react";
import { feedPrefetchManager } from "./FeedPrefetchManager.js";
import { resolveFeedPlaybackUrl } from "./feedPlayback.js";

/** Debounce — tránh spam prefetch khi lướt nhanh qua nhiều video. */
const PREFETCH_DEBOUNCE_MS = 220;

/**
 * Prefetch HLS manifest cho video kế tiếp; poster cho +1/+2.
 * Không abort request đang chạy khi đổi slide (tránh lỗi đỏ trên Network).
 */
export function useFeedPrefetch(videos, activeIndex) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      feedPrefetchManager.prefetchAround(
        videos,
        activeIndex,
        resolveFeedPlaybackUrl,
      );
      for (const offset of [1]) {
        const item = videos[activeIndex + offset];
        const poster = item?.thumbnailUrl?.trim();
        if (poster) feedPrefetchManager.prefetchPoster(poster);
      }
    }, PREFETCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [videos, activeIndex]);
}
