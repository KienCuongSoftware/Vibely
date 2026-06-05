import { FEED_CONFIG } from "./feedConfig.js";
import { isHlsPlaybackUrl } from "./feedPlayback.js";
import { pickVariantPlaylistUrl } from "./hlsPrefetchUtils.js";

const WARM_CACHE_MAX = 64;

/**
 * Warm CDN cache cho HLS manifest — không abort khi lướt feed (tránh request đỏ).
 * Segment do player kế bên buffer qua hls.js.
 */
export class FeedPrefetchManager {
  constructor({ maxConcurrent = 2 } = {}) {
    this.maxConcurrent = maxConcurrent;
    this.active = 0;
    this.queue = [];
    /** @type {Set<string>} */
    this.warmDone = new Set();
    /** @type {string[]} */
    this.warmOrder = [];
    this.runId = 0;
  }

  /** Chỉ gọi khi unmount trang — không gọi mỗi lần đổi activeIndex. */
  cancelPending() {
    this.runId += 1;
  }

  rememberWarm(url) {
    if (!url || this.warmDone.has(url)) return;
    this.warmDone.add(url);
    this.warmOrder.push(url);
    while (this.warmOrder.length > WARM_CACHE_MAX) {
      const old = this.warmOrder.shift();
      if (old) this.warmDone.delete(old);
    }
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

  async fetchText(url) {
    const res = await fetch(url, {
      method: "GET",
      credentials: "omit",
      cache: "default",
      headers: { Accept: "application/vnd.apple.mpegurl,*/*" },
    });
    if (!res.ok) throw new Error(`prefetch ${res.status}`);
    return res.text();
  }

  /** Master + variant playlist — không prefetch .ts (tránh 404 / xung đột hls.js). */
  async warmHlsManifests(url) {
    const masterText = await this.fetchText(url);
    const variantUrl = pickVariantPlaylistUrl(masterText, url);
    if (variantUrl && variantUrl !== url) {
      await this.fetchText(variantUrl);
    }
  }

  /**
   * Warm CDN cho video kế tiếp — chạy nền, không hủy batch cũ khi lướt nhanh.
   */
  prefetchAround(videos, activeIndex, resolveUrl) {
    if (!Array.isArray(videos) || videos.length === 0) return;
    const runId = this.runId;

    const start = Math.max(0, activeIndex + 1);
    const end = Math.min(
      videos.length,
      start + FEED_CONFIG.PREFETCH_AHEAD_COUNT,
    );

    void (async () => {
      for (let i = start; i < end; i += 1) {
        if (runId !== this.runId) return;
        const url = resolveUrl(videos[i]);
        if (!url || !isHlsPlaybackUrl(url) || this.warmDone.has(url)) {
          continue;
        }
        const release = await this.acquireSlot();
        if (runId !== this.runId) {
          release();
          return;
        }
        try {
          await this.warmHlsManifests(url);
          this.rememberWarm(url);
        } catch {
          /* CDN / offline — player sẽ tải lại */
        } finally {
          release();
        }
      }
    })();
  }

  prefetchPoster(url) {
    if (!url || typeof url !== "string") return;
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  }
}

export const feedPrefetchManager = new FeedPrefetchManager();
