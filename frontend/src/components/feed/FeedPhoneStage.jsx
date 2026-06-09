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
import {
  FEED_COMMENTS_PANEL_WIDTH_PX,
  computeFeedLandscapeStageWidthPx,
} from "../../feed/feedLayout.js";

/** Track cách đáy card — knob 14px căn giữa track, mép dưới trùng đáy card (không clip). */
const FEED_PROGRESS_TRACK_BOTTOM_PX = 5;
/** Khoảng cách overlay caption / Vibely ID so với đáy card (trên vùng progress). */
const FEED_CAPTION_BOTTOM_PX = 22;

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
function FeedVideoCaption({ caption, onNeedsGradientChange }) {
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

  useLayoutEffect(() => {
    onNeedsGradientChange?.(Boolean(text) && overflowsOneLine && !expanded);
  }, [expanded, onNeedsGradientChange, overflowsOneLine, text]);

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
          Thêm
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

function resolveVideoDurationSeconds(el) {
  if (!el || el.tagName !== "VIDEO") return 0;
  if (Number.isFinite(el.duration) && el.duration > 0) return el.duration;
  try {
    if (el.seekable?.length) {
      const end = el.seekable.end(el.seekable.length - 1);
      if (Number.isFinite(end) && end > 0) return end;
    }
  } catch {
    /* noop */
  }
  return 0;
}

function formatPlaybackTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hour = Math.floor(total / 3600);
  const minute = Math.floor((total % 3600) / 60);
  const second = total % 60;
  if (hour > 0) {
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(
      2,
      "0",
    )}:${String(second).padStart(2, "0")}`;
  }
  return `${String(minute).padStart(2, "0")}:${String(second).padStart(
    2,
    "0",
  )}`;
}

/** Vibely ID + caption overlay đáy video (dọc & ngang). */
function FeedSlideAuthorMeta({
  rawVibelyUser,
  authorProfilePath,
  captionText,
  compact = false,
}) {
  const [needsGradient, setNeedsGradient] = useState(false);
  const nameClass =
    "inline-block max-w-full truncate text-[15px] font-bold leading-snug text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.95),0_0_1px_rgba(0,0,0,0.85)]";
  const displayVibelyId = rawVibelyUser ? `@${rawVibelyUser}` : "@vibely";
  const nameEl = authorProfilePath ? (
    <Link
      to={authorProfilePath}
      onClick={(e) => e.stopPropagation()}
      className={`${nameClass} hover:underline`}
    >
      {displayVibelyId}
    </Link>
  ) : (
    <p className={nameClass}>{displayVibelyId}</p>
  );

  const padClass = compact
    ? `px-3 pb-0 sm:px-4 ${needsGradient ? "pt-3" : "pt-1.5"}`
    : `px-3 pb-0 sm:px-4 ${needsGradient ? "pt-6 sm:pt-8" : "pt-2 sm:pt-3"}`;

  return (
    <div className={`pointer-events-auto relative shrink-0 ${padClass}`}>
      {needsGradient ? (
        <div
          className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/50 via-black/18 to-transparent"
          aria-hidden
        />
      ) : null}
      <div className="relative z-10">
        <div className="inline-flex max-w-full">{nameEl}</div>
        <div className="mt-1">
          <FeedVideoCaption
            caption={captionText}
            onNeedsGradientChange={setNeedsGradient}
          />
        </div>
      </div>
    </div>
  );
}

/** Re-export — dùng feedLayout.js làm nguồn duy nhất. */
export { FEED_COMMENTS_PANEL_WIDTH_PX } from "../../feed/feedLayout.js";

/** Cột feed hẹp — video dọc (mặc định, gần TikTok web). */
export const FEED_STAGE_OUTER_WIDTH_CLASS_PORTRAIT =
  "w-[min(300px,88vw)] shrink-0 md:w-[min(380px,90vw)] lg:w-[min(440px,min(86vw,560px))]";

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

/** Điều khiển âm lượng góc trên trái — capsule TikTok (icon tròn + track + thumb squircle). */
function FeedVolumeControl({
  volume,
  onVolumeChange,
  soundOn,
  onSoundOnChange,
}) {
  const [pinned, setPinned] = useState(false);

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

  const sliderTrackPad = "pl-0.5 pr-3.5";
  const sliderTrackWidth =
    "w-[4.75rem] group-hover:w-[4.75rem] focus-within:w-[4.75rem]";
  const expanded = "pointer-events-auto max-w-[9.25rem] opacity-100";
  const collapsed = `pointer-events-none max-w-9 opacity-0 group-hover:pointer-events-auto group-hover:max-w-[9.25rem] group-hover:opacity-100 group-has-[.feed-video-more-panel:hover]:pointer-events-none group-has-[.feed-video-more-panel:hover]:max-w-9 group-has-[.feed-video-more-panel:hover]:opacity-0 focus-within:pointer-events-auto focus-within:max-w-[9.25rem] focus-within:opacity-100`;

  return (
    <div
      className={`feed-volume-control flex h-9 items-center overflow-hidden rounded-full bg-black/50 text-white shadow-[0_2px_12px_rgba(0,0,0,0.35)] backdrop-blur-md transition-[max-width,opacity] duration-200 ease-out ${pinned ? expanded : collapsed}`}
      onPointerDown={pinInteraction}
      onMouseDown={stopFeedPointer}
      onClick={stopFeedPointer}
    >
      <button
        type="button"
        aria-label={soundOn && volume > 0 ? "Tắt âm thanh" : "Bật âm thanh"}
        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/14 text-[1.2rem] leading-none transition-colors hover:bg-white/22"
        onPointerDown={stopFeedPointer}
        onClick={toggleSound}
      >
        <FeedVolumeIcon soundOn={soundOn} volume={volume} />
      </button>
      <div
        className={`relative flex h-9 shrink-0 items-center overflow-hidden transition-[width,opacity,padding] duration-200 ease-out ${sliderTrackPad} ${
          pinned
            ? "w-[4.75rem] opacity-100"
            : `w-0 opacity-0 ${sliderTrackWidth} group-hover:opacity-100 focus-within:opacity-100`
        }`}
      >
        <div
          className="pointer-events-none absolute top-1/2 right-3.5 left-0.5 h-[2px] -translate-y-1/2 rounded-full bg-white/40"
          aria-hidden
        >
          <div
            className="absolute top-1/2 left-1/2 h-1.5 w-px -translate-x-1/2 -translate-y-1/2 bg-white/55"
            aria-hidden
          />
        </div>
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
          className={`feed-volume-slider relative z-10 w-full cursor-pointer ${
            pinned
              ? "pointer-events-auto"
              : "pointer-events-none group-hover:pointer-events-auto focus-within:pointer-events-auto"
          }`}
          onPointerDown={pinInteraction}
          onChange={onSlider}
          onInput={onSlider}
          onClick={stopFeedPointer}
        />
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
  feedMoreMenuSubpage,
  setFeedMoreMenuSubpage,
  feedVideoQuality,
  setFeedVideoQuality,
  feedAutoScrollEnabled,
  setFeedAutoScrollEnabled,
  toggleFeedPlayback,
  userPaused = false,
  toggleFeedPictureInPicture,
  resolveFeedAuthorDisplayName,
  feedDefaultAuthorAvatar,
  thumbnailFallbackUrl,
  playbackFlash,
  onActiveFeedPlaybackTick,
  /** Panel bình luận bên phải đang mở — video ngang thu nhỏ khung. */
  commentsDockOpen = false,
  /** Báo parent biết khung đang ở chế độ ngang (16:9). */
  onStageWideChange,
}) {
  /** Khung rộng từ trình duyệt (videoWidth/Height sau decode). */
  const [clientWideForLandscape, setClientWideForLandscape] = useState(false);
  /** Fallback: suy luận ngang từ thumbnail natural size. */
  const [thumbWideForLandscape, setThumbWideForLandscape] = useState(false);
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
      const track = trackEl ?? progressInnerRef.current ?? progressTrackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const el = feedVideoRef.current;
      if (!el) return;
      const w = rect.width;
      if (!(w > 0)) return;

      let pct = (clientX - rect.left) / w;
      pct = Math.min(1, Math.max(0, pct));

      const duration = resolveVideoDurationSeconds(el);
      const current = duration > 0 ? pct * duration : 0;
      if (duration > 0) el.currentTime = current;

      setProgressPct(pct * 100);
      setProgressPreview({
        visible: true,
        pct: pct * 100,
        current,
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
      const track =
        progressInnerRef.current ?? progressTrackRef.current;
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
  }, [activeIndex, activeVideoPublicId]);

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
  const [viewportWidthTick, setViewportWidthTick] = useState(0);
  useEffect(() => {
    const onResize = () => setViewportWidthTick((t) => t + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  void viewportWidthTick;

  /** Tính đồng bộ — tránh khung cao feedSlotHeightPx khiến overlay nằm dưới vùng letterbox. */
  const landscapeStageWidthPx = effectiveStageWide
    ? computeFeedLandscapeStageWidthPx({
        commentsOpen: commentsDockOpen,
        slotHeightPx: feedSlotHeightPx,
      })
    : null;

  const landscapeVideoHeightPx =
    landscapeStageWidthPx != null
      ? Math.round((landscapeStageWidthPx * 9) / 16)
      : null;

  const stageOuterHeightPx =
    effectiveStageWide && landscapeVideoHeightPx != null
      ? landscapeVideoHeightPx
      : feedSlotHeightPx;

  const virtualSlotHeightPx = stageOuterHeightPx;

  const stageWidthClass = effectiveStageWide
    ? "relative shrink-0"
    : FEED_STAGE_OUTER_WIDTH_CLASS_PORTRAIT;

  /** Giữ activeIndex ổn định khi chiều cao khung đổi (phát hiện 16:9). */
  const [stageHeightSettle, setStageHeightSettle] = useState(false);
  const prevVirtualSlotHeightRef = useRef(virtualSlotHeightPx);
  useLayoutEffect(() => {
    if (prevVirtualSlotHeightRef.current === virtualSlotHeightPx) return undefined;
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
    const top = Math.max(0, activeIndex) * virtualSlotHeightPx;
    const sync = () => {
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
    landscapeStageWidthPx,
  ]);

  useFeedPrefetch(videos, activeIndex);

  return (
    <div
      ref={stageOuterRef}
      className={`${stageWidthClass} relative overflow-hidden rounded-xl border border-white/10 bg-black shadow-[0_0_48px_rgba(0,0,0,0.72)] sm:rounded-2xl`}
      style={{
        width: landscapeStageWidthPx ?? undefined,
        height: stageOuterHeightPx,
      }}
    >
      <VirtualizedFeed
        ref={virtualFeedRef}
        videos={videos}
        itemHeightPx={virtualSlotHeightPx}
        scrollLocked={commentsDockOpen}
        freezeActiveIndex={commentsDockOpen || dockScrollSettle || stageHeightSettle}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
        onNearEnd={loadMoreFeed}
        scrollClassName="scrollbar-none rounded-xl sm:rounded-2xl"
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
          return (
            <div
              className={`relative h-full w-full overflow-hidden ${
                isActive ? "group" : ""
              }`}
            >
              {hasPlayback ? (
                <div
                  className="absolute inset-x-0 top-0 isolate overflow-hidden rounded-xl sm:rounded-2xl"
                  style={{ bottom: FEED_PROGRESS_TRACK_BOTTOM_PX }}
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
                    userPaused={isActive && userPaused}
                    visibilityRatio={
                      commentsDockOpen && isActive ? 1 : visibilityRatio
                    }
                    feedVideoId={video.publicId}
                    streamQuality={feedVideoQuality}
                    onPlaybackTick={
                      isActive ? handleActivePlaybackTick : undefined
                    }
                    className="relative z-0 h-full w-full cursor-pointer"
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

                  {isActive && playbackFlash && !feedMoreMenuOpen ? (
                    <div
                      className="pointer-events-none absolute inset-0 z-[30] flex items-center justify-center"
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

                  {feedMoreMenuOpen ? (
                    <button
                      type="button"
                      aria-label="Đóng menu"
                      className="absolute inset-0 z-[35] cursor-default rounded-xl bg-black/45 transition-colors sm:rounded-2xl"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setFeedMoreMenuOpen(false);
                      }}
                    />
                  ) : null}

                  {isActive ? (
                    <>
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
                          className={`pointer-events-auto cursor-pointer rounded-full bg-black/45 p-2.5 text-xl text-white backdrop-blur-sm transition-opacity duration-200 hover:bg-red-500/60 focus-visible:opacity-100 ${
                            feedMoreMenuOpen
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setFeedMoreMenuOpen((open) => !open);
                          }}
                        >
                          <IoEllipsisHorizontal aria-hidden />
                        </button>
                      </div>
                    </>
                  ) : null}

                  {isActive && feedMoreMenuOpen ? (
                    <>
                      <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Menu video"
                        className="feed-video-more-panel pointer-events-auto absolute top-[64px] right-[6px] z-[55] w-[min(232px,calc(100%-12px))] overflow-visible"
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
                    </>
                  ) : null}
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
                  userPaused={isActive && userPaused}
                  visibilityRatio={
                    commentsDockOpen && isActive ? 1 : visibilityRatio
                  }
                  feedVideoId={video.publicId}
                  streamQuality={feedVideoQuality}
                  onPlaybackTick={
                    isActive ? handleActivePlaybackTick : undefined
                  }
                  className="relative z-0 h-full w-full cursor-pointer"
                  onClick={toggleFeedPlayback}
                  onIntrinsicLandscape={
                    isActive
                      ? (wide) =>
                          onActiveIntrinsicLandscape(wide, video.publicId)
                      : undefined
                  }
                />
              )}

              {isActive && hasPlayback ? (
                <div
                  className="pointer-events-none absolute inset-x-0 z-[50] max-h-[42%] overflow-hidden [&_*]:pointer-events-auto"
                  style={{ bottom: FEED_CAPTION_BOTTOM_PX }}
                >
                  <FeedSlideAuthorMeta
                    rawVibelyUser={rawVibelyUser}
                    authorProfilePath={authorProfilePath}
                    captionText={captionText}
                    compact={effectiveStageWide}
                  />
                </div>
              ) : null}

              {!hasPlayback ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 pb-5">
                  <p className="truncate text-sm font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
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

      {Boolean(resolveFeedPlaybackUrl(activeVideo)) ? (
        <div
          ref={progressTrackRef}
          className="group/progress pointer-events-auto absolute inset-x-0 bottom-0 z-[70] h-4 w-full cursor-pointer"
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
            seekFeedVideo(e.clientX, progressInnerRef.current);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            progressScrubbingRef.current = true;
            setProgressScrubbing(true);
            const cx = e.touches[0]?.clientX;
            if (cx != null) seekFeedVideo(cx, progressInnerRef.current);
          }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            e.preventDefault();
            const el = feedVideoRef.current;
            if (!el?.duration || !Number.isFinite(el.duration)) return;
            const delta = e.key === "ArrowLeft" ? -5 : 5;
            el.currentTime = Math.min(
              el.duration,
              Math.max(0, el.currentTime + delta),
            );
            setProgressPct((el.currentTime / el.duration) * 100);
          }}
        >
          <div
            className={`pointer-events-none absolute bottom-[calc(100%+26px)] left-1/2 z-30 -translate-x-1/2 text-[2rem] leading-none font-semibold text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.85)] transition-opacity duration-150 ${
              progressScrubbing ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden
          >
            {formatPlaybackTime(progressPreview.current)} /{" "}
            {formatPlaybackTime(progressPreview.duration)}
          </div>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 bg-black"
            style={{ height: FEED_PROGRESS_TRACK_BOTTOM_PX }}
            aria-hidden
          />
          <div
            ref={progressInnerRef}
            className="absolute inset-x-0 h-1 transition-[height] duration-150 ease-out group-hover/progress:h-[5px]"
            style={{ bottom: FEED_PROGRESS_TRACK_BOTTOM_PX }}
          >
            <div className="absolute inset-0 bg-white/40" aria-hidden />
            <div
              ref={progressFillRef}
              className={`absolute inset-0 origin-left bg-[#fe2c55] will-change-transform ${progressScrubbing ? "" : "transition-transform duration-150 ease-out"}`}
              style={{ transform: "scaleX(0)" }}
            />
            <div
              ref={progressKnobRef}
              className={`pointer-events-none absolute top-1/2 left-0 z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200 ease-out ${progressScrubbing ? "opacity-100" : "opacity-0 group-hover/progress:opacity-100"}`}
              style={{ left: "0%" }}
              aria-hidden
            >
              <div className="h-full w-full rounded-full bg-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.5),0_1px_4px_rgba(0,0,0,0.35)] transition-transform duration-200 ease-out group-hover/progress:scale-110" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
