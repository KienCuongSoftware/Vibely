import React, { useEffect, useState } from "react";
import {
  findActiveCue,
  useVideoSubtitles,
} from "@/features/feed/hooks/useVideoSubtitles.js";

/**
 * TikTok-style timed CC overlay — white text, bottom-left above author meta.
 */
export function FeedTimedCaptions({
  videoPublicId,
  lang,
  enabled,
  videoRef,
  token,
  bottomPadPx = 96,
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

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-[55] px-3 sm:px-4"
      style={{ bottom: bottomPadPx }}
      data-testid="feed-timed-captions"
      data-status={status}
      data-available={available ? "1" : "0"}
      aria-live="polite"
    >
      <p className="max-w-[min(92%,28rem)] text-left text-[15px] font-semibold leading-snug text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.85),0_0_8px_rgba(0,0,0,0.45)] sm:text-[16px]">
        {activeText}
      </p>
    </div>
  );
}
