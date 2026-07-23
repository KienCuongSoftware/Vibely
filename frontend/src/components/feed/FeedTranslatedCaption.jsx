import React, { useEffect, useMemo, useState } from "react";
import { useDescriptionTranslation } from "../../hooks/useDescriptionTranslation.js";
import { useFeedSubtitlesPrefs } from "../../hooks/useFeedSubtitlesPrefs.js";
import { sameIsoLanguage } from "./subtitleLangMap.js";

/**
 * TikTok-style caption translation:
 * - Đang xem bản dịch → «Xem bản gốc»
 * - Đang xem bản gốc (hoặc chưa dịch) → «Xem bản dịch»
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
  const [wantTranslate, setWantTranslate] = useState(false);

  const excluded = isExcludedSource(descriptionLang);
  const sameLang =
    descriptionLang && sameIsoLanguage(descriptionLang, targetLangIso);

  const canTranslate =
    Boolean(videoPublicId) &&
    Boolean(original) &&
    Boolean(active) &&
    !excluded &&
    !sameLang;

  /** Auto khi bật «Luôn dịch»; hoặc user bấm «Xem bản dịch». */
  const fetchEnabled =
    canTranslate &&
    (Boolean(prefs.alwaysTranslate) || wantTranslate);

  const tx = useDescriptionTranslation({
    videoPublicId,
    originalText: original,
    sourceLang: descriptionLang,
    targetLangIso,
    enabled: fetchEnabled,
    token,
  });

  useEffect(() => {
    setShowOriginal(false);
    setWantTranslate(false);
  }, [videoPublicId, prefs.alwaysTranslate, prefs.translateTo, targetLangIso]);

  const hasTranslation = tx.status === "ready" && Boolean(tx.translated);

  /** alwaysTranslate: mặc định hiện bản dịch khi có; tắt = hiện gốc đến khi user bấm dịch. */
  const displayText = useMemo(() => {
    if (!hasTranslation) return original;
    if (showOriginal) return original;
    if (prefs.alwaysTranslate || wantTranslate) return tx.translated;
    return original;
  }, [
    hasTranslation,
    showOriginal,
    prefs.alwaysTranslate,
    wantTranslate,
    original,
    tx.translated,
  ]);

  const showingTranslated =
    hasTranslation && !showOriginal && (prefs.alwaysTranslate || wantTranslate);

  const busy = tx.status === "loading" || tx.status === "pending";

  const onLinkClick = (e) => {
    e.stopPropagation();
    if (showingTranslated) {
      setShowOriginal(true);
      return;
    }
    // Đang xem gốc / chưa có bản dịch
    if (hasTranslation) {
      setShowOriginal(false);
      setWantTranslate(true);
      return;
    }
    if (tx.status === "failed") {
      setWantTranslate(true);
      tx.retry?.();
      return;
    }
    setWantTranslate(true);
    setShowOriginal(false);
  };

  if (!canTranslate) {
    return (
      <div className="min-w-0">
        {typeof renderCaption === "function" ? renderCaption(original) : null}
      </div>
    );
  }

  let linkLabel = null;
  if (showingTranslated) {
    linkLabel = "Xem bản gốc";
  } else if (hasTranslation || !busy) {
    // Chưa dịch / đang xem gốc / lỗi → luôn «Xem bản dịch» (bấm = dịch hoặc thử lại)
    linkLabel = "Xem bản dịch";
  }

  return (
    <div className="min-w-0">
      {typeof renderCaption === "function" ? renderCaption(displayText) : null}
      {busy && !hasTranslation ? (
        <p className="mt-0.5 text-[13px] leading-snug text-white/45 [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
          Đang dịch…
        </p>
      ) : null}
      {linkLabel ? (
        <button
          type="button"
          className="mt-0.5 cursor-pointer bg-transparent p-0 text-[13px] leading-snug text-white/55 hover:text-white/75 [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]"
          onClick={onLinkClick}
        >
          {linkLabel}
        </button>
      ) : null}
    </div>
  );
}
