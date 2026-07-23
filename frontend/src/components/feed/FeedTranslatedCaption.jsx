import React, { useEffect, useMemo, useState } from "react";
import { useDescriptionTranslation } from "../../hooks/useDescriptionTranslation.js";
import { useFeedSubtitlesPrefs } from "../../hooks/useFeedSubtitlesPrefs.js";
import { sameIsoLanguage } from "./subtitleLangMap.js";

/**
 * Logic + toggle «Xem bản dịch» / «Xem bản gốc».
 * Parent truyền `renderCaption(displayText)` để tránh circular import với FeedPhoneStage.
 */
export function FeedTranslatedCaption({
  videoPublicId,
  captionText,
  descriptionLang,
  token,
  active = true,
  renderCaption,
}) {
  const { prefs, targetLangIso, isExcludedSource } = useFeedSubtitlesPrefs();
  const original = String(captionText ?? "").trim();
  const [showOriginal, setShowOriginal] = useState(false);
  const [manualEnabled, setManualEnabled] = useState(false);

  const excluded = isExcludedSource(descriptionLang);
  const sameLang =
    descriptionLang && sameIsoLanguage(descriptionLang, targetLangIso);

  const autoEnabled =
    Boolean(prefs.alwaysTranslate) &&
    Boolean(active) &&
    Boolean(videoPublicId) &&
    Boolean(original) &&
    !excluded &&
    !sameLang;

  const manualFetchEnabled =
    Boolean(manualEnabled) &&
    !prefs.alwaysTranslate &&
    Boolean(videoPublicId) &&
    Boolean(original) &&
    !excluded &&
    !sameLang;

  const autoTx = useDescriptionTranslation({
    videoPublicId,
    originalText: original,
    sourceLang: descriptionLang,
    targetLangIso,
    enabled: autoEnabled,
    token,
  });

  const manualTx = useDescriptionTranslation({
    videoPublicId,
    originalText: original,
    sourceLang: descriptionLang,
    targetLangIso,
    enabled: manualFetchEnabled,
    token,
  });

  const activeTx = prefs.alwaysTranslate ? autoTx : manualTx;

  useEffect(() => {
    setShowOriginal(false);
    setManualEnabled(false);
  }, [videoPublicId, prefs.alwaysTranslate, prefs.translateTo, targetLangIso]);

  const hasTranslation =
    activeTx.status === "ready" && Boolean(activeTx.translated);

  const displayText = useMemo(() => {
    if (showOriginal) return original;
    if (hasTranslation) return activeTx.translated;
    return original;
  }, [showOriginal, original, hasTranslation, activeTx.translated]);

  const onToggle = (e) => {
    e.stopPropagation();
    if (!prefs.alwaysTranslate && !hasTranslation) {
      setManualEnabled(true);
      setShowOriginal(false);
      return;
    }
    if (!hasTranslation) return;
    setShowOriginal((v) => !v);
  };

  const showManualCue =
    !prefs.alwaysTranslate &&
    Boolean(original) &&
    !excluded &&
    !sameLang &&
    !hasTranslation &&
    activeTx.status !== "loading" &&
    activeTx.status !== "pending";

  const linkLabel =
    hasTranslation && !showOriginal
      ? "Xem bản gốc"
      : hasTranslation && showOriginal
        ? "Xem bản dịch"
        : null;

  return (
    <div className="min-w-0">
      {typeof renderCaption === "function"
        ? renderCaption(displayText)
        : null}
      {(autoEnabled || manualFetchEnabled) &&
      (activeTx.status === "loading" || activeTx.status === "pending") &&
      !hasTranslation ? (
        <p className="mt-0.5 text-[13px] leading-snug text-white/45 [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
          Đang dịch…
        </p>
      ) : null}
      {activeTx.status === "failed" ? (
        <button
          type="button"
          className="mt-0.5 cursor-pointer bg-transparent p-0 text-[13px] text-white/55 hover:text-white/80"
          onClick={(e) => {
            e.stopPropagation();
            activeTx.retry?.();
          }}
        >
          Thử lại dịch
        </button>
      ) : null}
      {showManualCue ? (
        <button
          type="button"
          className="mt-0.5 cursor-pointer bg-transparent p-0 text-[13px] leading-snug text-white/55 hover:text-white/75 [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]"
          onClick={onToggle}
        >
          Xem bản dịch
        </button>
      ) : null}
      {linkLabel ? (
        <button
          type="button"
          className="mt-0.5 cursor-pointer bg-transparent p-0 text-[13px] leading-snug text-white/55 hover:text-white/75 [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]"
          onClick={onToggle}
        >
          {linkLabel}
        </button>
      ) : null}
    </div>
  );
}
