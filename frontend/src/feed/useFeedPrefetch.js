import { useEffect } from "react";
import { feedPrefetchManager } from "./FeedPrefetchManager.js";
import { resolveFeedPlaybackUrl } from "./feedPlayback.js";

/**
 * Prefetch HLS manifests for videos after the active index.
 */
export function useFeedPrefetch(videos, activeIndex) {
  useEffect(() => {
    feedPrefetchManager.prefetchAround(videos, activeIndex, resolveFeedPlaybackUrl);
    const next = videos[activeIndex + 1];
    const poster = next?.thumbnailUrl?.trim();
    if (poster) feedPrefetchManager.prefetchPoster(poster);
    return () => feedPrefetchManager.cancelPending();
  }, [videos, activeIndex]);
}
