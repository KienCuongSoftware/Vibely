import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/shared/api/client";

/**
 * Fetch timed CC cues for a video; poll while status is PENDING.
 */
export function useVideoSubtitles({
  videoPublicId,
  lang,
  enabled = true,
  /** When false, only probe languages / cached tracks — do not enqueue NLLB. */
  requestTranslate = true,
  token,
}) {
  const [status, setStatus] = useState("idle");
  const [cues, setCues] = useState([]);
  const [sourceLang, setSourceLang] = useState(null);
  const [available, setAvailable] = useState(false);
  const reqIdRef = useRef(0);

  const apply = useCallback((data) => {
    const st = String(data?.status ?? "").toUpperCase();
    if (st === "READY" && Array.isArray(data?.cues) && data.cues.length > 0) {
      setCues(
        data.cues.map((c) => ({
          startMs: Number(c.startMs) || 0,
          endMs: Number(c.endMs) || 0,
          text: String(c.text ?? "").trim(),
        })),
      );
      setStatus("ready");
      setAvailable(true);
      return "done";
    }
    if (st === "PENDING") {
      setStatus("pending");
      setAvailable(true);
      return "poll";
    }
    if (st === "UNAVAILABLE" || st === "FAILED") {
      setCues([]);
      setStatus(st === "FAILED" ? "failed" : "unavailable");
      if (st === "UNAVAILABLE") setAvailable(false);
      return "done";
    }
    setCues([]);
    setStatus("unavailable");
    setAvailable(false);
    return "done";
  }, []);

  useEffect(() => {
    if (!videoPublicId || !lang) {
      setStatus("idle");
      setCues([]);
      setAvailable(false);
      return undefined;
    }

    let cancelled = false;
    const reqId = ++reqIdRef.current;

    const poll = async () => {
      for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        if (cancelled || reqId !== reqIdRef.current) return;
        try {
          const data = await apiClient.getVideoSubtitles(videoPublicId, lang, {
            request: false,
            token,
          });
          if (cancelled || reqId !== reqIdRef.current) return;
          const outcome = apply(data);
          if (outcome !== "poll") return;
        } catch {
          if (!cancelled && reqId === reqIdRef.current) {
            setStatus("failed");
          }
          return;
        }
      }
    };

    const run = async () => {
      setStatus("loading");
      setCues([]);
      let hasAnyTrack = false;
      try {
        const langs = await apiClient.getVideoSubtitleLanguages(
          videoPublicId,
          token,
        );
        if (!cancelled && reqId === reqIdRef.current) {
          setSourceLang(langs?.sourceLang ?? null);
          hasAnyTrack =
            Array.isArray(langs?.languages) && langs.languages.length > 0;
          setAvailable(hasAnyTrack);
        }
      } catch {
        /* ignore languages probe */
      }

      // Probe availability without forcing translation when CC is off.
      if (!enabled && !requestTranslate) {
        if (!cancelled && reqId === reqIdRef.current) {
          setStatus(hasAnyTrack ? "ready" : "unavailable");
        }
        return;
      }

      try {
        const data = await apiClient.getVideoSubtitles(videoPublicId, lang, {
          request: Boolean(requestTranslate),
          token,
        });
        if (cancelled || reqId !== reqIdRef.current) return;
        const outcome = apply(data);
        if (outcome === "poll") await poll();
      } catch {
        if (!cancelled && reqId === reqIdRef.current) {
          setStatus(hasAnyTrack ? "ready" : "unavailable");
          if (!hasAnyTrack) {
            setAvailable(false);
            setCues([]);
          }
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [enabled, requestTranslate, videoPublicId, lang, token, apply]);

  return { status, cues, available, sourceLang };
}

export function findActiveCue(cues, currentTimeSec) {
  if (!Array.isArray(cues) || cues.length === 0) return null;
  const ms = Math.max(0, Number(currentTimeSec) || 0) * 1000;
  for (const cue of cues) {
    if (ms >= cue.startMs && ms < cue.endMs && cue.text) {
      return cue;
    }
  }
  return null;
}
