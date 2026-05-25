export function buildPlatformShareUrl(channel, { url, title = "" }) {
  const safeUrl = String(url ?? "").trim();
  if (!safeUrl) return "";
  const encodedUrl = encodeURIComponent(safeUrl);
  const encodedTitle = encodeURIComponent(title || "Vibely");
  const text = encodeURIComponent(title ? `${title} ${safeUrl}` : safeUrl);

  switch (channel) {
    case "whatsapp":
      return `https://wa.me/?text=${text}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    case "messenger":
      return `https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=0&redirect_uri=${encodedUrl}`;
    case "telegram":
      return `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`;
    case "twitter":
      return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    case "email":
      return `mailto:?subject=${encodedTitle}&body=${text}`;
    default:
      return safeUrl;
  }
}
