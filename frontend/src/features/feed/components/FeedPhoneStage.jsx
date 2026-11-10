import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { VirtualizedFeed } from "@/features/feed/components/VirtualizedFeed";
import { FeedPhotoCarousel, photoUrlsOf } from "@/features/feed/components/FeedPhotoCarousel.jsx";
import {
  IoVolumeHigh,
  IoVolumeLow,
  IoVolumeMedium,
  IoVolumeMute,
} from "react-icons/io5";
import { VideoLocationBadge } from "@/features/post/components/VideoLocationBadge.jsx";
import { LuRepeat2 } from "react-icons/lu";
import { FeedSubtitlesModal } from "@/features/feed/components/FeedSubtitlesModal.jsx";
import { useFeedSubtitlesPrefs } from "@/features/feed/hooks/useFeedSubtitlesPrefs.js";
import { resolveFeedPlaybackUrl } from "@/features/feed/utils/feedPlayback.js";
import { createPhotoAudioBoostController } from "@/features/feed/utils/photoFeedAudioBoost.js";
import { downloadWatermarkedVideo } from "@/features/feed/utils/videoDownload.js";
import { FeedTranslatedCaption } from "@/features/feed/components/FeedTranslatedCaption.jsx";
import { FeedTimedCaptions } from "@/features/feed/components/FeedTimedCaptions.jsx";
import { useFeedPrefetch } from "@/features/feed/hooks/useFeedPrefetch.js";
import { VideoContextMenu } from "@/features/feed/components/VideoContextMenu.jsx";
import { FeedProgressBar } from "@/features/feed/components/FeedProgressBar.jsx";
import { FeedControlBar } from "@/features/feed/components/FeedControlBar.jsx";
import { FeedSlideVideoPlayer } from "@/features/feed/components/FeedSlideVideoPlayer.jsx";
import {
  localeCodeToSubtitleIso,
  subtitleLangToIso,
} from "@/features/feed/utils/subtitleLangMap.js";
import { FeedReportModal } from "@/features/report/components/FeedReportModal.jsx";
import { FeedReportedVideoOverlay } from "@/features/feed/components/FeedReportedVideoOverlay.jsx";
import { normalizeVideoPublicId } from "@/features/post/utils/videoPublicId.js";
import { resolveDisplayCaption } from "@/features/post/utils/videoCaption.js";
import { SelfRepostIndicator } from "@/features/feed/components/SelfRepostIndicator.jsx";
import { AvatarImage } from "@/shared/components/AvatarImage.jsx";
import { useMainSidebarCollapse } from "@/shared/store/MainSidebarCollapseContext.jsx";
import {
  FEED_CAPTION_PROGRESS_PAD_PX,
  FEED_COMMENTS_PANEL_WIDTH_PX,
  FEED_PROGRESS_TRACK_BOTTOM_PX,
  computeFeedUnifiedStageSizePx,
} from "@/features/feed/utils/feedLayout.js";
import { getVideoDurationSeconds } from "@/features/feed/utils/videoDuration.js";

function feedAuthorProfilePath(video) {
  const raw = String(video?.authorUsername ?? "vibely")
    .trim()
    .replace(/^@/, "");
  return raw ? `/@${encodeURIComponent(raw)}` : "";
}

function feedHashtagPath(token) {
  const raw = String(token ?? "")
    .trim()
    .replace(/^#/, "");
  return raw ? `/tag/${encodeURIComponent(raw)}` : "/foryou";
}

function renderInteractiveCaption(caption) {
  const source = String(caption ?? "");
  if (!source) return "\u00A0";
  const parts = source.split(/([#@][^\s#@]+)/g);
  return parts.map((part, index) => {
    if (!part) return null;
    if (/^@[^\s#@]+$/.test(part)) {
      const username = part.slice(1);
      return (
        <Link
          key={`${part}-${index}`}
          to={`/@${encodeURIComponent(username)}`}
          onClick={(e) => e.stopPropagation()}
          className="cursor-pointer font-semibold text-[#B6E3FF] hover:text-[#D0EEFF] hover:underline"
        >
          {part}
        </Link>
      );
    }
    if (/^#[^\s#@]+$/.test(part)) {
      return (
        <Link
          key={`${part}-${index}`}
          to={feedHashtagPath(part)}
          onClick={(e) => e.stopPropagation()}
          className="cursor-pointer font-semibold text-[#B6E3FF] hover:text-[#D0EEFF] hover:underline"
        >
          {part}
        </Link>
      );
    }
    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
}

const CAPTION_TEXT_CLASS =
  "min-w-0 text-[15px] font-normal leading-[1.35] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]";

/** Mô tả dài: 1 dòng + «thêm» sát chữ (kiểu TikTok); «ẩn bớt» khi mở rộng. */
export function FeedVideoCaption({ caption, onNeedsGradientChange }) {
  const { t } = useTranslation();
  const text = String(caption ?? "").trim();
  const [expanded, setExpanded] = useState(false);
  const [overflowsOneLine, setOverflowsOneLine] = useState(false);
  const visibleRef = useRef(null);
  const overflowsRef = useRef(false);

  useEffect(() => {
    setExpanded(false);
    overflowsRef.current = false;
    setOverflowsOneLine(false);
  }, [text]);

  const measureCaption = useCallback(() => {
    const el = visibleRef.current;
    if (!text) {
      overflowsRef.current = false;
      setOverflowsOneLine(false);
      return;
    }
    // Khi expanded, node đo truncate bị unmount — giữ cờ overflow cũ.
    if (expanded || !el) {
      setOverflowsOneLine(overflowsRef.current);
      return;
    }
    const overflow =
      el.scrollWidth > el.clientWidth + 1 ||
      el.scrollHeight > el.clientHeight + 1;
    overflowsRef.current = overflow;
    setOverflowsOneLine(overflow);
  }, [text, expanded]);

  useLayoutEffect(() => {
    measureCaption();
  }, [measureCaption]);

  useEffect(() => {
    const el = visibleRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => measureCaption());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureCaption]);

  useLayoutEffect(() => {
    if (!text) {
      onNeedsGradientChange?.("none");
      return;
    }
    onNeedsGradientChange?.(expanded ? "strong" : "light");
  }, [expanded, onNeedsGradientChange, text]);

  if (!text) {
    return (
      <p className={`${CAPTION_TEXT_CLASS} truncate`}>
        {renderInteractiveCaption("\u00A0")}
      </p>
    );
  }

  const collapsed = overflowsOneLine && !expanded;

  if (expanded) {
    return (
      <div className="min-w-0 max-w-full">
        <p className={`${CAPTION_TEXT_CLASS} wrap-break-word`}>
          {renderInteractiveCaption(text)}
          <>
            {" "}
            <button
              type="button"
              className="inline cursor-pointer bg-transparent p-0 text-[15px] font-bold leading-[1.35] text-white hover:text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(false);
              }}
            >
              {t('feed.collapse')}
            </button>
          </>
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 max-w-full items-baseline gap-1.5">
      <p
        ref={visibleRef}
        className={`${CAPTION_TEXT_CLASS} min-w-0 flex-1 truncate`}
      >
        {renderInteractiveCaption(text)}
      </p>
      {collapsed ? (
        <button
          type="button"
          className="shrink-0 cursor-pointer bg-transparent p-0 text-[15px] font-bold leading-[1.35] text-white hover:text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
        >
          {t('feed.expand')}
        </button>
      ) : null}
    </div>
  );
}

/** Avatar + tên + Follow + caption — góc trái dưới kiểu TikTok web. */
function FeedSlideAuthorMeta({
  rawVibelyUser,
  authorProfilePath,
  authorAvatarUrl,
  defaultAuthorAvatar,
  captionText,
  videoPublicId,
  descriptionLang,
  authToken,
  captionActive = true,
  compact = false,
  showFollow = false,
  followBusy = false,
  onFollow,
  repostedByDisplayName,
  repostedByUsername,
  selfReposted = false,
  selfRepostAvatarUrl,
  selfRepostDisplayName,
  selfRepostUsername,
  selfRepostProfilePath,
  onSelfUnrepost,
  selfRepostBusy = false,
  /** Timed CC — xếp trên avatar/tên trong cùng cột meta. */
  timedCaptions = null,
  locationName = null,
}) {
  const { t } = useTranslation();
  const [captionWash, setCaptionWash] = useState("none");
  const displayName = rawVibelyUser || "vibely";
  const locationLabel = String(locationName ?? "").trim();
  const nameClass =
    "min-w-0 truncate text-[15px] font-bold leading-none text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.65)]";
  const repostLabel = repostedByUsername
    ? String(repostedByDisplayName ?? repostedByUsername).trim() ||
      repostedByUsername
    : "";
  const avatarSrc =
    String(authorAvatarUrl ?? "").trim() || defaultAuthorAvatar || undefined;
  const nameEl = authorProfilePath ? (
    <Link
      to={authorProfilePath}
      onClick={(e) => e.stopPropagation()}
      className={`${nameClass} hover:underline`}
    >
      {displayName}
    </Link>
  ) : (
    <span className={nameClass}>{displayName}</span>
  );

  const padClass = compact
    ? "px-3 pb-0 pt-0.5 sm:px-4"
    : "px-3 pb-0 pt-1 sm:px-4";

  /** Wash kéo xuống sát thanh tiến trình (bù padding đáy caption). */
  const washBottomPx = FEED_CAPTION_PROGRESS_PAD_PX;
  const washClass =
    captionWash === "strong"
      ? "pointer-events-none absolute inset-x-0 bg-linear-to-t from-black/75 from-[0%] via-black/32 via-[22%] to-transparent to-[72%]"
      : captionWash === "light"
        ? "pointer-events-none absolute inset-x-0 bg-linear-to-t from-black/40 from-[0%] via-black/14 via-[38%] to-transparent to-[90%]"
        : null;
  const washStyle =
    captionWash === "strong"
      ? { bottom: -washBottomPx, height: `calc(10.5rem + ${washBottomPx}px)` }
      : captionWash === "light"
        ? { bottom: -washBottomPx, height: `calc(4.5rem + ${washBottomPx}px)` }
        : undefined;

  return (
    <div className={`pointer-events-auto relative shrink-0 ${padClass}`}>
      {washClass ? (
        <div className={washClass} style={washStyle} aria-hidden />
      ) : null}
      <div className="relative z-10 max-w-[min(92%,28rem)]">
        {timedCaptions}
        {selfReposted ? (
          <SelfRepostIndicator
            avatarUrl={selfRepostAvatarUrl}
            displayName={selfRepostDisplayName}
            username={selfRepostUsername}
            profilePath={selfRepostProfilePath}
            onUnrepost={onSelfUnrepost}
            busy={selfRepostBusy}
            theme="overlay"
          />
        ) : repostLabel ? (
          <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]">
            <LuRepeat2
              className="shrink-0 text-sm text-[#FACE15]"
              aria-hidden
            />
            <span className="truncate">{t('feed.nameReposted', { name: repostLabel })}</span>
          </p>
        ) : null}
        {locationLabel ? (
          <div className="mb-1.5">
            <VideoLocationBadge name={locationLabel} />
          </div>
        ) : null}
        <div className="flex min-w-0 items-center gap-2.5">
          {authorProfilePath ? (
            <Link
              to={authorProfilePath}
              onClick={(e) => e.stopPropagation()}
              aria-label={t("feed.viewProfileOf", { user: displayName })}
              className="h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-white/25"
            >
              <AvatarImage
                className="h-full w-full object-cover"
                src={avatarSrc}
                alt=""
                fallbackSrc={defaultAuthorAvatar}
              />
            </Link>
          ) : (
            <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-white/25">
              <AvatarImage
                className="h-full w-full object-cover"
                src={avatarSrc}
                alt=""
                fallbackSrc={defaultAuthorAvatar}
              />
            </span>
          )}
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {nameEl}
            {showFollow ? (
              <button
                type="button"
                aria-label={t("feed.followUser", { user: displayName })}
                disabled={followBusy}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onFollow?.(e);
                }}
                className="shrink-0 cursor-pointer rounded-md bg-[#fe2c55] px-3 py-1 text-[13px] font-bold leading-none text-white transition hover:bg-[#e6284c] disabled:cursor-wait disabled:opacity-75"
              >
                {t("profilePage.follow")}
              </button>
            ) : null}
          </div>
        </div>
        {String(captionText ?? "").trim() ? (
          <div className="mt-1 min-w-0">
            <FeedTranslatedCaption
              videoPublicId={videoPublicId}
              captionText={captionText}
              descriptionLang={descriptionLang}
              token={authToken}
              active={captionActive}
              renderCaption={(text) => (
                <FeedVideoCaption
                  caption={text}
                  onNeedsGradientChange={setCaptionWash}
                />
              )}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Re-export — dùng feedLayout.js làm nguồn duy nhất. */
export { FEED_COMMENTS_PANEL_WIDTH_PX } from "@/features/feed/utils/feedLayout.js";

/** Cột feed hẹp — video dọc (mặc định, gần TikTok web). */
export const FEED_STAGE_OUTER_WIDTH_CLASS_PORTRAIT =
  "w-[min(240px,78vw)] shrink-0 md:w-[min(304px,82vw)] lg:w-[min(352px,min(76vw,448px))]";

/** @deprecated — landscape dùng computeFeedLandscapeStageWidthPx. */
export const FEED_STAGE_OUTER_WIDTH_CLASS_WIDE =
  "w-[min(390px,92vw)] shrink-0 md:w-[min(560px,94vw)] lg:w-[min(760px,min(94vw,1040px))] xl:w-[min(880px,min(95vw,1180px))]";

export const FEED_STAGE_OUTER_WIDTH_CLASS_WIDE_DOCKED =
  FEED_STAGE_OUTER_WIDTH_CLASS_WIDE;

/** Skeleton / chỗ chưa biết tỉ lệ: dùng khung dọc. */
export const FEED_STAGE_OUTER_WIDTH_CLASS =
  FEED_STAGE_OUTER_WIDTH_CLASS_PORTRAIT;

const FEED_VOLUME_DEFAULT = 1;

function FeedVolumeIcon({ soundOn, volume }) {
  if (!soundOn || volume === 0) {
    return <IoVolumeMute className="h-[22px] w-[22px]" aria-hidden />;
  }
  if (volume < 0.34) {
    return <IoVolumeLow className="h-[22px] w-[22px]" aria-hidden />;
  }
  if (volume < 0.67) {
    return <IoVolumeMedium className="h-[22px] w-[22px]" aria-hidden />;
  }
  return <IoVolumeHigh className="h-[22px] w-[22px]" aria-hidden />;
}

/**
 * TikTok For You volume:
 * - Muted → mute icon always visible (no video hover needed)
 * - Unmuted → speaker shows on video hover; slider only when hovering the control
 * Slider is unmounted when collapsed so the white track/thumb never leaks into the icon.
 */
export function FeedVolumeControl({
  volume,
  onVolumeChange,
  soundOn,
  onSoundOnChange,
  /** Theater chrome ngoài video — luôn hiện icon (không phụ thuộc hover khung video). */
  alwaysVisible = false,
}) {
  const { t } = useTranslation();
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isMuted = !soundOn || volume <= 0;
  const expanded = pinned || hovered;

  useEffect(() => {
    if (!pinned) return undefined;
    const release = () => setPinned(false);
    window.addEventListener("pointerup", release, { capture: true });
    window.addEventListener("pointercancel", release, { capture: true });
    return () => {
      window.removeEventListener("pointerup", release, { capture: true });
      window.removeEventListener("pointercancel", release, { capture: true });
    };
  }, [pinned]);

  const stopFeedPointer = (e) => {
    e.stopPropagation();
  };

  const pinInteraction = (e) => {
    e.stopPropagation();
    setPinned(true);
  };

  const toggleSound = (e) => {
    e.stopPropagation();
    if (!isMuted) {
      onSoundOnChange(false);
      return;
    }
    onSoundOnChange(true);
    if (volume === 0) {
      onVolumeChange(FEED_VOLUME_DEFAULT);
    }
  };

  const onSlider = (e) => {
    e.stopPropagation();
    const v = Number(e.target.value);
    onVolumeChange(v);
    onSoundOnChange(v > 0);
  };

  // Muted: always on. Unmuted: only with video hover (group) unless alwaysVisible / pinned / hovering vol.
  const shellVisibility = isMuted || alwaysVisible || pinned
    ? "pointer-events-auto opacity-100"
    : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100 group-has-[.feed-video-more-panel:hover]:pointer-events-none group-has-[.feed-video-more-panel:hover]:opacity-0";

  return (
    <div
      className={`feed-volume-control group/vol relative flex h-10 items-center transition-opacity duration-150 ease-out ${shellVisibility}`}
      onPointerDown={stopFeedPointer}
      onMouseDown={stopFeedPointer}
      onClick={stopFeedPointer}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`feed-volume-control-shell flex h-10 items-center overflow-hidden rounded-full transition-[max-width,padding,box-shadow] duration-200 ease-out ${
          expanded
            ? "max-w-[11.5rem] py-0 pl-1.5 pr-3 shadow-[0_4px_18px_rgba(0,0,0,0.35)] backdrop-blur-md"
            : "max-w-10 p-0 shadow-[0_2px_10px_rgba(0,0,0,0.28)] backdrop-blur-[2px]"
        }`}
      >
        <button
          type="button"
          aria-label={isMuted ? t('feed.unmute') : t('feed.mute')}
          className="relative z-20 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center text-white transition-opacity hover:opacity-90"
          onPointerDown={stopFeedPointer}
          onClick={toggleSound}
        >
          <FeedVolumeIcon soundOn={soundOn} volume={volume} />
        </button>
        {expanded ? (
          <div className="relative z-10 flex h-10 w-[7.25rem] shrink-0 items-center overflow-hidden">
            <div
              className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center"
              aria-hidden
            >
              <div className="relative h-[4px] w-full overflow-hidden rounded-full bg-white/30">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-white"
                  style={{ width: `${Math.min(100, Math.max(0, volume * 100))}%` }}
                />
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              aria-label={t('feed.volume')}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(volume * 100)}
              className="feed-volume-slider pointer-events-auto relative z-10 w-full cursor-pointer"
              onPointerDown={pinInteraction}
              onChange={onSlider}
              onInput={onSlider}
              onClick={stopFeedPointer}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function FeedPhoneStage({
  videos,
  activeIndex,
  setActiveIndex,
  feedSlotHeightPx,
  virtualFeedRef,
  loadMoreFeed,
  feedVideoRef,
  feedVolume,
  setFeedVolume,
  feedSoundOn,
  setFeedSoundOn,
  playbackMuted,
  feedMoreMenuOpen,
  setFeedMoreMenuOpen,
  feedVideoQuality,
  feedPlaybackSpeed,
  setFeedPlaybackSpeed,
  feedAutoScrollEnabled,
  setFeedAutoScrollEnabled,
  toggleFeedPlayback,
  userPaused = false,
  toggleFeedPictureInPicture,
  feedDefaultAuthorAvatar,
  thumbnailFallbackUrl,
  onActiveFeedPlaybackTick,
  onActiveFeedPlaybackEnded,
  /** Panel bình luận bên phải đang mở — video ngang thu nhỏ khung. */
  commentsDockOpen = false,
  /** Mobile web: video full bleed (TikTok phone layout). */
  mobileFullBleed = false,
  /** Desktop watch chrome — ẩn sidebar-style overlays trong khung (X/volume do parent render). */
  theaterMode = false,
  /** Trang chi tiết: ẩn meta @/caption trên video (chuyển sang panel phải). */
  hideAuthorMeta = false,
  /** Trang chi tiết: neo timed CC dưới–giữa video (`detailBottomCenter`). */
  detailCaptionsLayout = null,
  /** Báo parent biết khung đang ở chế độ ngang (16:9). */
  onStageWideChange,
  /** Menu chuột phải video (TikTok-style). */
  contextMenuToken,
  onVideoContextShare,
  onVideoContextCopyLink,
  /** Menu ⋯ — Không quan tâm (ẩn khỏi Đề xuất). */
  onNotInterested,
  /** Báo cáo video — cần token để gọi API. */
  reportToken,
  onReportRequireAuth,
  onReportSubmitted,
  selfReposted = false,
  selfRepostAvatarUrl,
  selfRepostDisplayName,
  selfRepostUsername,
  selfRepostProfilePath,
  onSelfUnrepost,
  selfRepostBusy = false,
  showAuthorFollow = false,
  authorFollowBusy = false,
  onAuthorFollow,
}) {
  const { t, i18n } = useTranslation();
  const { sidebarWidthPx } = useMainSidebarCollapse();
  /** Khung rộng từ trình duyệt (videoWidth/Height sau decode). */
  const [clientWideForLandscape, setClientWideForLandscape] = useState(false);
  /** Fallback: suy luận ngang từ thumbnail natural size. */
  const [thumbWideForLandscape, setThumbWideForLandscape] = useState(false);
  const photoAudioRef = useRef(null);
  const photoAudioBoostRef = useRef(null);
  const progressTrackRef = useRef(null);
  const progressInnerRef = useRef(null);
  const progressFillRef = useRef(null);
  const progressKnobRef = useRef(null);
  const progressScrubbingRef = useRef(false);
  const [progressScrubbing, setProgressScrubbing] = useState(false);
  const [progressPreview, setProgressPreview] = useState({
    visible: false,
    pct: 0,
    current: 0,
    duration: 0,
  });
  const [playbackClock, setPlaybackClock] = useState({
    current: 0,
    duration: 0,
  });
  const [videoContextMenu, setVideoContextMenu] = useState(null);
  const [videoDownloadBusy, setVideoDownloadBusy] = useState(false);
  const [subtitlesModalOpen, setSubtitlesModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [timedCaptionsAvailable, setTimedCaptionsAvailable] = useState(false);
  const [localControlPopoverOpen, setLocalControlPopoverOpen] = useState(false);
  const [controlDismissEpoch, setControlDismissEpoch] = useState(0);
  const { prefs: subtitlePrefs, targetLangIso } = useFeedSubtitlesPrefs();
  const captionsEnabled = Boolean(subtitlePrefs?.captionsEnabled);
  const subtitleLangIso =
    targetLangIso ||
    localeCodeToSubtitleIso(i18n.language) ||
    subtitleLangToIso(subtitlePrefs?.translateTo) ||
    "vi";
  const controlPopoverOpen =
    localControlPopoverOpen || feedMoreMenuOpen;
  /** Chi tiết / feed 1 video: luôn loop (auto-scroll không có video kế tiếp). */
  const loopActiveVideo = !feedAutoScrollEnabled || videos.length <= 1;

  /** publicId video đã báo cáo — ẩn media, hiện overlay kiểu TikTok. */
  const [reportHiddenIds, setReportHiddenIds] = useState(() => new Set());

  const closeVideoContextMenu = useCallback(() => {
    setVideoContextMenu(null);
  }, []);

  const markVideoReportedHidden = useCallback((rawId) => {
    const id = normalizeVideoPublicId(rawId);
    if (!id) return;
    setReportHiddenIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const clearVideoReportedHidden = useCallback((rawId) => {
    const id = normalizeVideoPublicId(rawId);
    if (!id) return;
    setReportHiddenIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleReportSubmitted = useCallback(
    (payload) => {
      markVideoReportedHidden(videos?.[activeIndex]?.publicId);
      onReportSubmitted?.(payload);
    },
    [activeIndex, markVideoReportedHidden, onReportSubmitted, videos],
  );

  const handleVideoContextMenu = useCallback((event, video) => {
    event.preventDefault();
    event.stopPropagation();
    setVideoContextMenu({
      x: event.clientX,
      y: event.clientY,
      video,
    });
  }, []);

  const handleContextMenuDownload = useCallback(async () => {
    const video = videoContextMenu?.video;
    const publicId = video?.publicId;
    if (!publicId || videoDownloadBusy) return;
    setVideoDownloadBusy(true);
    closeVideoContextMenu();
    try {
      const username = String(video?.authorUsername ?? "vibely")
        .trim()
        .replace(/^@+/, "");
      await downloadWatermarkedVideo(publicId, username, {
        token: contextMenuToken,
      });
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : t('feed.loadVideoFailed'),
      );
    } finally {
      setVideoDownloadBusy(false);
    }
  }, [
    closeVideoContextMenu,
    contextMenuToken,
    videoContextMenu?.video,
    videoDownloadBusy,
  ]);

  const setProgressPct = useCallback((pct) => {
    const p = Math.min(100, Math.max(0, pct));
    const scale = p / 100;
    if (progressFillRef.current) {
      progressFillRef.current.style.transform = `scaleX(${scale})`;
    }
    if (progressKnobRef.current) {
      progressKnobRef.current.style.left = `${p}%`;
    }
    progressTrackRef.current?.setAttribute(
      "aria-valuenow",
      String(Math.round(p)),
    );
  }, []);

  const updateProgressFromVideo = useCallback(
    (el) => {
      if (!el || el.tagName !== "VIDEO" || progressScrubbingRef.current) {
        return;
      }
      const dur = getVideoDurationSeconds(el);
      if (dur > 0) {
        setProgressPct((el.currentTime / dur) * 100);
        setPlaybackClock({
          current: el.currentTime,
          duration: dur,
        });
      }
    },
    [setProgressPct],
  );

  const seekFeedVideo = useCallback(
    (clientX, trackEl) => {
      const track =
        trackEl ?? progressInnerRef.current ?? progressTrackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const el = feedVideoRef.current;
      if (!el) return;
      const w = rect.width;
      if (!(w > 0)) return;

      let pct = (clientX - rect.left) / w;
      pct = Math.min(1, Math.max(0, pct));

      const duration = getVideoDurationSeconds(el);
      const current = duration > 0 ? pct * duration : 0;
      if (duration > 0) el.currentTime = current;

      setProgressPct(pct * 100);
      setPlaybackClock({ current, duration });
      setProgressPreview({
        visible: true,
        pct: pct * 100,
        current,
        duration,
      });
    },
    [feedVideoRef, setProgressPct],
  );

  const handleProgressScrubStart = useCallback(
    (clientX) => {
      progressScrubbingRef.current = true;
      setProgressScrubbing(true);
      seekFeedVideo(clientX, progressInnerRef.current);
    },
    [seekFeedVideo],
  );

  const handleProgressKeySeek = useCallback(
    (deltaSeconds) => {
      const el = feedVideoRef.current;
      const duration = getVideoDurationSeconds(el);
      if (!(duration > 0)) return;
      el.currentTime = Math.min(
        duration,
        Math.max(0, el.currentTime + deltaSeconds),
      );
      setProgressPct((el.currentTime / duration) * 100);
      setPlaybackClock({
        current: el.currentTime,
        duration,
      });
    },
    [feedVideoRef, setProgressPct],
  );

  const handleActivePlaybackTick = useCallback(
    (e) => {
      updateProgressFromVideo(e.currentTarget);
      onActiveFeedPlaybackTick?.(e);
    },
    [onActiveFeedPlaybackTick, updateProgressFromVideo],
  );

  const activeVideo = videos[activeIndex];
  const activePhotoUrls = photoUrlsOf(activeVideo);
  const activeIsPhotoPost = activePhotoUrls.length > 0;
  const activePhotoAudioUrl = String(activeVideo?.audioUrl ?? "").trim();
  const activePhotoReportedHidden = Boolean(
    normalizeVideoPublicId(activeVideo?.publicId) &&
      reportHiddenIds.has(normalizeVideoPublicId(activeVideo?.publicId) || ""),
  );

  useEffect(() => {
    if (!photoAudioBoostRef.current) {
      photoAudioBoostRef.current = createPhotoAudioBoostController();
    }
    const boost = photoAudioBoostRef.current;
    const htmlEl = photoAudioRef.current;

    if (!activeIsPhotoPost || !activePhotoAudioUrl || activePhotoReportedHidden) {
      boost.sync({
        url: "",
        htmlEl,
        muted: true,
        paused: true,
        volume: 0,
      });
      return undefined;
    }

    boost.sync({
      url: activePhotoAudioUrl,
      htmlEl,
      muted: Boolean(playbackMuted),
      paused: Boolean(userPaused),
      volume: Number(feedVolume) || 0,
    });
    return undefined;
  }, [
    activeIsPhotoPost,
    activePhotoAudioUrl,
    activePhotoReportedHidden,
    activeVideo?.publicId,
    playbackMuted,
    feedVolume,
    userPaused,
    activeIndex,
  ]);

  useEffect(() => {
    return () => {
      photoAudioBoostRef.current?.dispose();
      photoAudioBoostRef.current = null;
    };
  }, []);

  useEffect(() => {
    const el = feedVideoRef.current;
    if (!el || !activeVideo?.videoUrl) return;
    setProgressPct(0);
    try {
      el.currentTime = 0;
    } catch {
      /* chưa sẵn sàng metadata */
    }
  }, [
    activeIndex,
    activeVideo?.publicId,
    activeVideo?.videoUrl,
    feedVideoRef,
    setProgressPct,
  ]);

  useEffect(() => {
    const onMove = (e) => {
      if (!progressScrubbingRef.current) return;
      const track = progressInnerRef.current ?? progressTrackRef.current;
      if (!track) return;
      if (e.cancelable && e.type === "touchmove") e.preventDefault();
      const cx = e.type === "touchmove" ? e.touches[0]?.clientX : e.clientX;
      if (cx == null) return;
      seekFeedVideo(cx, track);
    };
    const onEnd = () => {
      if (!progressScrubbingRef.current) return;
      progressScrubbingRef.current = false;
      setProgressScrubbing(false);
      setProgressPreview((prev) => ({ ...prev, visible: false }));
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [seekFeedVideo]);

  const activeVideoPublicId = activeVideo?.publicId;
  const sourceW = activeVideo?.sourceWidthPx;
  const sourceH = activeVideo?.sourceHeightPx;
  const apiWideForLandscape =
    sourceW != null &&
    sourceH != null &&
    Number(sourceW) > 0 &&
    Number(sourceH) > 0 &&
    Number(sourceW) >= Number(sourceH);

  /** Tránh callback từ slide cũ (RAF/HLS) ghi đè slide đang active. */
  const activeSlideVideoIdRef = useRef(activeVideoPublicId);
  activeSlideVideoIdRef.current = activeVideoPublicId;

  useEffect(() => {
    setTimedCaptionsAvailable(false);
  }, [activeVideoPublicId]);

  const onActiveIntrinsicLandscape = useCallback((isLandscape, fromVideoId) => {
    if (fromVideoId == null || fromVideoId !== activeSlideVideoIdRef.current) {
      return;
    }
    setClientWideForLandscape(isLandscape);
  }, []);

  /** useLayoutEffect: reset trước paint để không thua race với useEffect của player con. */
  useLayoutEffect(() => {
    setClientWideForLandscape(false);
    setThumbWideForLandscape(false);
    setPlaybackClock({ current: 0, duration: 0 });
    setFeedMoreMenuOpen(false);
    setLocalControlPopoverOpen(false);
    setControlDismissEpoch((n) => n + 1);
  }, [activeIndex, activeVideoPublicId, setFeedMoreMenuOpen]);

  useEffect(() => {
    const thumb = String(activeVideo?.thumbnailUrl ?? "").trim();
    if (!thumb) {
      setThumbWideForLandscape(false);
      return undefined;
    }
    let cancelled = false;
    const img = new Image();
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.onload = () => {
      if (cancelled) return;
      const w = Number(img.naturalWidth || 0);
      const h = Number(img.naturalHeight || 0);
      setThumbWideForLandscape(w > 0 && h > 0 && w >= h);
    };
    img.onerror = () => {
      if (cancelled) return;
      setThumbWideForLandscape(false);
    };
    img.src = thumb;
    return () => {
      cancelled = true;
    };
  }, [activeVideo?.thumbnailUrl, activeVideoPublicId]);

  const stageWideForLandscape =
    apiWideForLandscape || clientWideForLandscape || thumbWideForLandscape;

  /** Giữ khung ngang khi mở bình luận — gắn với video hiện tại. */
  const landscapeLatchRef = useRef(false);
  const landscapeLatchVideoIdRef = useRef(null);
  if (stageWideForLandscape) {
    landscapeLatchRef.current = true;
    landscapeLatchVideoIdRef.current = activeVideoPublicId;
  }
  useLayoutEffect(() => {
    if (commentsDockOpen) {
      if (stageWideForLandscape) {
        landscapeLatchRef.current = true;
        landscapeLatchVideoIdRef.current = activeVideoPublicId;
      }
      return;
    }
    landscapeLatchRef.current = stageWideForLandscape;
    landscapeLatchVideoIdRef.current = stageWideForLandscape
      ? activeVideoPublicId
      : null;
  }, [commentsDockOpen, activeVideoPublicId, stageWideForLandscape]);

  const landscapeLatchedForActive =
    landscapeLatchRef.current &&
    landscapeLatchVideoIdRef.current === activeVideoPublicId;

  const effectiveStageWide =
    stageWideForLandscape ||
    (commentsDockOpen &&
      (landscapeLatchedForActive ||
        apiWideForLandscape ||
        thumbWideForLandscape));

  useEffect(() => {
    onStageWideChange?.(effectiveStageWide);
  }, [effectiveStageWide, onStageWideChange]);

  const stageOuterRef = useRef(null);
  const [mobileMeasuredSlotPx, setMobileMeasuredSlotPx] =
    useState(feedSlotHeightPx);
  useLayoutEffect(() => {
    if (!mobileFullBleed) return undefined;
    const el = stageOuterRef.current;
    if (!el) return undefined;
    const sync = () => {
      const next = el.clientHeight;
      if (next > 0) setMobileMeasuredSlotPx(next);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    window.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("resize", sync);
    };
  }, [mobileFullBleed, feedSlotHeightPx, videos.length]);
  const [viewportWidthTick, setViewportWidthTick] = useState(0);
  useEffect(() => {
    const onResize = () => setViewportWidthTick((t) => t + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  void viewportWidthTick;

  /**
   * Mobile full-bleed: luôn full viewport.
   * Desktop: một khung cho cả video dọc và ngang (cao gần hết màn, rộng hết chỗ trống).
   */
  const unifiedStageSizePx = mobileFullBleed
    ? null
    : computeFeedUnifiedStageSizePx({
        slotHeightPx: feedSlotHeightPx,
        viewportWidth:
          typeof window !== "undefined" ? window.innerWidth : undefined,
        commentsOpen: commentsDockOpen,
        sidebarWidthPx,
      });

  const stageOuterHeightPx = mobileFullBleed
    ? mobileMeasuredSlotPx
    : unifiedStageSizePx.height;

  const virtualSlotHeightPx = mobileFullBleed
    ? mobileMeasuredSlotPx
    : stageOuterHeightPx;

  const stageWidthClass = mobileFullBleed
    ? "relative h-full w-full shrink-0"
    : "relative shrink-0";

  const stageOuterSurfaceClass = mobileFullBleed
    ? "relative h-full w-full overflow-hidden bg-black vibely-keep-dark"
    : `${stageWidthClass} relative overflow-hidden rounded-2xl bg-black vibely-keep-dark`;

  /** Giữ activeIndex ổn định khi chiều cao khung đổi (phát hiện 16:9). */
  const [stageHeightSettle, setStageHeightSettle] = useState(false);
  const prevVirtualSlotHeightRef = useRef(virtualSlotHeightPx);
  useLayoutEffect(() => {
    if (prevVirtualSlotHeightRef.current === virtualSlotHeightPx)
      return undefined;
    prevVirtualSlotHeightRef.current = virtualSlotHeightPx;
    setStageHeightSettle(true);
    const t = window.setTimeout(() => setStageHeightSettle(false), 520);
    return () => window.clearTimeout(t);
  }, [virtualSlotHeightPx]);

  /** Giữ activeIndex ổn định ngay sau khi đóng panel bình luận. */
  const [dockScrollSettle, setDockScrollSettle] = useState(false);
  useLayoutEffect(() => {
    if (commentsDockOpen) {
      setDockScrollSettle(true);
      return undefined;
    }
    setDockScrollSettle(true);
    const t = window.setTimeout(() => setDockScrollSettle(false), 520);
    return () => window.clearTimeout(t);
  }, [commentsDockOpen]);

  /** Khóa scroll + đồng bộ vị trí khi mở/đóng bình luận hoặc đổi kích thước khung. */
  useLayoutEffect(() => {
    if (virtualFeedRef.current?.isSmoothScrolling?.()) return undefined;
    const top = Math.max(0, activeIndex) * virtualSlotHeightPx;
    const sync = () => {
      if (virtualFeedRef.current?.isSmoothScrolling?.()) return;
      const root = virtualFeedRef.current?.getScrollElement?.();
      if (root && !commentsDockOpen) root.scrollTop = top;
      virtualFeedRef.current?.scrollToIndex(activeIndex, { align: "start" });
    };
    sync();
    queueMicrotask(sync);
    const raf = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(raf);
  }, [
    commentsDockOpen,
    activeIndex,
    virtualSlotHeightPx,
    unifiedStageSizePx?.width,
  ]);

  useFeedPrefetch(videos, activeIndex);

  const feedBlurVideoRef = useRef(null);
  useEffect(() => {
    if (mobileFullBleed) return undefined;
    const main = feedVideoRef?.current;
    const bg = feedBlurVideoRef.current;
    if (!main || !bg) return undefined;
    const attach = () => {
      const capture = main.captureStream || main.mozCaptureStream;
      if (typeof capture !== "function") return;
      try {
        const stream = capture.call(main);
        if (bg.srcObject !== stream) bg.srcObject = stream;
        const play = bg.play?.();
        if (play?.catch) play.catch(() => {});
      } catch {
        /* Poster blur stays until the browser can mirror the playing frame. */
      }
    };
    main.addEventListener("playing", attach);
    main.addEventListener("loadeddata", attach);
    if (!main.paused) attach();
    return () => {
      main.removeEventListener("playing", attach);
      main.removeEventListener("loadeddata", attach);
      bg.srcObject = null;
    };
  }, [mobileFullBleed, activeIndex, feedVideoRef]);

  return (
    <div
      ref={stageOuterRef}
      className={
        mobileFullBleed
          ? "relative h-full w-full overflow-hidden bg-black"
          : stageOuterSurfaceClass
      }
      style={
        mobileFullBleed
          ? undefined
          : {
              width: unifiedStageSizePx?.width,
              height: stageOuterHeightPx,
            }
      }
    >
      <audio
        ref={photoAudioRef}
        playsInline
        preload="auto"
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        aria-hidden
      />
      <VirtualizedFeed
        ref={virtualFeedRef}
        videos={videos}
        itemHeightPx={virtualSlotHeightPx}
        fillContainer={mobileFullBleed}
        scrollLocked={commentsDockOpen}
        freezeActiveIndex={
          commentsDockOpen || dockScrollSettle || stageHeightSettle
        }
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
        onNearEnd={loadMoreFeed}
        scrollClassName={
          mobileFullBleed || theaterMode
            ? "scrollbar-none"
            : "scrollbar-none rounded-xl sm:rounded-2xl"
        }
      >
        {({ video, loadMedia, isActive, visibilityRatio }) => {
          const poster =
            video.thumbnailUrl?.trim() ||
            thumbnailFallbackUrl ||
            feedDefaultAuthorAvatar;
          const rawVibelyUser = String(video.authorUsername ?? "vibely")
            .trim()
            .replace(/^@/, "");
          const authorProfilePath = feedAuthorProfilePath(video);
          const captionText = resolveDisplayCaption(video);
          const playbackUrl = resolveFeedPlaybackUrl(video);
          const photoUrls = photoUrlsOf(video);
          const isPhotoPost = photoUrls.length > 0;
          const hasPlayback = isPhotoPost || Boolean(playbackUrl);
          const cellPublicId = normalizeVideoPublicId(video.publicId);
          const reportedHidden =
            Boolean(cellPublicId) && reportHiddenIds.has(cellPublicId);
          return (
            <div
              className={`relative h-full w-full overflow-hidden ${
                isActive ? "group" : ""
              }`}
              onContextMenu={(event) => handleVideoContextMenu(event, video)}
            >
              {hasPlayback ? (
                <div
                  className="absolute inset-x-0 top-0 isolate overflow-hidden"
                  onClick={(event) => {
                    if (event.target !== event.currentTarget) return;
                    toggleFeedPlayback(event);
                  }}
                  style={{
                    bottom:
                      theaterMode || isPhotoPost ? 0 : FEED_PROGRESS_TRACK_BOTTOM_PX,
                  }}
                >
                  {isPhotoPost ? (
                    <FeedPhotoCarousel
                      urls={photoUrls}
                      className="h-full w-full"
                      active={isActive && !reportedHidden}
                      onClick={toggleFeedPlayback}
                    />
                  ) : (
                  <>
                  {!mobileFullBleed && poster ? (
                    <div
                      className="pointer-events-none absolute inset-0 z-0 scale-110 bg-cover bg-center blur-3xl brightness-75"
                      style={{ backgroundImage: `url(${poster})` }}
                      aria-hidden
                    />
                  ) : null}
                  {!mobileFullBleed && isActive ? (
                    <video
                      ref={feedBlurVideoRef}
                      muted
                      playsInline
                      tabIndex={-1}
                      aria-hidden
                      className="pointer-events-none absolute inset-0 z-0 h-full w-full scale-110 object-cover blur-3xl brightness-75"
                    />
                  ) : null}
                  <FeedSlideVideoPlayer
                    ref={isActive ? feedVideoRef : undefined}
                    video={video}
                    playbackUrl={playbackUrl}
                    poster={poster}
                    isActive={isActive}
                    reportedHidden={reportedHidden}
                    userPaused={userPaused}
                    playbackMuted={playbackMuted}
                    loop={loopActiveVideo}
                    loadMedia={loadMedia}
                    hasPlayback={hasPlayback}
                    mobileFullBleed={mobileFullBleed}
                    commentsDockOpen={commentsDockOpen}
                    visibilityRatio={visibilityRatio}
                    feedVideoQuality={feedVideoQuality}
                    effectiveStageWide={effectiveStageWide}
                    onPlaybackTick={handleActivePlaybackTick}
                    onPlaybackEnded={onActiveFeedPlaybackEnded}
                    onTogglePlayback={toggleFeedPlayback}
                    onIntrinsicLandscape={onActiveIntrinsicLandscape}
                    stopPropagationOnClick
                  />
                  </>
                  )}
                  {video?.aiEnhanced ? (
                    <div className="pointer-events-none absolute top-3 left-3 z-20 rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium tracking-wide text-white/95 backdrop-blur-[2px]">
                      {String(video.aiEnhancedLabel ?? "AI Enhanced").trim() ||
                        "AI Enhanced"}
                    </div>
                  ) : null}
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 z-9 h-[42%] max-h-56 bg-linear-to-b from-black/60 via-black/25 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    aria-hidden
                  />

                  {controlPopoverOpen ? (
                    <button
                      type="button"
                      aria-label={t("feed.closeMenu")}
                      className="absolute inset-0 z-35 cursor-default bg-transparent"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setFeedMoreMenuOpen(false);
                        setControlDismissEpoch((n) => n + 1);
                      }}
                    />
                  ) : null}
                </div>
              ) : (
                <FeedSlideVideoPlayer
                  ref={isActive ? feedVideoRef : undefined}
                  video={video}
                  playbackUrl={playbackUrl}
                  poster={poster}
                  isActive={isActive}
                  reportedHidden={false}
                  userPaused={userPaused}
                  playbackMuted={playbackMuted}
                  loop={loopActiveVideo}
                  loadMedia={loadMedia}
                  hasPlayback={hasPlayback}
                  mobileFullBleed={mobileFullBleed}
                  commentsDockOpen={commentsDockOpen}
                  visibilityRatio={visibilityRatio}
                  feedVideoQuality={feedVideoQuality}
                  effectiveStageWide={effectiveStageWide}
                  onPlaybackTick={handleActivePlaybackTick}
                  onPlaybackEnded={onActiveFeedPlaybackEnded}
                  onTogglePlayback={toggleFeedPlayback}
                  onIntrinsicLandscape={onActiveIntrinsicLandscape}
                />
              )}

              {isActive && hasPlayback && !theaterMode && !hideAuthorMeta ? (
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-50 max-h-[42%] overflow-hidden **:pointer-events-auto"
                  style={{ paddingBottom: FEED_CAPTION_PROGRESS_PAD_PX }}
                >
                  <FeedSlideAuthorMeta
                    rawVibelyUser={rawVibelyUser}
                    authorProfilePath={authorProfilePath}
                    authorAvatarUrl={video?.avatarUrl}
                    defaultAuthorAvatar={feedDefaultAuthorAvatar}
                    captionText={captionText}
                    videoPublicId={video?.publicId}
                    descriptionLang={video?.descriptionLang}
                    authToken={reportToken || contextMenuToken}
                    captionActive={isActive}
                    compact={effectiveStageWide}
                    showFollow={showAuthorFollow}
                    followBusy={authorFollowBusy}
                    onFollow={onAuthorFollow}
                    repostedByDisplayName={video?.repostedByDisplayName}
                    repostedByUsername={video?.repostedByUsername}
                    selfReposted={selfReposted}
                    selfRepostAvatarUrl={selfRepostAvatarUrl}
                    selfRepostDisplayName={selfRepostDisplayName}
                    selfRepostUsername={selfRepostUsername}
                    selfRepostProfilePath={selfRepostProfilePath}
                    onSelfUnrepost={onSelfUnrepost}
                    selfRepostBusy={selfRepostBusy}
                    locationName={video?.locationName}
                    timedCaptions={
                      detailCaptionsLayout ? null : (
                        <FeedTimedCaptions
                          videoPublicId={normalizeVideoPublicId(video?.publicId)}
                          lang={subtitleLangIso}
                          enabled={captionsEnabled}
                          videoRef={feedVideoRef}
                          token={reportToken || contextMenuToken}
                          layout="stack"
                          onAvailabilityChange={setTimedCaptionsAvailable}
                        />
                      )
                    }
                  />
                </div>
              ) : null}

              {isActive && hasPlayback && detailCaptionsLayout ? (
                <FeedTimedCaptions
                  videoPublicId={normalizeVideoPublicId(video?.publicId)}
                  lang={subtitleLangIso}
                  enabled={captionsEnabled}
                  videoRef={feedVideoRef}
                  token={reportToken || contextMenuToken}
                  layout={detailCaptionsLayout}
                  onAvailabilityChange={setTimedCaptionsAvailable}
                />
              ) : null}

              {!hasPlayback && !theaterMode && !hideAuthorMeta ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 pb-5">
                  <p className="truncate text-sm font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
                    @{rawVibelyUser}
                  </p>
                  <div className="mt-1 text-xs text-zinc-300">
                    <FeedVideoCaption caption={captionText} />
                  </div>
                </div>
              ) : null}

              {reportedHidden ? (
                <FeedReportedVideoOverlay
                  className="z-60"
                  onShowVideo={() => clearVideoReportedHidden(video.publicId)}
                />
              ) : null}
            </div>
          );
        }}
      </VirtualizedFeed>

      {!activeIsPhotoPost &&
      resolveFeedPlaybackUrl(activeVideo) &&
      !reportHiddenIds.has(
        normalizeVideoPublicId(activeVideo?.publicId) || "",
      ) ? (
        <>
          <FeedProgressBar
            theaterMode={theaterMode}
            controlPopoverOpen={controlPopoverOpen}
            progressScrubbing={progressScrubbing}
            progressPreview={progressPreview}
            trackRef={progressTrackRef}
            innerRef={progressInnerRef}
            fillRef={progressFillRef}
            knobRef={progressKnobRef}
            onScrubStart={handleProgressScrubStart}
            onKeySeek={handleProgressKeySeek}
          />
          {theaterMode ? null : (
            <FeedControlBar
              controlPopoverOpen={controlPopoverOpen}
              userPaused={userPaused}
              playbackClock={playbackClock}
              toggleFeedPlayback={toggleFeedPlayback}
              feedAutoScrollEnabled={feedAutoScrollEnabled}
              setFeedAutoScrollEnabled={setFeedAutoScrollEnabled}
              feedPlaybackSpeed={feedPlaybackSpeed}
              setFeedPlaybackSpeed={setFeedPlaybackSpeed}
              captionsEnabled={captionsEnabled}
              timedCaptionsAvailable={timedCaptionsAvailable}
              feedSoundOn={feedSoundOn}
              setFeedSoundOn={setFeedSoundOn}
              feedVolume={feedVolume}
              setFeedVolume={setFeedVolume}
              feedMoreMenuOpen={feedMoreMenuOpen}
              setFeedMoreMenuOpen={setFeedMoreMenuOpen}
              toggleFeedPictureInPicture={toggleFeedPictureInPicture}
              onOpenSubtitles={() => setSubtitlesModalOpen(true)}
              onNotInterested={onNotInterested}
              onOpenReport={() => setReportModalOpen(true)}
              onLocalPopoverChange={setLocalControlPopoverOpen}
              dismissEpoch={controlDismissEpoch}
            />
          )}
        </>
      ) : null}
      <VideoContextMenu
        open={Boolean(videoContextMenu)}
        x={videoContextMenu?.x ?? 0}
        y={videoContextMenu?.y ?? 0}
        downloading={videoDownloadBusy}
        playbackSpeed={feedPlaybackSpeed}
        onPlaybackSpeedChange={setFeedPlaybackSpeed}
        autoScrollEnabled={feedAutoScrollEnabled}
        onAutoScrollChange={setFeedAutoScrollEnabled}
        onTogglePip={() => void toggleFeedPictureInPicture?.()}
        onOpenSubtitles={() => setSubtitlesModalOpen(true)}
        onClose={closeVideoContextMenu}
        onDownload={handleContextMenuDownload}
        onShare={() => {
          if (videoContextMenu?.video) {
            onVideoContextShare?.(videoContextMenu.video);
          }
        }}
        onCopyLink={() => {
          if (videoContextMenu?.video) {
            return onVideoContextCopyLink?.(videoContextMenu.video);
          }
          return undefined;
        }}
      />
      <FeedSubtitlesModal
        open={subtitlesModalOpen}
        onClose={() => setSubtitlesModalOpen(false)}
      />
      <FeedReportModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        videoPublicId={videos?.[activeIndex]?.publicId}
        token={reportToken}
        onRequireAuth={onReportRequireAuth}
        onSubmitted={handleReportSubmitted}
      />
    </div>
  );
}
