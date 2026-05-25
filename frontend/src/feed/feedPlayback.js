/** Prefer CDN HLS master playlist; fall back to progressive URL. */
export function resolveFeedPlaybackUrl(video) {
  const master = String(video?.masterPlaylistUrl ?? "").trim();
  if (master && /\.m3u8(\?|$)/i.test(master)) return master;
  const direct = String(video?.videoUrl ?? "").trim();
  return direct || null;
}

export function isHlsPlaybackUrl(url) {
  return typeof url === "string" && /\.m3u8(\?|$)/i.test(url);
}
