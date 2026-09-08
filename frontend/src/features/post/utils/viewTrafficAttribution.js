/**
 * Gắn nguồn phát hiện video khi client báo lượt xem (Studio Analytics).
 * Allowlist: foryou | profile | search | other.
 */

const ALLOWED_SOURCES = new Set(["foryou", "profile", "search", "other"]);
const SEARCH_QUERY_MAX = 80;

/**
 * @param {unknown} raw
 * @returns {string | undefined}
 */
export function sanitizeSearchQuery(raw) {
  const text = String(raw ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return undefined;
  return text.slice(0, SEARCH_QUERY_MAX);
}

/**
 * @param {unknown} raw
 * @returns {'foryou' | 'profile' | 'search' | 'other'}
 */
export function normalizeViewTrafficSource(raw) {
  const source = String(raw ?? "")
    .trim()
    .toLowerCase();
  return ALLOWED_SOURCES.has(source) ? source : "other";
}

/**
 * @param {{
 *   pathname?: string,
 *   search?: string,
 *   state?: Record<string, unknown> | null,
 *   feedMode?: string,
 *   videoPublicId?: string | null,
 * }} [opts]
 */
export function resolveViewTrafficAttribution(opts = {}) {
  const pathname = String(
    opts.pathname ??
      (typeof window !== "undefined" ? window.location.pathname : ""),
  ).toLowerCase();
  const search =
    opts.search ??
    (typeof window !== "undefined" ? window.location.search : "");
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const state = opts.state && typeof opts.state === "object" ? opts.state : {};
  const stateSourceRaw = String(state.viewTrafficSource ?? "").trim().toLowerCase();
  const stateSource = ALLOWED_SOURCES.has(stateSourceRaw) ? stateSourceRaw : "";
  const focusId = String(
    state.focusVideoPublicId ?? state.focusVideoId ?? "",
  ).trim();
  const videoId = String(opts.videoPublicId ?? "").trim();
  const stateApplies =
    Boolean(stateSource) && (!focusId || !videoId || focusId === videoId);

  if (stateApplies) {
    return attribution(stateSource, state.viewSearchQuery ?? params.get("q"));
  }

  const feedMode = String(opts.feedMode ?? "").trim().toLowerCase();
  if (feedMode === "for-you" || feedMode === "latest") {
    return { source: "foryou" };
  }
  if (feedMode === "following") {
    return { source: "other" };
  }

  if (pathname.startsWith("/search")) {
    return attribution("search", params.get("q"));
  }
  if (pathname.startsWith("/tag/")) {
    const tag = decodeUriSegment(pathname.slice("/tag/".length).split("/")[0]);
    return attribution("search", tag ? `#${tag}` : undefined);
  }

  if (/^\/@[^/]+\/[^/]+\/?$/.test(pathname) && !pathname.includes("/video/")) {
    return { source: "profile" };
  }

  if (pathname === "/" || pathname.startsWith("/foryou") || pathname.startsWith("/feed")) {
    return { source: "foryou" };
  }

  return { source: "other" };
}

/**
 * @param {Record<string, unknown>} body
 * @param {{ source?: string, searchQuery?: string }} attribution
 */
export function withViewTrafficFields(body, attribution) {
  const source = normalizeViewTrafficSource(attribution?.source);
  const searchQuery =
    source === "search" ? sanitizeSearchQuery(attribution?.searchQuery) : undefined;
  return {
    ...body,
    source,
    ...(searchQuery ? { searchQuery } : {}),
  };
}

/** Location state khi mở video từ trang tìm kiếm. */
export function searchViewNavState(query) {
  const searchQuery = sanitizeSearchQuery(query);
  return {
    viewTrafficSource: "search",
    ...(searchQuery ? { viewSearchQuery: searchQuery } : {}),
  };
}

function attribution(source, queryRaw) {
  const normalized = normalizeViewTrafficSource(source);
  const searchQuery =
    normalized === "search" ? sanitizeSearchQuery(queryRaw) : undefined;
  return searchQuery ? { source: normalized, searchQuery } : { source: normalized };
}

function decodeUriSegment(raw) {
  try {
    return decodeURIComponent(String(raw ?? "")).trim();
  } catch {
    return String(raw ?? "").trim();
  }
}
