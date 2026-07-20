import {
  absoluteUrl,
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SITE_NAME,
} from "./seoConfig.js";

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/favicon-512x512.png"),
    sameAs: [absoluteUrl("/")],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    description: DEFAULT_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/search")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function profilePageJsonLd(profile, canonical) {
  const username = String(profile?.username ?? "").replace(/^@/, "");
  const displayName =
    String(profile?.displayName ?? username ?? SITE_NAME).trim() || SITE_NAME;
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${displayName} | ${SITE_NAME}`,
    url: canonical,
    mainEntity: {
      "@type": "Person",
      name: displayName,
      alternateName: username ? `@${username}` : undefined,
      description: profile?.bio || undefined,
      image: profile?.avatarUrl ? absoluteUrl(profile.avatarUrl) : undefined,
      url: canonical,
    },
  };
}

export function videoObjectJsonLd(video, canonical) {
  const title = String(video?.title ?? "").trim() || DEFAULT_TITLE;
  const description =
    String(video?.description ?? "").trim() || "Xem video trên Vibely.";
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: title,
    description,
    thumbnailUrl: video?.thumbnailUrl
      ? [absoluteUrl(video.thumbnailUrl)]
      : undefined,
    uploadDate: video?.createdAt || undefined,
    duration: toIsoDuration(video?.durationSeconds),
    contentUrl: video?.videoUrl ? absoluteUrl(video.videoUrl) : undefined,
    embedUrl: canonical,
    url: canonical,
    author: {
      "@type": "Person",
      name:
        String(video?.authorDisplayName ?? "").trim() ||
        String(video?.authorUsername ?? "").replace(/^@/, "") ||
        SITE_NAME,
    },
    interactionStatistic: [
      statistic("WatchAction", video?.viewCount),
      statistic("LikeAction", video?.likeCount),
      statistic("CommentAction", video?.commentCount),
      statistic("ShareAction", video?.shareCount),
    ].filter(Boolean),
  };
}

function toIsoDuration(seconds) {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return undefined;
  return `PT${Math.round(total)}S`;
}

function statistic(actionType, count) {
  const value = Number(count);
  if (!Number.isFinite(value) || value <= 0) return null;
  return {
    "@type": "InteractionCounter",
    interactionType: { "@type": actionType },
    userInteractionCount: value,
  };
}
