import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "../api/client.js";
import { sameIsoLanguage } from "../components/feed/subtitleLangMap.js";

/**
 * Fetch / poll dịch mô tả bài đăng qua Spring gateway.
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
      if (st === "READY" && data.translated != null) {
        setTranslated(data.translated);
        setStatus("ready");
        setError(null);
        return "done";
      }
      if (st === "PENDING") {
        setStatus("pending");
        return "poll";
      }
      if (st === "SKIPPED") {
        setStatus("skipped");
        return "done";
      }
      if (st === "DISABLED") {
        setStatus("disabled");
        return "done";
      }
      if (st === "FAILED") {
        setStatus("failed");
        setError(data?.message || "Dịch thất bại");
        return "done";
      }
      return "done";
    };

    const run = async () => {
      setStatus("loading");
      try {
        const data = await apiClient.requestDescriptionTranslation(
          videoPublicId,
          targetLangIso,
          token,
        );
        const next = apply(data);
        if (next === "poll") {
          const tick = async () => {
            if (cancelled || reqId !== reqIdRef.current) return;
            if (pollRef.current >= 40) {
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
              if (outcome === "poll") tick();
            } catch (err) {
              if (!cancelled) {
                setStatus("failed");
                setError(err?.message || "Không lấy được bản dịch");
              }
            }
          };
          tick();
        }
      } catch (err) {
        if (!cancelled && reqId === reqIdRef.current) {
          setStatus("failed");
          setError(err?.message || "Không dịch được");
        }
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
