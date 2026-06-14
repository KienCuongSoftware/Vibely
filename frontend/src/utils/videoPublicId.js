import { getAppOrigin } from '../config/appOrigin.js'

/** UUID v4/v7 string validation for public video identifiers. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const NUMERIC_ONLY = /^\d+$/;

/**
 * @param {unknown} value
 * @returns {string | null}
 */
export function normalizeVideoPublicId(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed || NUMERIC_ONLY.test(trimmed)) return null;
  return UUID_PATTERN.test(trimmed) ? trimmed.toLowerCase() : null;
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isVideoPublicId(value) {
  return normalizeVideoPublicId(value) != null;
}

/**
 * @param {{ publicId?: unknown } | null | undefined} video
 * @returns {string | null}
 */
export function videoPublicIdOf(video) {
  return normalizeVideoPublicId(video?.publicId);
}

/**
 * @param {unknown} publicId
 * @returns {string}
 */
export function buildVideoWatchUrl(publicId) {
  const id = normalizeVideoPublicId(publicId);
  if (!id) return "";
  const path = `/watch/${id}`;
  const origin = getAppOrigin();
  if (origin) return `${origin}${path}`;
  return path;
}

/**
 * @param {unknown} publicId
 * @returns {string}
 */
export function buildVideoEmbedUrl(publicId) {
  const id = normalizeVideoPublicId(publicId);
  if (!id) return "";
  const path = `/embed/${id}`;
  const origin = getAppOrigin();
  if (origin) return `${origin}${path}`;
  return path;
}

/**
 * @param {string} username
 * @param {unknown} publicId
 * @returns {string}
 */
export function buildProfileVideoUrl(username, publicId) {
  const id = normalizeVideoPublicId(publicId);
  const handle = String(username ?? "").trim().replace(/^@+/, "");
  if (!id || !handle) return "";
  return `/${encodeURIComponent(handle)}/video/${id}`;
}

/** Permalink when opening a video from the activity / notifications inbox (TikTok-style shell). */
export function buildActivityVideoUrl(username, publicId) {
  const id = normalizeVideoPublicId(publicId);
  const handle = String(username ?? "").trim().replace(/^@+/, "");
  if (!id || !handle) return "";
  return `/activity/${encodeURIComponent(handle)}/video/${id}`;
}

/**
 * @param {unknown} channel
 * @param {unknown} publicId
 * @returns {string}
 */
export function shareIdempotencyKey(channel, publicId) {
  const id = normalizeVideoPublicId(publicId) ?? String(publicId ?? "").trim();
  const ch = String(channel ?? "default").trim().toLowerCase() || "default";
  return `${ch}:${id}`;
}
