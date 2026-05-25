import { FEED_CONFIG } from "./feedConfig.js";
import { isHlsPlaybackUrl } from "./feedPlayback.js";

/**
 * Limits concurrent media work and prefetches HLS manifests (not full segments).
 */
export class FeedPrefetchManager {
  constructor({ maxConcurrent = 2 } = {}) {
    this.maxConcurrent = maxConcurrent;
    this.active = 0;
    this.queue = [];
    this.manifestDone = new Set();
    this.abort = null;
  }

  cancelPending() {
    this.abort?.abort();
    this.abort = null;
  }

  acquireSlot() {
    return new Promise((resolve) => {
      const tryRun = () => {
        if (this.active < this.maxConcurrent) {
          this.active += 1;
          resolve(() => {
            this.active -= 1;
            const next = this.queue.shift();
            if (next) next();
          });
        } else {
          this.queue.push(() => {
            this.active += 1;
            resolve(() => {
              this.active -= 1;
              const n = this.queue.shift();
              if (n) n();
            });
          });
        }
      };
      tryRun();
    });
  }

  /**
   * Warm CDN cache for upcoming HLS master playlists only.
   * @param {Array<{ publicId?: string }>} videos
   * @param {number} activeIndex
   * @param {(video: unknown) => string | null} resolveUrl
   */
  prefetchAround(videos, activeIndex, resolveUrl) {
    this.cancelPending();
    if (!Array.isArray(videos) || videos.length === 0) return;
    const controller = new AbortController();
    this.abort = controller;

    const start = Math.max(0, activeIndex + 1);
    const end = Math.min(
      videos.length,
      start + FEED_CONFIG.PREFETCH_AHEAD_COUNT,
    );

    void (async () => {
      for (let i = start; i < end; i += 1) {
        if (controller.signal.aborted) return;
        const url = resolveUrl(videos[i]);
        if (!url || !isHlsPlaybackUrl(url) || this.manifestDone.has(url)) {
          continue;
        }
        const release = await this.acquireSlot();
        if (controller.signal.aborted) {
          release();
          return;
        }
        try {
          await fetch(url, {
            method: "GET",
            signal: controller.signal,
            credentials: "omit",
            cache: "force-cache",
            headers: { Accept: "application/vnd.apple.mpegurl,*/*" },
          });
          this.manifestDone.add(url);
        } catch {
          /* offline / CORS — player will retry */
        } finally {
          release();
        }
      }
    })();
  }

  /** Poster-only warm (cheap); skips if already prefetched manifest for same thumb. */
  prefetchPoster(url) {
    if (!url || typeof url !== "string") return;
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  }
}

export const feedPrefetchManager = new FeedPrefetchManager();
