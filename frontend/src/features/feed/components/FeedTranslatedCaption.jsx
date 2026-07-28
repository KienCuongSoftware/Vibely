import React, { useEffect, useMemo, useState } from "react";
import { useDescriptionTranslation } from "@/features/feed/hooks/useDescriptionTranslation.js";
import { useFeedSubtitlesPrefs } from "@/features/feed/hooks/useFeedSubtitlesPrefs.js";
import {
  detectCaptionLangHint,
  sameIsoLanguage,
} from "@/features/feed/utils/subtitleLangMap.js";
import {
  VI_DIACRITIC_TARGET_LANG,
  looksLikeUnaccentedVietnamese,
} from "@/features/feed/utils/vietnameseDiacritic.js";

/**
 * «Luôn dịch bài đăng» → bản dịch ngôn ngữ + «Xem bản gốc» / «Xem bản dịch».
 * Caption Việt không dấu → «Xem bản có dấu» / «Xem bản gốc» (độc lập với prefs dịch).
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

  const hintedLang = useMemo(
    () => detectCaptionLangHint(original),
    [original],
  );

  const [resolvedLang, setResolvedLang] = useState(
    descriptionLang || hintedLang || null,
  );

  useEffect(() => {
    setResolvedLang(descriptionLang || hintedLang || null);
  }, [descriptionLang, hintedLang, videoPublicId]);

  const alwaysOn = Boolean(prefs.alwaysTranslate);
  const excluded = isExcludedSource(resolvedLang);
  const sameLang =
    resolvedLang && sameIsoLanguage(resolvedLang, targetLangIso);

  const canTranslate =
    alwaysOn &&
    Boolean(videoPublicId) &&
    Boolean(original) &&
    Boolean(active) &&
    !excluded &&
    !sameLang;

  const needsDiacritic = useMemo(
    () => looksLikeUnaccentedVietnamese(original),
    [original],
  );

  const canDiacritic =
    !canTranslate &&
    needsDiacritic &&
    Boolean(videoPublicId) &&
    Boolean(original) &&
    Boolean(active);

  const tx = useDescriptionTranslation({
    videoPublicId,
    originalText: original,
    sourceLang: resolvedLang || descriptionLang,
    targetLangIso,
    enabled: canTranslate,
    token,
  });

  const diacriticTx = useDescriptionTranslation({
    videoPublicId,
    originalText: original,
    sourceLang: "und",
    targetLangIso: VI_DIACRITIC_TARGET_LANG,
    enabled: canDiacritic,
    token,
  });

  useEffect(() => {
    if (tx.resolvedSourceLang) {
      setResolvedLang(tx.resolvedSourceLang);
    }
  }, [tx.resolvedSourceLang]);

  useEffect(() => {
    setShowOriginal(false);
  }, [
    videoPublicId,
    prefs.alwaysTranslate,
    prefs.translateTo,
    targetLangIso,
    canDiacritic,
  ]);

  const blockedAfterDetect =
    isExcludedSource(resolvedLang) ||
    (resolvedLang && sameIsoLanguage(resolvedLang, targetLangIso));

  const hasTranslation = tx.status === "ready" && Boolean(tx.translated);
  const hasDiacritic =
    diacriticTx.status === "ready" &&
    Boolean(diacriticTx.translated) &&
    diacriticTx.translated !== original;

  const activeTx = canTranslate ? tx : canDiacritic ? diacriticTx : null;
  const hasAlt = canTranslate ? hasTranslation : hasDiacritic;

  const displayText = useMemo(() => {
    if (canTranslate) {
      if (!alwaysOn || blockedAfterDetect || !hasTranslation) return original;
      if (showOriginal) return original;
      return tx.translated;
    }
    if (canDiacritic && hasDiacritic && !showOriginal) {
      return diacriticTx.translated;
    }
    return original;
  }, [
    canTranslate,
    canDiacritic,
    alwaysOn,
    blockedAfterDetect,
    hasTranslation,
    hasDiacritic,
    showOriginal,
    original,
    tx.translated,
    diacriticTx.translated,
  ]);

  const showingAlt =
    (canTranslate &&
      alwaysOn &&
      !blockedAfterDetect &&
      hasTranslation &&
      !showOriginal) ||
    (canDiacritic && hasDiacritic && !showOriginal);

  const busy =
    (canTranslate &&
      alwaysOn &&
      !blockedAfterDetect &&
      (tx.status === "loading" || tx.status === "pending")) ||
    (canDiacritic &&
      (diacriticTx.status === "loading" || diacriticTx.status === "pending"));

  const onLinkClick = (e) => {
    e.stopPropagation();
    if (showingAlt) {
      setShowOriginal(true);
      return;
    }
    if (hasAlt) {
      setShowOriginal(false);
      return;
    }
    if (activeTx?.status === "failed") {
      activeTx.retry?.();
    }
  };

  if (!canTranslate && !canDiacritic) {
    return (
      <div className="min-w-0">
        {typeof renderCaption === "function" ? renderCaption(original) : null}
      </div>
    );
  }

  let linkLabel = null;
  if (canTranslate) {
    if (showingAlt) {
      linkLabel = "Xem bản gốc";
    } else if (hasTranslation) {
      linkLabel = "Xem bản dịch";
    } else if (tx.status === "failed") {
      linkLabel = "Thử dịch lại";
    }
  } else if (canDiacritic) {
    if (showingAlt) {
      linkLabel = "Xem bản gốc";
    } else if (hasDiacritic) {
      linkLabel = "Xem bản có dấu";
    } else if (diacriticTx.status === "failed") {
      linkLabel = "Thử lại";
    } else if (
      diacriticTx.status === "skipped" ||
      (diacriticTx.status === "ready" && !hasDiacritic)
    ) {
      linkLabel = null;
    } else if (!busy && !hasDiacritic) {
      // Prefetch đang chạy hoặc chưa xong — không hiện link trống
      linkLabel = null;
    }
  }

  const busyLabel = canTranslate ? "Đang dịch…" : "Đang thêm dấu…";

  return (
    <div className="min-w-0">
      {typeof renderCaption === "function" ? renderCaption(displayText) : null}
      {busy && !hasAlt ? (
        <p className="mt-0.5 text-[13px] leading-snug text-white/45 [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
          {busyLabel}
        </p>
      ) : null}
      {!busy && activeTx?.status === "failed" && activeTx.error ? (
        <p className="mt-0.5 text-[12px] leading-snug text-red-300/80 [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
          {String(activeTx.error).length > 80
            ? `${String(activeTx.error).slice(0, 80)}…`
            : activeTx.error}
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
