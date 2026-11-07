import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  IoArrowRedo,
  IoBookmark,
  IoChevronDown,
  IoChevronUp,
  IoHeart,
  IoVolumeHigh,
  IoVolumeMute,
} from "react-icons/io5";
import { resolveDisplayCaption } from "@/features/post/utils/videoCaption.js";
import { sanitizeAvatarUrl } from "@/features/profile/utils/avatarUrl.js";

const DEFAULT_AVATAR = "/images/users/default-avatar.jpeg";

function formatCompactCount(value) {
  const count = Number(value ?? 0);
  if (count >= 1_000_000) {
    const formatted =
      count >= 10_000_000
        ? (count / 1_000_000).toFixed(0)
        : (count / 1_000_000).toFixed(1);
    return `${formatted.replace(/\.0$/, "")}M`;
  }
  if (count >= 1_000) {
    const formatted =
      count >= 10_000 ? (count / 1_000).toFixed(0) : (count / 1_000).toFixed(1);
    return `${formatted.replace(/\.0$/, "")}K`;
  }
  return String(count);
}

function resolveAuthorName(video) {
  const name = String(video?.authorDisplayName ?? "").trim();
  if (name) return name;
  return (
    String(video?.authorUsername ?? "")
      .trim()
      .replace(/^@/, "") || "vibely"
  );
}

/**
 * TikTok-style Document PiP surface: mute, chevrons, avatar + actions,
 * caption, thin progress with full round knob.
 */
export function FeedFloatingPlayer({
  sourceVideoRef,
  activeVideo,
  activeIndex = 0,
  videoCount = 0,
  liked = false,
  bookmarked = false,
  muted = true,
  onToggleMute,
  onLike,
  onBookmark,
  onShare,
  onStep,
  stepBusy = false,
}) {
  const { t } = useTranslation();
  const mirrorRef = useRef(null);
  const trackRef = useRef(null);
  const fillRef = useRef(null);
  const knobRef = useRef(null);
  const scrubbingRef = useRef(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);

  const displayName = resolveAuthorName(activeVideo);
  const caption = resolveDisplayCaption(activeVideo) || "";
  const avatarSrc = sanitizeAvatarUrl(
    activeVideo?.avatarUrl || activeVideo?.authorAvatarUrl,
    DEFAULT_AVATAR,
  );
  const poster =
    String(activeVideo?.thumbnailUrl ?? "").trim() || DEFAULT_AVATAR;

  const setProgressVisual = useCallback((pct) => {
    const p = Math.max(0, Math.min(100, Number(pct) || 0));
    if (fillRef.current) {
      fillRef.current.style.transform = `scaleX(${p / 100})`;
    }
    if (knobRef.current) {
      knobRef.current.style.left = `${p}%`;
    }
  }, []);

  /** Mirror main feed video via captureStream (keeps HLS on the source). */
  useEffect(() => {
    const mirror = mirrorRef.current;
    const source = sourceVideoRef?.current;
    if (!mirror) return undefined;

    let stream = null;
    const bind = () => {
      const src = sourceVideoRef?.current;
      if (!mirror || !src) return;
      try {
        stream?.getTracks?.().forEach((tr) => tr.stop());
      } catch {
        /* ignore */
      }
      stream = null;
      try {
        if (typeof src.captureStream === "function") {
          stream = src.captureStream();
          mirror.srcObject = stream;
          mirror.muted = true;
          void mirror.play().catch(() => {});
          setPaused(Boolean(src.paused));
          return;
        }
      } catch {
        /* fall through */
      }
      mirror.srcObject = null;
      if (src.currentSrc) {
        mirror.src = src.currentSrc;
        mirror.muted = true;
        void mirror.play().catch(() => {});
      }
    };

    bind();
    const onPlay = () => setPaused(false);
    const onPause = () => setPaused(true);
    source?.addEventListener("play", onPlay);
    source?.addEventListener("pause", onPause);

    return () => {
      source?.removeEventListener("play", onPlay);
      source?.removeEventListener("pause", onPause);
      try {
        stream?.getTracks?.().forEach((tr) => tr.stop());
      } catch {
        /* ignore */
      }
      if (mirror) {
        mirror.srcObject = null;
        mirror.removeAttribute("src");
      }
    };
  }, [sourceVideoRef, activeVideo?.publicId]);

  useEffect(() => {
    const source = sourceVideoRef?.current;
    if (!source) return undefined;

    const sync = () => {
      if (scrubbingRef.current) return;
      const dur = Number(source.duration);
      if (!Number.isFinite(dur) || dur <= 0) {
        setProgressVisual(0);
        return;
      }
      setProgressVisual((source.currentTime / dur) * 100);
    };

    sync();
    source.addEventListener("timeupdate", sync);
    source.addEventListener("seeked", sync);
    source.addEventListener("loadedmetadata", sync);
    return () => {
      source.removeEventListener("timeupdate", sync);
      source.removeEventListener("seeked", sync);
      source.removeEventListener("loadedmetadata", sync);
    };
  }, [sourceVideoRef, activeVideo?.publicId, setProgressVisual]);

  const seekFromClientX = useCallback(
    (clientX) => {
      const source = sourceVideoRef?.current;
      const track = trackRef.current;
      if (!source || !track) return;
      const dur = Number(source.duration);
      if (!Number.isFinite(dur) || dur <= 0) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)),
      );
      source.currentTime = ratio * dur;
      setProgressVisual(ratio * 100);
    },
    [sourceVideoRef, setProgressVisual],
  );

  useEffect(() => {
    const onMove = (e) => {
      if (!scrubbingRef.current) return;
      const cx = e.touches?.[0]?.clientX ?? e.clientX;
      if (cx != null) seekFromClientX(cx);
    };
    const onUp = () => {
      if (!scrubbingRef.current) return;
      scrubbingRef.current = false;
      setScrubbing(false);
    };
    /** PiP is a separate Window — listen on both owner and opener. */
    const targets = new Set([window]);
    try {
      const owner = trackRef.current?.ownerDocument?.defaultView;
      if (owner) targets.add(owner);
    } catch {
      /* ignore */
    }
    targets.forEach((win) => {
      win.addEventListener("pointermove", onMove);
      win.addEventListener("pointerup", onUp);
      win.addEventListener("touchmove", onMove, { passive: true });
      win.addEventListener("touchend", onUp);
    });
    return () => {
      targets.forEach((win) => {
        win.removeEventListener("pointermove", onMove);
        win.removeEventListener("pointerup", onUp);
        win.removeEventListener("touchmove", onMove);
        win.removeEventListener("touchend", onUp);
      });
    };
  }, [seekFromClientX]);

  const togglePlay = useCallback(() => {
    const source = sourceVideoRef?.current;
    if (!source) return;
    if (source.paused) {
      void source.play().catch(() => {});
    } else {
      source.pause();
    }
  }, [sourceVideoRef]);

  const chevronClass =
    "flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60 disabled:opacity-35";
  const actionBtnClass =
    "flex h-9 w-9 items-center justify-center text-[22px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)] transition hover:scale-105";

  const captionPreview =
    caption.length > 72 && !captionExpanded
      ? `${caption.slice(0, 72).trimEnd()}…`
      : caption;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <video
        ref={mirrorRef}
        playsInline
        muted
        poster={poster}
        className="absolute inset-0 h-full w-full object-contain bg-black"
        onClick={togglePlay}
      />

      {/* Blur wash behind letterbox */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 scale-110 bg-cover bg-center blur-2xl brightness-50"
        style={{ backgroundImage: `url(${poster})` }}
        aria-hidden
      />

      <button
        type="button"
        className="absolute top-3 right-3 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60"
        aria-label={muted ? t("feed.unmute") : t("feed.mute")}
        onClick={(e) => {
          e.stopPropagation();
          onToggleMute?.();
        }}
      >
        {muted ? (
          <IoVolumeMute className="text-[18px]" aria-hidden />
        ) : (
          <IoVolumeHigh className="text-[18px]" aria-hidden />
        )}
      </button>

      {paused ? (
        <button
          type="button"
          className="absolute top-1/2 left-1/2 z-20 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm"
          aria-label={t("feed.play", { defaultValue: "Phát" })}
          onClick={togglePlay}
        >
          <span
            className="ml-0.5 border-y-[10px] border-l-[16px] border-y-transparent border-l-white border-r-0"
            aria-hidden
          />
        </button>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-36 bg-linear-to-t from-black/75 via-black/25 to-transparent" />

      <div className="absolute right-2.5 bottom-10 z-30 flex flex-col items-center gap-1">
        <div className="mb-0.5 flex flex-col items-center gap-0.5">
          <button
            type="button"
            className={chevronClass}
            aria-label={t("feed.prevVideo")}
            disabled={stepBusy || activeIndex <= 0}
            onClick={() => onStep?.(-1)}
          >
            <IoChevronUp className="text-lg" aria-hidden />
          </button>
          <button
            type="button"
            className={chevronClass}
            aria-label={t("feed.nextVideo")}
            disabled={stepBusy || activeIndex >= videoCount - 1}
            onClick={() => onStep?.(1)}
          >
            <IoChevronDown className="text-lg" aria-hidden />
          </button>
        </div>

        <div className="mb-0.5 h-10 w-10 overflow-hidden rounded-full ring-1 ring-white/30">
          <img
            src={avatarSrc}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            className={actionBtnClass}
            aria-pressed={liked}
            aria-label={liked ? t("feed.unlike") : t("feed.like")}
            onClick={() => onLike?.()}
          >
            <IoHeart className={liked ? "text-red-500" : "text-white"} />
          </button>
          <span className="text-[11px] leading-none text-white">
            {formatCompactCount(activeVideo?.likeCount)}
          </span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            className={actionBtnClass}
            aria-pressed={bookmarked}
            aria-label={
              bookmarked ? t("feed.unbookmark") : t("feed.bookmark")
            }
            onClick={() => onBookmark?.()}
          >
            <IoBookmark
              className={bookmarked ? "text-[#FACE15]" : "text-white"}
            />
          </button>
          <span className="text-[11px] leading-none text-white">
            {formatCompactCount(activeVideo?.bookmarkCount)}
          </span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            className={actionBtnClass}
            aria-label={t("feed.share")}
            onClick={() => onShare?.()}
          >
            <IoArrowRedo />
          </button>
          <span className="text-[11px] leading-none text-white">
            {formatCompactCount(activeVideo?.shareCount)}
          </span>
        </div>

        <div
          className="mt-1 h-8 w-8 overflow-hidden rounded-full ring-1 ring-white/25"
          aria-hidden
        >
          <img
            src={avatarSrc}
            alt=""
            className="h-full w-full object-cover"
            style={{ animation: "spin 6s linear infinite" }}
            draggable={false}
          />
        </div>
      </div>

      <div className="absolute bottom-7 left-3 right-16 z-30 max-w-[70%]">
        <p className="truncate text-[14px] font-bold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]">
          {displayName}
        </p>
        {caption ? (
          <p className="mt-0.5 text-[12px] leading-snug text-white/95 [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]">
            {captionPreview}
            {caption.length > 72 ? (
              <button
                type="button"
                className="ml-1 font-semibold text-white/90 underline-offset-2 hover:underline"
                onClick={() => setCaptionExpanded((v) => !v)}
              >
                {captionExpanded ? t("feed.collapse") : t("feed.expand")}
              </button>
            ) : null}
          </p>
        ) : null}
      </div>

      <div
        ref={trackRef}
        className="group/pip-progress absolute inset-x-0 bottom-0 z-40 h-4 cursor-pointer"
        role="slider"
        tabIndex={0}
        aria-label={t("feed.progress")}
        onPointerDown={(e) => {
          e.preventDefault();
          scrubbingRef.current = true;
          setScrubbing(true);
          seekFromClientX(e.clientX);
        }}
        onTouchStart={(e) => {
          scrubbingRef.current = true;
          setScrubbing(true);
          const cx = e.touches[0]?.clientX;
          if (cx != null) seekFromClientX(cx);
        }}
      >
        <div className="absolute inset-x-0 bottom-[5px] h-[3px] transition-[height] duration-150 group-hover/pip-progress:h-[5px]">
          <div className="absolute inset-0 bg-white/35" aria-hidden />
          <div
            ref={fillRef}
            className={`absolute inset-0 origin-left bg-white will-change-transform ${scrubbing ? "" : "transition-transform duration-100 ease-out"}`}
            style={{ transform: "scaleX(0)" }}
          />
          <div
            ref={knobRef}
            className={`pointer-events-none absolute top-1/2 left-0 z-10 h-3 w-3 -translate-x-1/2 -translate-y-[60%] rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)] transition-opacity duration-150 ${scrubbing ? "opacity-100" : "opacity-0 group-hover/pip-progress:opacity-100"}`}
            style={{ left: "0%" }}
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
