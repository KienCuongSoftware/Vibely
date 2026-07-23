import { useEffect, useState } from "react";
import {
  FEED_SUBTITLES_PREFS_EVENT,
  FEED_SUBTITLES_PREFS_KEY,
  readFeedSubtitlesPrefs,
} from "./FeedSubtitlesModal.jsx";
import {
  normalizeIsoLang,
  sameIsoLanguage,
  subtitleLangToIso,
} from "./subtitleLangMap.js";

/**
 * Prefs phụ đề / dịch mô tả (localStorage) — cập nhật khi modal Phụ đề ghi.
 */
export function useFeedSubtitlesPrefs() {
  const [prefs, setPrefs] = useState(() => readFeedSubtitlesPrefs());

  useEffect(() => {
    const sync = () => setPrefs(readFeedSubtitlesPrefs());
    const onCustom = (e) => {
      if (e?.detail) setPrefs({ ...readFeedSubtitlesPrefs(), ...e.detail });
      else sync();
    };
    const onStorage = (e) => {
      if (e.key === FEED_SUBTITLES_PREFS_KEY) sync();
    };
    window.addEventListener(FEED_SUBTITLES_PREFS_EVENT, onCustom);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(FEED_SUBTITLES_PREFS_EVENT, onCustom);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const targetLangIso = subtitleLangToIso(prefs.translateTo) || "vi";
  const excludeIsos = (prefs.excludeLanguages || [])
    .map(subtitleLangToIso)
    .filter(Boolean)
    .map(normalizeIsoLang);

  return {
    prefs,
    targetLangIso,
    excludeIsos,
    isExcludedSource(sourceLang) {
      const src = normalizeIsoLang(sourceLang);
      if (!src) return false;
      return excludeIsos.some((ex) => sameIsoLanguage(ex, src));
    },
  };
}
