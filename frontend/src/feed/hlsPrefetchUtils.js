/** Resolve relative URI trong playlist HLS. */
export function resolvePlaylistUrl(baseUrl, ref) {
  const trimmed = String(ref ?? "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  try {
    return new URL(trimmed, baseUrl).href;
  } catch {
    return trimmed;
  }
}

/**
 * @param {string} text
 * @param {string} baseUrl
 * @returns {string[]} media refs (.m3u8 hoặc .ts)
 */
export function parseM3u8MediaRefs(text, baseUrl) {
  const refs = [];
  for (const raw of String(text ?? "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const abs = resolvePlaylistUrl(baseUrl, line);
    if (abs) refs.push(abs);
  }
  return refs;
}

/** Lấy variant playlist bitrate thấp nhất từ master (khớp hls.js auto khởi đầu). */
export function pickVariantPlaylistUrl(text, masterUrl) {
  const lines = String(text ?? "").split(/\r?\n/);
  /** @type {{ bandwidth: number, url: string }[]} */
  const variants = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line.startsWith("#EXT-X-STREAM-INF")) continue;
    const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
    const bandwidth = bwMatch ? Number(bwMatch[1]) : 0;
    for (let j = i + 1; j < lines.length; j += 1) {
      const uri = lines[j].trim();
      if (!uri) continue;
      if (uri.startsWith("#")) break;
      const abs = resolvePlaylistUrl(masterUrl, uri);
      if (abs && /\.m3u8(\?|$)/i.test(abs)) {
        variants.push({ bandwidth, url: abs });
      }
      break;
    }
  }

  if (variants.length) {
    variants.sort((a, b) => a.bandwidth - b.bandwidth);
    return variants[0].url;
  }

  const refs = parseM3u8MediaRefs(text, masterUrl);
  const variant = refs.find((u) => /\.m3u8(\?|$)/i.test(u));
  if (variant) return variant;
  const segment = refs.find((u) => /\.ts(\?|$)/i.test(u));
  if (segment) return null;
  return refs[0] ?? null;
}

/** Lấy vài segment .ts đầu từ media playlist. */
export function pickMediaSegmentUrls(text, mediaUrl, limit = 2) {
  return parseM3u8MediaRefs(text, mediaUrl)
    .filter((u) => /\.ts(\?|$)/i.test(u))
    .slice(0, Math.max(0, limit));
}
