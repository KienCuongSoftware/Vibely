/**
 * Caption shown under @username on feed / profile overlays.
 * Prefer user description; never fall back to the generic Studio placeholder title "Video".
 */
export function isGenericVideoTitle(title) {
  return /^video$/i.test(String(title ?? "").trim());
}

export function resolveDisplayCaption(videoOrDescription, maybeTitle) {
  if (
    videoOrDescription != null &&
    typeof videoOrDescription === "object" &&
    !Array.isArray(videoOrDescription)
  ) {
    const desc = String(videoOrDescription.description ?? "").trim();
    if (desc) return desc;
    const title = String(videoOrDescription.title ?? "").trim();
    if (title && !isGenericVideoTitle(title)) return title;
    return "";
  }

  const desc = String(videoOrDescription ?? "").trim();
  if (desc) return desc;
  const title = String(maybeTitle ?? "").trim();
  if (title && !isGenericVideoTitle(title)) return title;
  return "";
}

/** Studio list label when description is empty. */
export function resolveStudioListLabel(video, { emptyLabel = "Không có mô tả" } = {}) {
  const caption = resolveDisplayCaption(video);
  return caption || emptyLabel;
}
