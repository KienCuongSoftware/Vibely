import React, { useEffect, useMemo, useState } from "react";
import { useDescriptionTranslation } from "../../hooks/useDescriptionTranslation.js";
import { useFeedSubtitlesPrefs } from "../../hooks/useFeedSubtitlesPrefs.js";
import {
  detectCaptionLangHint,
  sameIsoLanguage,
} from "./subtitleLangMap.js";

/**
 * Chỉ dịch khi bật «Luôn dịch bài đăng».
 * Tắt → giữ nguyên caption, không hiện «Xem bản dịch».
 * Bật → hiện bản dịch + «Xem bản gốc» / «Xem bản dịch».
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

  const tx = useDescriptionTranslation({
    videoPublicId,
    originalText: original,
    sourceLang: resolvedLang || descriptionLang,
    targetLangIso,
    enabled: canTranslate,
    token,
  });

  useEffect(() => {
    if (tx.resolvedSourceLang) {
      setResolvedLang(tx.resolvedSourceLang);
    }
  }, [tx.resolvedSourceLang]);

  useEffect(() => {
    setShowOriginal(false);
  }, [videoPublicId, prefs.alwaysTranslate, prefs.translateTo, targetLangIso]);

  const blockedAfterDetect =
    isExcludedSource(resolvedLang) ||
    (resolvedLang && sameIsoLanguage(resolvedLang, targetLangIso));

  const hasTranslation = tx.status === "ready" && Boolean(tx.translated);

  const displayText = useMemo(() => {
    if (!alwaysOn || blockedAfterDetect || !hasTranslation) return original;
    if (showOriginal) return original;
    return tx.translated;
  }, [
    alwaysOn,
    blockedAfterDetect,
    hasTranslation,
    showOriginal,
    original,
    tx.translated,
  ]);

  const showingTranslated =
    alwaysOn &&
    !blockedAfterDetect &&
    hasTranslation &&
    !showOriginal;

  const busy =
    alwaysOn &&
    !blockedAfterDetect &&
    (tx.status === "loading" || tx.status === "pending");

  const onLinkClick = (e) => {
    e.stopPropagation();
    if (showingTranslated) {
      setShowOriginal(true);
      return;
    }
    if (hasTranslation) {
      setShowOriginal(false);
      return;
    }
    if (tx.status === "failed") {
      tx.retry?.();
    }
  };

  // Tắt «Luôn dịch» hoặc không đủ điều kiện → chỉ hiện bản gốc
  if (!alwaysOn || !canTranslate || blockedAfterDetect) {
    return (
      <div className="min-w-0">
        {typeof renderCaption === "function" ? renderCaption(original) : null}
      </div>
    );
  }

  let linkLabel = null;
  if (showingTranslated) {
    linkLabel = "Xem bản gốc";
  } else if (hasTranslation) {
    linkLabel = "Xem bản dịch";
  } else if (tx.status === "failed") {
    linkLabel = "Thử dịch lại";
  }

  return (
    <div className="min-w-0">
      {typeof renderCaption === "function" ? renderCaption(displayText) : null}
      {busy && !hasTranslation ? (
        <p className="mt-0.5 text-[13px] leading-snug text-white/45 [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
          Đang dịch…
        </p>
      ) : null}
      {!busy && tx.status === "failed" && tx.error ? (
        <p className="mt-0.5 text-[12px] leading-snug text-red-300/80 [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
          {String(tx.error).length > 80
            ? `${String(tx.error).slice(0, 80)}…`
            : tx.error}
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
