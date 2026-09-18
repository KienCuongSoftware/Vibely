/**
 * Louder photo-post soundtracks without MediaElementSource.
 *
 * createMediaElementSource permanently reroutes an <audio> element; with CDN
 * audio that lacks (or taints) CORS that path goes silent. Instead we fetch +
 * decode into an AudioBuffer and play through a GainNode. On fetch/CORS
 * failure, callers fall back to plain HTMLMediaElement.volume (max 1).
 */

/** Perceptual loudness target roughly in line with typical feed video levels. */
export const PHOTO_FEED_TARGET_RMS = 0.14;

const CACHE_LIMIT = 8;

/**
 * Estimate a gain that lifts quiet library tracks toward feed-video loudness
 * without clipping peaks above ~0.98.
 */
export function computeMatchGain(audioBuffer, targetRms = PHOTO_FEED_TARGET_RMS) {
  if (!audioBuffer || audioBuffer.length === 0) return 1;

  let sumSq = 0;
  let n = 0;
  let peak = 0;
  const channels = audioBuffer.numberOfChannels;

  for (let c = 0; c < channels; c += 1) {
    const data = audioBuffer.getChannelData(c);
    const step = Math.max(1, Math.floor(data.length / 80_000));
    for (let i = 0; i < data.length; i += step) {
      const v = data[i];
      sumSq += v * v;
      const a = v < 0 ? -v : v;
      if (a > peak) peak = a;
      n += 1;
    }
  }

  if (n === 0) return 1;
  const rms = Math.sqrt(sumSq / n);
  if (rms < 1e-5) return 1;

  let gain = targetRms / rms;
  if (peak > 0 && peak * gain > 0.98) {
    gain = 0.98 / peak;
  }
  return Math.min(4, Math.max(0.9, gain));
}

function getAudioContextCtor() {
  return window.AudioContext || window.webkitAudioContext || null;
}

/**
 * @returns {{
 *   sync: (opts: {
 *     url: string,
 *     htmlEl: HTMLAudioElement | null,
 *     muted: boolean,
 *     paused: boolean,
 *     volume: number,
 *   }) => void,
 *   dispose: () => void,
 * }}
 */
export function createPhotoAudioBoostController() {
  /** @type {AudioContext | null} */
  let ctx = null;
  /** @type {GainNode | null} */
  let gainNode = null;
  /** @type {AudioBufferSourceNode | null} */
  let sourceNode = null;
  /** @type {Map<string, AudioBuffer>} */
  const bufferCache = new Map();
  /** @type {Map<string, number>} */
  const matchGainCache = new Map();
  /** @type {string | null} */
  let activeUrl = null;
  /** @type {'boost' | 'html' | 'idle'} */
  let mode = "idle";
  /** @type {AbortController | null} */
  let loadAbort = null;
  /** @type {number} */
  let generation = 0;
  let disposed = false;

  const ensureGraph = async () => {
    const Ctor = getAudioContextCtor();
    if (!Ctor) return null;
    if (!ctx) {
      ctx = new Ctor();
      gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);
    }
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        /* autoplay policy — caller may retry after gesture */
      }
    }
    return ctx;
  };

  const stopSource = () => {
    if (!sourceNode) return;
    try {
      sourceNode.onended = null;
      sourceNode.stop();
    } catch {
      /* already stopped */
    }
    try {
      sourceNode.disconnect();
    } catch {
      /* ignore */
    }
    sourceNode = null;
  };

  const pauseHtml = (htmlEl) => {
    if (!htmlEl) return;
    try {
      htmlEl.pause();
    } catch {
      /* ignore */
    }
  };

  const clearHtmlSrc = (htmlEl) => {
    if (!htmlEl) return;
    pauseHtml(htmlEl);
    htmlEl.removeAttribute("src");
    try {
      htmlEl.load();
    } catch {
      /* ignore */
    }
  };

  const applyGain = (volume, muted, matchGain) => {
    if (!gainNode) return;
    const level = Math.min(1, Math.max(0, Number(volume) || 0));
    const boost = Number.isFinite(matchGain) && matchGain > 0 ? matchGain : 1;
    gainNode.gain.value = muted ? 0 : level * boost;
  };

  const playHtmlFallback = (htmlEl, url, volume, muted, paused) => {
    mode = "html";
    stopSource();
    if (!htmlEl) return;
    if (htmlEl.getAttribute("src") !== url) {
      htmlEl.src = url;
    }
    htmlEl.loop = true;
    htmlEl.muted = Boolean(muted);
    htmlEl.volume = muted ? 0 : Math.min(1, Math.max(0, Number(volume) || 0));
    if (muted || paused) {
      pauseHtml(htmlEl);
      return;
    }
    const playPromise = htmlEl.play();
    if (playPromise?.catch) {
      playPromise.catch(() => {
        /* autoplay blocked until gesture */
      });
    }
  };

  const rememberBuffer = (url, buffer, matchGain) => {
    if (bufferCache.has(url)) {
      bufferCache.delete(url);
      matchGainCache.delete(url);
    }
    bufferCache.set(url, buffer);
    matchGainCache.set(url, matchGain);
    while (bufferCache.size > CACHE_LIMIT) {
      const oldest = bufferCache.keys().next().value;
      bufferCache.delete(oldest);
      matchGainCache.delete(oldest);
    }
  };

  const startBoosted = (buffer, url, volume, muted, paused, htmlEl) => {
    if (!ctx || !gainNode) return false;
    stopSource();
    pauseHtml(htmlEl);
    const matchGain = matchGainCache.get(url) ?? computeMatchGain(buffer);
    matchGainCache.set(url, matchGain);
    applyGain(volume, muted, matchGain);

    if (muted || paused) {
      mode = "boost";
      activeUrl = url;
      return true;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gainNode);
    try {
      source.start(0);
    } catch {
      return false;
    }
    sourceNode = source;
    mode = "boost";
    activeUrl = url;
    return true;
  };

  const loadAndPlay = async (url, htmlEl, volume, muted, paused, gen) => {
    const audioCtx = await ensureGraph();
    if (disposed || gen !== generation) return;

    if (!audioCtx || !gainNode) {
      playHtmlFallback(htmlEl, url, volume, muted, paused);
      return;
    }

    let buffer = bufferCache.get(url) ?? null;
    if (!buffer) {
      loadAbort?.abort();
      const ac = new AbortController();
      loadAbort = ac;
      try {
        const res = await fetch(url, {
          mode: "cors",
          credentials: "omit",
          signal: ac.signal,
        });
        if (!res.ok) throw new Error(`audio fetch ${res.status}`);
        const raw = await res.arrayBuffer();
        if (disposed || gen !== generation) return;
        buffer = await audioCtx.decodeAudioData(raw.slice(0));
        if (disposed || gen !== generation) return;
        rememberBuffer(url, buffer, computeMatchGain(buffer));
      } catch {
        if (disposed || gen !== generation || ac.signal.aborted) return;
        playHtmlFallback(htmlEl, url, volume, muted, paused);
        return;
      }
    }

    if (disposed || gen !== generation) return;
    if (!startBoosted(buffer, url, volume, muted, paused, htmlEl)) {
      playHtmlFallback(htmlEl, url, volume, muted, paused);
    }
  };

  return {
    sync({ url, htmlEl, muted, paused, volume }) {
      if (disposed) return;
      const nextUrl = String(url ?? "").trim();

      if (!nextUrl) {
        generation += 1;
        loadAbort?.abort();
        loadAbort = null;
        stopSource();
        clearHtmlSrc(htmlEl);
        activeUrl = null;
        mode = "idle";
        if (gainNode) gainNode.gain.value = 0;
        return;
      }

      const level = Math.min(1, Math.max(0, Number(volume) || 0));

      if (mode === "boost" && activeUrl === nextUrl) {
        applyGain(level, muted, matchGainCache.get(nextUrl) ?? 1);
        if (muted || paused) {
          stopSource();
          pauseHtml(htmlEl);
          return;
        }
        if (!sourceNode) {
          const buffer = bufferCache.get(nextUrl);
          if (buffer) {
            startBoosted(buffer, nextUrl, level, muted, paused, htmlEl);
            return;
          }
        } else {
          pauseHtml(htmlEl);
          return;
        }
      }

      if (mode === "html" && activeUrl === nextUrl) {
        playHtmlFallback(htmlEl, nextUrl, level, muted, paused);
        return;
      }

      generation += 1;
      const gen = generation;
      activeUrl = nextUrl;
      void loadAndPlay(nextUrl, htmlEl, level, muted, paused, gen);
    },

    dispose() {
      disposed = true;
      generation += 1;
      loadAbort?.abort();
      loadAbort = null;
      stopSource();
      bufferCache.clear();
      matchGainCache.clear();
      activeUrl = null;
      mode = "idle";
      if (gainNode) {
        try {
          gainNode.disconnect();
        } catch {
          /* ignore */
        }
      }
      gainNode = null;
      if (ctx) {
        try {
          void ctx.close();
        } catch {
          /* ignore */
        }
      }
      ctx = null;
    },
  };
}
