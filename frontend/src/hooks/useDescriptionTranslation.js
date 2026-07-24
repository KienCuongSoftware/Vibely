import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "../api/client.js";
import { sameIsoLanguage } from "../components/feed/subtitleLangMap.js";

/**
 * POST enqueue/sync một lần, rồi GET poll status.
 * Nếu POST lỗi mạng/500 vẫn poll GET (job có thể đã được tạo).
 */
export function useDescriptionTranslation({
  videoPublicId,
  originalText,
  sourceLang,
  targetLangIso,
  enabled,
  token,
}) {
  const [status, setStatus] = useState("idle");
  const [translated, setTranslated] = useState(null);
  const [resolvedSourceLang, setResolvedSourceLang] = useState(
    sourceLang || null,
  );
  const [error, setError] = useState(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const pollRef = useRef(0);
  const reqIdRef = useRef(0);

  useEffect(() => {
    setStatus("idle");
    setTranslated(null);
    setError(null);
    setResolvedSourceLang(sourceLang || null);
  }, [videoPublicId, originalText, targetLangIso, sourceLang]);

  useEffect(() => {
    if (!enabled || !videoPublicId || !String(originalText || "").trim()) {
      return undefined;
    }
    if (sourceLang && sameIsoLanguage(sourceLang, targetLangIso)) {
      setStatus("skipped");
      return undefined;
    }

    const reqId = ++reqIdRef.current;
    let cancelled = false;
    pollRef.current = 0;

    const apply = (data) => {
      if (cancelled || reqId !== reqIdRef.current) return "done";
      if (data?.sourceLang) setResolvedSourceLang(data.sourceLang);
      const st = String(data?.status || "").toUpperCase();
      if (st === "READY" && data.translated != null && data.translated !== "") {
        setTranslated(data.translated);
        setStatus("ready");
        setError(null);
        return "done";
      }
      if (st === "PENDING") {
        setStatus("pending");
        setError(null);
        return "poll";
      }
      if (st === "SKIPPED") {
        setStatus("skipped");
        setError(null);
        return "done";
      }
      if (st === "DISABLED") {
        setStatus("disabled");
        setError(data?.message || "Dịch đang tắt");
        return "done";
      }
      if (st === "FAILED") {
        setStatus("failed");
        setError(data?.message || "Dịch thất bại");
        return "done";
      }
      return "done";
    };

    const poll = async () => {
      while (!cancelled && reqId === reqIdRef.current) {
        // ~2 phút (CPU NLLB chậm)
        if (pollRef.current >= 80) {
          setStatus("failed");
          setError("Dịch quá lâu, thử lại sau");
          return;
        }
        pollRef.current += 1;
        await new Promise((r) => setTimeout(r, 1500));
        if (cancelled || reqId !== reqIdRef.current) return;
        try {
          const polled = await apiClient.getDescriptionTranslation(
            videoPublicId,
            targetLangIso,
            token,
          );
          const outcome = apply(polled);
          if (outcome !== "poll") return;
        } catch (err) {
          if (!cancelled) {
            setStatus("failed");
            setError(err?.message || "Không lấy được bản dịch");
          }
          return;
        }
      }
    };

    const run = async () => {
      setStatus("loading");
      setError(null);
      let shouldPoll = false;
      try {
        const data = await apiClient.requestDescriptionTranslation(
          videoPublicId,
          targetLangIso,
          token,
        );
        const next = apply(data);
        shouldPoll = next === "poll";
      } catch (err) {
        // POST 500 / mạng — vẫn thử GET (job có thể đã enqueue)
        if (!cancelled && reqId === reqIdRef.current) {
          setStatus("pending");
          setError(null);
          shouldPoll = true;
        }
      }
      if (shouldPoll && !cancelled && reqId === reqIdRef.current) {
        await poll();
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    videoPublicId,
    originalText,
    sourceLang,
    targetLangIso,
    token,
    retryNonce,
  ]);

  const retry = useCallback(() => {
    setError(null);
    setRetryNonce((n) => n + 1);
  }, []);

  return {
    status,
    translated,
    resolvedSourceLang,
    error,
    retry,
  };
}
