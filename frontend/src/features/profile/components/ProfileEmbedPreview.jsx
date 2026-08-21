import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoPlay } from "react-icons/io5";

const DEFAULT_AVATAR = "/images/users/default-avatar.jpeg";

export function formatEmbedCompactCount(value, locale) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n < 0) return "0";
  return new Intl.NumberFormat(locale || undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

/**
 * Dark TikTok-style creator embed preview (standalone page / modal left pane).
 */
export function ProfileEmbedPreview({
  username,
  displayName,
  avatarUrl,
  bio = "",
  followingCount = 0,
  followerCount = 0,
  totalLikeCount = 0,
  videos = [],
  profileHref,
  privacyHref = "/legal/page/row/privacy-policy",
  openLabel,
  className = "",
}) {
  const { t, i18n } = useTranslation();
  const [bioExpanded, setBioExpanded] = useState(false);
  const handle = String(username ?? "")
    .trim()
    .replace(/^@+/, "");
  const name = String(displayName ?? "").trim() || handle;
  const avatar = String(avatarUrl ?? "").trim() || DEFAULT_AVATAR;
  const bioText = String(bio ?? "").trim();
  const href = profileHref || (handle ? `/@${handle}` : "/");
  const previewVideos = useMemo(
    () => (Array.isArray(videos) ? videos.filter(Boolean).slice(0, 9) : []),
    [videos],
  );
  const bioLong = bioText.length > 90;
  const cta = openLabel || t("profileEmbed.openVibely");
  const locale = i18n.resolvedLanguage || i18n.language;

  return (
    <article
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121212] text-zinc-100 shadow-[0_12px_40px_rgba(0,0,0,0.45)] ${className}`}
    >
      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
        <header className="flex items-start gap-3">
          <a href={href} target="_blank" rel="noreferrer" className="shrink-0">
            <img
              src={avatar}
              alt=""
              className="h-[52px] w-[52px] rounded-full object-cover ring-1 ring-white/10"
              onError={(e) => {
                e.currentTarget.src = DEFAULT_AVATAR;
              }}
            />
          </a>
          <div className="min-w-0 flex-1">
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-[17px] font-bold leading-tight text-white hover:underline"
            >
              {handle}
            </a>
            {name && name !== handle ? (
              <p className="mt-0.5 truncate text-[13px] text-zinc-400">{name}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-zinc-400">
              <span>
                <strong className="font-semibold text-white">
                  {formatEmbedCompactCount(followingCount, locale)}
                </strong>{" "}
                {t("profileEmbed.following")}
              </span>
              <span>
                <strong className="font-semibold text-white">
                  {formatEmbedCompactCount(followerCount, locale)}
                </strong>{" "}
                {t("profileEmbed.followers")}
              </span>
              <span>
                <strong className="font-semibold text-white">
                  {formatEmbedCompactCount(totalLikeCount, locale)}
                </strong>{" "}
                {t("profileEmbed.likes")}
              </span>
            </div>
          </div>
        </header>

        {bioText ? (
          <p className="mt-3 text-[13px] leading-snug text-zinc-300">
            {bioExpanded || !bioLong ? bioText : `${bioText.slice(0, 90).trimEnd()}…`}
            {bioLong ? (
              <button
                type="button"
                className="ml-1 cursor-pointer font-semibold text-zinc-100 hover:underline"
                onClick={() => setBioExpanded((v) => !v)}
              >
                {bioExpanded ? t("common.hideLess") : t("common.seeMore")}
              </button>
            ) : null}
          </p>
        ) : null}

        {previewVideos.length > 0 ? (
          <div className="mt-4 grid grid-cols-3 gap-1">
            {previewVideos.map((video) => {
              const thumb = String(video?.thumbnailUrl ?? "").trim();
              const views = formatEmbedCompactCount(
                video?.viewCount ?? video?.views ?? 0,
                locale,
              );
              const key = String(video?.publicId ?? video?.id ?? Math.random());
              return (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="relative aspect-9/16 overflow-hidden rounded-sm bg-zinc-800"
                >
                  {thumb ? (
                    <img src={thumb} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-zinc-600">
                      <IoPlay className="text-2xl" aria-hidden />
                    </span>
                  )}
                  <span className="absolute bottom-1 left-1 inline-flex items-center gap-0.5 text-[11px] font-semibold text-white drop-shadow">
                    <IoPlay className="text-[10px]" aria-hidden />
                    {views}
                  </span>
                </a>
              );
            })}
          </div>
        ) : (
          <p className="mt-6 text-center text-sm text-zinc-500">
            {t("profileEmbed.noPublicVideos")}
          </p>
        )}
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="text-[15px] font-extrabold tracking-tight text-white">Vibely</p>
          <a
            href={privacyHref}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 block truncate text-[11px] text-zinc-500 hover:text-zinc-300 hover:underline"
          >
            {t("profileEmbed.viewPrivacy")}
          </a>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-[#fe2c55] px-4 text-sm font-semibold text-white transition hover:bg-[#db2449]"
        >
          {cta}
        </a>
      </footer>
    </article>
  );
}
