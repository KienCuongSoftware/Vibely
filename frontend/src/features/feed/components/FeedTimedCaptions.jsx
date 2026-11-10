import React, { useEffect, useState } from "react";
import {
  findActiveCue,
  useVideoSubtitles,
} from "@/features/feed/hooks/useVideoSubtitles.js";

/**
 * TikTok-style timed CC — chữ trắng trong nền đen bo góc.
 * layout:
 *  - "stack" = flow trong cột meta (For You)
 *  - "absolute" = neo bottom (legacy)
 *  - "detailBottomCenter" = dưới–giữa khung video (trang chi tiết desktop)
 */
export function FeedTimedCaptions({
  videoPublicId,
  lang,
  enabled,
  videoRef,
  token,
  layout = "stack",
  bottomPadPx = 96,
  className = "",
  onAvailabilityChange,
}) {
  const { cues, available, status } = useVideoSubtitles({
    videoPublicId,
    lang,
    enabled: Boolean(enabled),
    requestTranslate: Boolean(enabled),
    token,
  });
  const [activeText, setActiveText] = useState("");

  useEffect(() => {
    onAvailabilityChange?.(available);
  }, [available, onAvailabilityChange, videoPublicId]);

  useEffect(() => {
    if (!enabled || !cues.length) {
      setActiveText("");
      return undefined;
    }
    const sync = () => {
      const el = videoRef?.current;
      if (!el) return;
      const cue = findActiveCue(cues, el.currentTime);
      setActiveText(cue?.text ?? "");
    };
    sync();
    const el = videoRef?.current;
    if (!el) return undefined;
    el.addEventListener("timeupdate", sync);
    el.addEventListener("seeked", sync);
    el.addEventListener("play", sync);
    return () => {
      el.removeEventListener("timeupdate", sync);
      el.removeEventListener("seeked", sync);
      el.removeEventListener("play", sync);
    };
  }, [enabled, cues, videoRef, videoPublicId]);

  if (!enabled || !activeText) {
    return null;
  }

  const cueEl = (
    <p
      className={`inline-block max-w-full rounded-[4px] bg-black/40 px-2 py-[3px] font-semibold leading-snug text-white ${
        layout === "detailBottomCenter"
          ? "text-center text-[16px] sm:text-[17px]"
          : "text-left text-[15px] sm:text-[16px]"
      }`}
    >
      {activeText}
    </p>
  );

  if (layout === "detailBottomCenter") {
    return (
      <div
        className={`pointer-events-none absolute inset-x-0 z-[55] flex justify-center px-4 ${className}`}
        style={{ bottom: "20%" }}
        data-testid="feed-timed-captions"
        data-status={status}
        data-available={available ? "1" : "0"}
        aria-live="polite"
      >
        <div className="max-w-[min(90%,36rem)] text-center">{cueEl}</div>
      </div>
    );
  }

  if (layout === "absolute") {
    return (
      <div
        className={`pointer-events-none absolute inset-x-0 z-[55] px-3 sm:px-4 ${className}`}
        style={{ bottom: bottomPadPx }}
        data-testid="feed-timed-captions"
        data-status={status}
        data-available={available ? "1" : "0"}
        aria-live="polite"
      >
        <div className="max-w-[min(92%,28rem)]">{cueEl}</div>
      </div>
    );
  }

  return (
    <div
      className={`pointer-events-none mb-1.5 max-w-[min(92%,28rem)] ${className}`}
      data-testid="feed-timed-captions"
      data-status={status}
      data-available={available ? "1" : "0"}
      aria-live="polite"
    >
      {cueEl}
    </div>
  );
}
