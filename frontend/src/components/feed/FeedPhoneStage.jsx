import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { VirtualizedFeed } from "./VirtualizedFeed";
import { FeedVideoPlayer } from "./FeedVideoPlayer";
import {
  IoCheckmark,
  IoChevronBack,
  IoChevronForward,
  IoEllipsisHorizontal,
  IoPause,
  IoPlay,
  IoVolumeHighOutline,
  IoVolumeLowOutline,
  IoVolumeMediumOutline,
  IoVolumeMuteOutline,
} from "react-icons/io5";
import {
  LuArrowDownFromLine,
  LuFlag,
  LuHeartOff,
  LuPictureInPicture2,
} from "react-icons/lu";
import { resolveFeedPlaybackUrl } from "../../feed/feedPlayback.js";
import { useFeedPrefetch } from "../../feed/useFeedPrefetch.js";

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
          className="cursor-pointer font-semibold text-sky-300 hover:text-sky-200 hover:underline"
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
          className="cursor-pointer font-semibold text-sky-300 hover:text-sky-200 hover:underline"
        >
          {part}
        </Link>
      );
    }
    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
}

const CAPTION_TEXT_CLASS =
  "min-w-0 text-sm leading-snug text-white/90 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]";

/** Mô tả dài: 1 dòng + …; «Thêm» mở rộng; «Ẩn bớt» thu lại. */
function FeedVideoCaption({ caption }) {
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
    if (!el || !text) {
      overflowsRef.current = false;
      setOverflowsOneLine(false);
      return;
    }
    if (expanded) {
      setOverflowsOneLine(overflowsRef.current);
      return;
    }
    const overflow = el.scrollHeight > el.clientHeight + 1;
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

  if (!text) {
    return (
      <p className={`${CAPTION_TEXT_CLASS} line-clamp-1`}>
        {renderInteractiveCaption("\u00A0")}
      </p>
    );
  }

  const collapsed = overflowsOneLine && !expanded;

  return (
    <div className="relative min-w-0 w-full">
      <p
        ref={visibleRef}
        className={`${CAPTION_TEXT_CLASS} break-words ${
          !expanded ? "line-clamp-1" : ""
        } ${collapsed ? "pr-[3.5rem]" : ""}`}
      >
        {renderInteractiveCaption(text)}
      </p>
      {collapsed ? (
        <button
          type="button"
          className="absolute bottom-0 right-0 z-10 cursor-pointer bg-transparent p-0 text-sm font-semibold leading-snug text-white/95 hover:text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
        >
          … Thêm
        </button>
      ) : null}
      {overflowsOneLine && expanded ? (
        <button
          type="button"
          className="mt-0.5 cursor-pointer bg-transparent p-0 text-sm font-semibold leading-snug text-white/95 hover:text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(false);
          }}
        >
          Ẩn bớt
        </button>
      ) : null}
    </div>
  );
}

function feedQualityLabel(mode) {
  if (mode === "720") return "720P";
  if (mode === "540") return "540P";
  return "Tự động";
}

/** Vibely ID + caption dưới video (stacked) hoặc overlay đáy (mặc định). */
function FeedSlideAuthorMeta({
  rawVibelyUser,
  authorProfilePath,
  captionText,
  stacked = false,
}) {
  const nameClass =
    "inline-block max-w-full truncate text-[15px] font-bold leading-snug text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.95),0_0_1px_rgba(0,0,0,0.85)]";
  const nameEl = authorProfilePath ? (
    <Link
      to={authorProfilePath}
      onClick={(e) => e.stopPropagation()}
      className={`${nameClass} hover:underline`}
    >
      {rawVibelyUser}
    </Link>
  ) : (
    <p className={nameClass}>{rawVibelyUser}</p>
  );

  if (stacked) {
    return (
      <div className="pointer-events-auto shrink-0 border-t border-white/10 bg-black px-3 py-2.5 sm:px-4">
        <div className="inline-flex max-w-full">{nameEl}</div>
        <div className="mt-0.5">
          <FeedVideoCaption caption={captionText} />
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto bg-linear-to-t from-black/85 via-black/25 to-transparent px-3 pb-8 pt-7 sm:px-4 sm:pb-9 sm:pt-9">
      <div className="inline-flex max-w-full">{nameEl}</div>
      <div className="mt-1">
        <FeedVideoCaption caption={captionText} />
      </div>
    </div>
  );
}

/** Cột feed hẹp — video dọc (mặc định, gần TikTok web). */
export const FEED_STAGE_OUTER_WIDTH_CLASS_PORTRAIT =
  "w-[min(300px,88vw)] shrink-0 md:w-[min(380px,90vw)] lg:w-[min(440px,min(86vw,560px))]";

/** Cột feed rộng — video ~16:9+ (desktop rộng hơn TikTok-web). */
export const FEED_STAGE_OUTER_WIDTH_CLASS_WIDE =
  "w-[min(390px,92vw)] shrink-0 md:w-[min(560px,94vw)] lg:w-[min(760px,min(94vw,1040px))] xl:w-[min(880px,min(95vw,1180px))]";

/** Video ngang khi panel bình luận mở — thu hẹp để không đè cột action + sidebar. */
export const FEED_STAGE_OUTER_WIDTH_CLASS_WIDE_DOCKED =
  "w-[min(280px,68vw)] shrink-0 md:w-[min(340px,42vw)] lg:w-[min(400px,min(38vw,480px))] xl:w-[min(440px,min(36vw,520px))]";

/** Skeleton / chỗ chưa biết tỉ lệ: dùng khung dọc. */
export const FEED_STAGE_OUTER_WIDTH_CLASS =
  FEED_STAGE_OUTER_WIDTH_CLASS_PORTRAIT;

const FEED_VOLUME_DEFAULT = 1;

function FeedVolumeIcon({ soundOn, volume }) {
  if (!soundOn || volume === 0) {
    return <IoVolumeMuteOutline aria-hidden />;
  }
  if (volume < 0.34) {
    return <IoVolumeLowOutline aria-hidden />;
  }
  if (volume < 0.67) {
    return <IoVolumeMediumOutline aria-hidden />;
  }
  return <IoVolumeHighOutline aria-hidden />;
}

/** Điều khiển âm lượng góc trên trái (icon + slider ngang), hiện khi hover slide. */
function FeedVolumeControl({
  volume,
  onVolumeChange,
  soundOn,
  onSoundOnChange,
}) {
  const toggleSound = (e) => {
    e.stopPropagation();
    if (soundOn && volume > 0) {
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

  return (
    <div
      className="feed-volume-control pointer-events-none flex max-w-[2.75rem] items-center gap-0 overflow-hidden rounded-full bg-black/45 py-2 pl-2.5 pr-2.5 text-xl text-white opacity-0 backdrop-blur-sm transition-[max-width,opacity,gap,padding] duration-200 group-hover:pointer-events-auto group-hover:max-w-[9.5rem] group-hover:gap-2 group-hover:pr-3 group-hover:opacity-100 group-has-[.feed-video-more-panel:hover]:pointer-events-none group-has-[.feed-video-more-panel:hover]:max-w-[2.75rem] group-has-[.feed-video-more-panel:hover]:opacity-0 focus-within:pointer-events-auto focus-within:max-w-[9.5rem] focus-within:gap-2 focus-within:pr-3 focus-within:opacity-100"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label={soundOn && volume > 0 ? "Tắt âm thanh" : "Bật âm thanh"}
        className="shrink-0 cursor-pointer rounded-full p-0.5 hover:bg-white/10"
        onClick={toggleSound}
      >
        <FeedVolumeIcon soundOn={soundOn} volume={volume} />
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        aria-label="Âm lượng"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(volume * 100)}
        className="feed-volume-slider pointer-events-none w-0 shrink opacity-0 transition-[width,opacity] duration-200 group-hover:pointer-events-auto group-hover:w-[5.5rem] group-hover:opacity-100 focus-within:pointer-events-auto focus-within:w-[5.5rem] focus-within:opacity-100"
        onChange={onSlider}
        onInput={onSlider}
        onClick={(e) => e.stopPropagation()}
      />
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
  feedMoreMenuSubpage,
  setFeedMoreMenuSubpage,
  feedVideoQuality,
  setFeedVideoQuality,
  feedAutoScrollEnabled,
  setFeedAutoScrollEnabled,
  toggleFeedPlayback,
  toggleFeedPictureInPicture,
  resolveFeedAuthorDisplayName,
  feedDefaultAuthorAvatar,
  thumbnailFallbackUrl,
  playbackFlash,
  onActiveFeedPlaybackTick,
  /** Panel bình luận bên phải đang mở — video ngang thu nhỏ khung. */
  commentsDockOpen = false,
}) {
  /** Khung rộng từ trình duyệt (videoWidth/Height sau decode). */
  const [clientWideForLandscape, setClientWideForLandscape] = useState(false);
  const progressTrackRef = useRef(null);
  const progressFillRef = useRef(null);
  const progressKnobRef = useRef(null);
  const progressScrubbingRef = useRef(false);
  const [progressScrubbing, setProgressScrubbing] = useState(false);

  const setProgressPct = useCallback((pct) => {
    const p = Math.min(100, Math.max(0, pct));
    if (progressFillRef.current) {
      progressFillRef.current.style.width = `${p}%`;
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
      let dur = el.duration;
      if (!Number.isFinite(dur) || dur <= 0) {
        try {
          if (el.seekable?.length) {
            dur = el.seekable.end(el.seekable.length - 1);
          }
        } catch {
          /* noop */
        }
      }
      if (Number.isFinite(dur) && dur > 0) {
        setProgressPct((el.currentTime / dur) * 100);
      }
    },
    [setProgressPct],
  );

  const seekFeedVideo = useCallback(
    (clientX, trackEl) => {
      if (!trackEl) return;
      const rect = trackEl.getBoundingClientRect();
      const el = feedVideoRef.current;
      if (!el) return;
      const w = rect.width;
      if (!(w > 0)) return;

      let pct = (clientX - rect.left) / w;
      pct = Math.min(1, Math.max(0, pct));

      if (Number.isFinite(el.duration) && el.duration > 0) {
        el.currentTime = pct * el.duration;
      } else if (el.seekable?.length) {
        try {
          const end = el.seekable.end(el.seekable.length - 1);
          if (Number.isFinite(end) && end > 0) el.currentTime = pct * end;
        } catch {
          /* noop */
        }
      }

      setProgressPct(pct * 100);
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
      const track = progressTrackRef.current;
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

  const onActiveIntrinsicLandscape = useCallback((isLandscape, fromVideoId) => {
    if (fromVideoId == null || fromVideoId !== activeSlideVideoIdRef.current) {
      return;
    }
    setClientWideForLandscape(isLandscape);
  }, []);

  /** useLayoutEffect: reset trước paint để không thua race với useEffect của player con. */
  useLayoutEffect(() => {
    setClientWideForLandscape(false);
  }, [activeIndex, activeVideoPublicId]);

  const stageWideForLandscape = apiWideForLandscape || clientWideForLandscape;

  const stageWidthClass = stageWideForLandscape
    ? commentsDockOpen
      ? FEED_STAGE_OUTER_WIDTH_CLASS_WIDE_DOCKED
      : FEED_STAGE_OUTER_WIDTH_CLASS_WIDE
    : FEED_STAGE_OUTER_WIDTH_CLASS_PORTRAIT;

  const stackedLandscapeMeta = stageWideForLandscape && commentsDockOpen;

  useFeedPrefetch(videos, activeIndex);

  return (
    <div
      className={`relative ${stageWidthClass} overflow-visible rounded-xl border border-white/10 bg-black shadow-[0_0_48px_rgba(0,0,0,0.72)] transition-[width,height] duration-200 ease-out sm:rounded-2xl`}
      style={{ height: feedSlotHeightPx }}
    >
      <VirtualizedFeed
        ref={virtualFeedRef}
        videos={videos}
        itemHeightPx={feedSlotHeightPx}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
        onNearEnd={loadMoreFeed}
        scrollClassName="rounded-xl sm:rounded-2xl"
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
          const captionText =
            String(video.description ?? "").trim() ||
            String(video.title ?? "").trim() ||
            "";
          const playbackUrl = resolveFeedPlaybackUrl(video);
          const hasPlayback = Boolean(playbackUrl);
          const useStackedMeta =
            stackedLandscapeMeta && isActive && hasPlayback;
          return (
            <div
              className={`relative h-full w-full ${
                useStackedMeta
                  ? "flex flex-col overflow-hidden rounded-xl sm:rounded-2xl"
                  : "overflow-visible"
              } ${isActive ? "group" : ""}`}
            >
              {hasPlayback ? (
                <div
                  className={
                    useStackedMeta
                      ? "relative min-h-0 flex-1 overflow-hidden rounded-xl sm:rounded-2xl"
                      : "absolute inset-x-0 top-0 bottom-0 overflow-hidden rounded-xl sm:rounded-2xl"
                  }
                >
                  <FeedVideoPlayer
                    key={String(video.publicId)}
                    ref={isActive ? feedVideoRef : undefined}
                    videoUrl={playbackUrl}
                    poster={poster}
                    muted={!isActive || playbackMuted}
                    loop
                    loadMedia={loadMedia && hasPlayback}
                    isActive={isActive}
                    visibilityRatio={visibilityRatio}
                    feedVideoId={video.publicId}
                    streamQuality={feedVideoQuality}
                    onPlaybackTick={
                      isActive ? handleActivePlaybackTick : undefined
                    }
                    className="relative z-0 h-full w-full cursor-pointer"
                    containLandscape
                    onClick={toggleFeedPlayback}
                    onIntrinsicLandscape={
                      isActive
                        ? (wide) =>
                            onActiveIntrinsicLandscape(wide, video.publicId)
                        : undefined
                    }
                  />
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 z-[9] h-[42%] max-h-56 bg-linear-to-b from-black/60 via-black/25 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    aria-hidden
                  />
                </div>
              ) : (
                <FeedVideoPlayer
                  key={String(video.publicId)}
                  ref={isActive ? feedVideoRef : undefined}
                  videoUrl={playbackUrl}
                  poster={poster}
                  muted={!isActive || playbackMuted}
                  loop
                  loadMedia={loadMedia && hasPlayback}
                  isActive={isActive}
                  visibilityRatio={visibilityRatio}
                  feedVideoId={video.publicId}
                  streamQuality={feedVideoQuality}
                  onPlaybackTick={
                    isActive ? handleActivePlaybackTick : undefined
                  }
                  className="relative z-0 h-full w-full cursor-pointer"
                  containLandscape
                  onClick={toggleFeedPlayback}
                  onIntrinsicLandscape={
                    isActive
                      ? (wide) =>
                          onActiveIntrinsicLandscape(wide, video.publicId)
                      : undefined
                  }
                />
              )}

              {isActive && hasPlayback && playbackFlash && !feedMoreMenuOpen ? (
                <div
                  className={`pointer-events-none absolute inset-x-0 z-[30] flex items-center justify-center ${
                    useStackedMeta ? "inset-y-0" : "top-0 bottom-0"
                  }`}
                  aria-hidden
                >
                  <div className="feed-playback-flash flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-full border border-white/30 bg-black/45 text-white shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-[2px] sm:h-24 sm:w-24">
                    {playbackFlash === "play" ? (
                      <IoPlay
                        className="ml-1 h-11 w-11 sm:h-14 sm:w-14"
                        aria-hidden
                      />
                    ) : (
                      <IoPause
                        className="h-11 w-11 sm:h-14 sm:w-14"
                        aria-hidden
                      />
                    )}
                  </div>
                </div>
              ) : null}

              {isActive && hasPlayback && feedMoreMenuOpen ? (
                <button
                  type="button"
                  aria-label="Đóng menu"
                  className="absolute inset-0 z-[10] cursor-default rounded-xl bg-black/45 transition-colors sm:rounded-2xl"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setFeedMoreMenuOpen(false);
                  }}
                />
              ) : null}

              {isActive && hasPlayback ? (
                <>
                  <div
                    className={
                      useStackedMeta
                        ? "pointer-events-none absolute inset-0 z-[11]"
                        : "pointer-events-none absolute inset-x-0 top-0 bottom-0 z-[11] flex flex-col justify-end"
                    }
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-[50] flex items-center justify-between px-3 pt-3">
                      <FeedVolumeControl
                        volume={feedVolume}
                        onVolumeChange={setFeedVolume}
                        soundOn={feedSoundOn}
                        onSoundOnChange={setFeedSoundOn}
                      />
                      <button
                        type="button"
                        aria-label="Menu video"
                        aria-expanded={feedMoreMenuOpen}
                        aria-haspopup="dialog"
                        className={`cursor-pointer rounded-full bg-black/45 p-2.5 text-xl text-white backdrop-blur-sm transition-opacity duration-200 hover:bg-black/60 focus-visible:pointer-events-auto focus-visible:opacity-100 ${
                          feedMoreMenuOpen
                            ? "pointer-events-auto opacity-100"
                            : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFeedMoreMenuOpen((open) => !open);
                        }}
                      >
                        <IoEllipsisHorizontal aria-hidden />
                      </button>
                    </div>

                    {feedMoreMenuOpen ? (
                      <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Menu video"
                        className="feed-video-more-panel pointer-events-auto absolute top-[64px] right-[6px] z-40 w-[min(232px,calc(100%-12px))] overflow-visible"
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <div
                          aria-hidden
                          className="pointer-events-none absolute top-[-5px] right-[21px] z-10 h-2.5 w-2.5 rotate-45 rounded-[1px] border-l border-t border-white/18 bg-[rgba(72,72,74,0.92)] shadow-sm"
                        />
                        <div className="overflow-hidden rounded-xl border border-white/18 bg-[rgba(72,72,74,0.92)] py-1 shadow-[0_12px_36px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                          {feedMoreMenuSubpage === "main" ? (
                            <>
                              <button
                                type="button"
                                className="flex w-full items-center gap-3 border-b border-white/10 px-3.5 py-[13px] text-left text-[15px] leading-snug text-white transition-colors hover:bg-white/10 active:bg-white/14"
                                onClick={() =>
                                  setFeedMoreMenuSubpage("quality")
                                }
                              >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/28 text-[10px] font-semibold tracking-wide text-white/95">
                                  HD
                                </span>
                                <span className="min-w-0 flex-1 font-medium">
                                  Chất lượng
                                </span>
                                <span className="shrink-0 text-[15px] text-white/55">
                                  {feedQualityLabel(feedVideoQuality)}
                                </span>
                                <IoChevronForward
                                  className="h-5 w-5 shrink-0 text-white/45"
                                  aria-hidden
                                />
                              </button>

                              <button
                                type="button"
                                className="flex w-full items-center gap-3 border-b border-white/10 px-3.5 py-[13px] text-left text-[15px] leading-snug text-white transition-colors hover:bg-white/10 active:bg-white/14"
                              >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/28 text-[10px] font-semibold tracking-wide text-white/95">
                                  CC
                                </span>
                                <span className="font-medium">Phụ đề</span>
                              </button>

                              <div className="flex w-full items-center gap-3 border-b border-white/10 px-3.5 py-[13px] text-[15px] leading-snug text-white">
                                <LuArrowDownFromLine
                                  strokeWidth={1.5}
                                  className="h-[22px] w-[22px] shrink-0 text-white"
                                  aria-hidden
                                />
                                <span className="min-w-0 flex-1 font-medium">
                                  Cuộn tự động
                                </span>
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={feedAutoScrollEnabled}
                                  className={`relative h-7 w-[52px] shrink-0 rounded-full transition-colors ${feedAutoScrollEnabled ? "bg-red-600" : "bg-white/30"}`}
                                  onClick={() =>
                                    setFeedAutoScrollEnabled((prev) => !prev)
                                  }
                                >
                                  <span
                                    className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${feedAutoScrollEnabled ? "translate-x-[26px]" : "translate-x-0"}`}
                                  />
                                </button>
                              </div>

                              <button
                                type="button"
                                className="flex w-full items-center gap-3 border-b border-white/10 px-3.5 py-[13px] text-left text-[15px] leading-snug text-white transition-colors hover:bg-white/10 active:bg-white/14"
                                onClick={() =>
                                  void toggleFeedPictureInPicture()
                                }
                              >
                                <LuPictureInPicture2
                                  strokeWidth={1.5}
                                  className="h-[22px] w-[22px] shrink-0 text-white"
                                  aria-hidden
                                />
                                <span className="font-medium">
                                  Trình phát nổi
                                </span>
                              </button>

                              <button
                                type="button"
                                className="flex w-full items-center gap-3 border-b border-white/10 px-3.5 py-[13px] text-left text-[15px] leading-snug text-white transition-colors hover:bg-white/10 active:bg-white/14"
                                onClick={() => setFeedMoreMenuOpen(false)}
                              >
                                <LuHeartOff
                                  strokeWidth={1.5}
                                  className="h-[22px] w-[22px] shrink-0 text-white"
                                  aria-hidden
                                />
                                <span className="font-medium">
                                  Không quan tâm
                                </span>
                              </button>

                              <button
                                type="button"
                                className="flex w-full items-center gap-3 px-3.5 py-[13px] text-left text-[15px] leading-snug text-white transition-colors hover:bg-white/10 active:bg-white/14"
                                onClick={() => setFeedMoreMenuOpen(false)}
                              >
                                <LuFlag
                                  strokeWidth={1.5}
                                  className="h-[22px] w-[22px] shrink-0 text-white"
                                  aria-hidden
                                />
                                <span className="font-medium">Báo cáo</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 border-b border-white/10 px-3 py-2.5 text-left text-[15px] font-semibold text-white transition-colors hover:bg-white/10 active:bg-white/14"
                                onClick={() => setFeedMoreMenuSubpage("main")}
                              >
                                <IoChevronBack
                                  className="h-5 w-5 shrink-0 text-white"
                                  aria-hidden
                                />
                                <span>Chất lượng</span>
                              </button>
                              {["auto", "540", "720"].map((q) => {
                                const selected = feedVideoQuality === q;
                                return (
                                  <button
                                    key={q}
                                    type="button"
                                    className={`flex w-full items-center justify-between px-3.5 py-[13px] text-left text-[15px] leading-snug text-white transition-colors hover:bg-white/10 active:bg-white/14 ${selected ? "bg-white/12" : ""}`}
                                    onClick={() => {
                                      setFeedVideoQuality(q);
                                      setFeedMoreMenuSubpage("main");
                                    }}
                                  >
                                    <span className="font-medium">
                                      {feedQualityLabel(q)}
                                    </span>
                                    {selected ? (
                                      <IoCheckmark
                                        className="h-5 w-5 shrink-0 text-white"
                                        aria-hidden
                                      />
                                    ) : (
                                      <span
                                        className="h-5 w-5 shrink-0"
                                        aria-hidden
                                      />
                                    )}
                                  </button>
                                );
                              })}
                            </>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {!useStackedMeta ? (
                      <FeedSlideAuthorMeta
                        rawVibelyUser={rawVibelyUser}
                        authorProfilePath={authorProfilePath}
                        captionText={captionText}
                      />
                    ) : null}
                  </div>

                  {useStackedMeta ? (
                    <FeedSlideAuthorMeta
                      rawVibelyUser={rawVibelyUser}
                      authorProfilePath={authorProfilePath}
                      captionText={captionText}
                      stacked
                    />
                  ) : null}

                  <div
                    ref={progressTrackRef}
                    className={`group/progress pointer-events-auto flex w-full cursor-pointer flex-col justify-end overflow-visible ${
                      useStackedMeta
                        ? "relative z-40 shrink-0"
                        : "absolute inset-x-0 bottom-0 z-40"
                    }`}
                    role="slider"
                    tabIndex={0}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={0}
                    aria-label="Tiến độ phát"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      progressScrubbingRef.current = true;
                      setProgressScrubbing(true);
                      seekFeedVideo(e.clientX, progressTrackRef.current);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      progressScrubbingRef.current = true;
                      setProgressScrubbing(true);
                      const cx = e.touches[0]?.clientX;
                      if (cx != null)
                        seekFeedVideo(cx, progressTrackRef.current);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight")
                        return;
                      e.preventDefault();
                      const el = feedVideoRef.current;
                      if (!el?.duration || !Number.isFinite(el.duration))
                        return;
                      const delta = e.key === "ArrowLeft" ? -5 : 5;
                      el.currentTime = Math.min(
                        el.duration,
                        Math.max(0, el.currentTime + delta),
                      );
                      setProgressPct((el.currentTime / el.duration) * 100);
                    }}
                  >
                    <div className="relative w-full">
                      <div className="relative h-[3px] w-full transition-[height] duration-150 ease-out group-hover/progress:h-[5px]">
                        <div className="absolute inset-0 rounded-none bg-white/30" />
                        <div
                          ref={progressFillRef}
                          className={`absolute inset-y-0 left-0 rounded-none bg-red-600 ${progressScrubbing ? "" : "transition-[width] duration-150 ease-out"}`}
                          style={{ width: "0%", maxWidth: "100%" }}
                        />
                        <div
                          ref={progressKnobRef}
                          className={`pointer-events-none absolute top-1/2 left-0 z-20 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200 ease-out ${progressScrubbing ? "opacity-100" : "opacity-0 group-hover/progress:opacity-100"}`}
                          style={{ left: "0%" }}
                          aria-hidden
                        >
                          <div className="h-full w-full rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)] ring-2 ring-black/25 transition-transform duration-200 ease-out group-hover/progress:scale-125" />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : !hasPlayback ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/40 to-transparent p-4 pb-5">
                  <p className="truncate text-sm font-semibold text-white">
                    @{rawVibelyUser}
                  </p>
                  <div className="mt-1 text-xs text-zinc-300">
                    <FeedVideoCaption caption={captionText} />
                  </div>
                </div>
              ) : null}
            </div>
          );
        }}
      </VirtualizedFeed>
    </div>
  );
}
