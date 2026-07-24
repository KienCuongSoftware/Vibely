import React, { useEffect, useMemo, useState } from "react";
import { useDescriptionTranslation } from "../../hooks/useDescriptionTranslation.js";
import { useFeedSubtitlesPrefs } from "../../hooks/useFeedSubtitlesPrefs.js";
import {
  detectCaptionLangHint,
  sameIsoLanguage,
} from "./subtitleLangMap.js";

/**
 * TikTok-style caption translation:
 * - Đang xem bản dịch → «Xem bản gốc»
 * - Đang xem bản gốc (hoặc chưa dịch) → «Xem bản dịch»
 * Tôn trọng «Không dịch» / cùng ngôn ngữ đích (kể cả khi chưa có descriptionLang).
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

  const hintedLang = useMemo(
    () => detectCaptionLangHint(original),
    [original],
  );

  /** Ưu tiên API → hint client → (sau này) lang từ response dịch. */
  const [resolvedLang, setResolvedLang] = useState(
    descriptionLang || hintedLang || null,
  );

  useEffect(() => {
    setResolvedLang(descriptionLang || hintedLang || null);
  }, [descriptionLang, hintedLang, videoPublicId]);

  const excluded = isExcludedSource(resolvedLang);
  const sameLang =
    resolvedLang && sameIsoLanguage(resolvedLang, targetLangIso);

  const canTranslate =
    Boolean(videoPublicId) &&
    Boolean(original) &&
    Boolean(active) &&
    !excluded &&
    !sameLang;

  const fetchEnabled =
    canTranslate && (Boolean(prefs.alwaysTranslate) || wantTranslate);

  const tx = useDescriptionTranslation({
    videoPublicId,
    originalText: original,
    sourceLang: resolvedLang || descriptionLang,
    targetLangIso,
    enabled: fetchEnabled,
    token,
  });

  useEffect(() => {
    if (tx.resolvedSourceLang) {
      setResolvedLang(tx.resolvedSourceLang);
    }
  }, [tx.resolvedSourceLang]);

  useEffect(() => {
    setShowOriginal(false);
    setWantTranslate(false);
  }, [videoPublicId, prefs.alwaysTranslate, prefs.translateTo, targetLangIso]);

  // Sau khi biết source thuộc exclude / trùng đích → ẩn UI dịch
  const blockedAfterDetect =
    isExcludedSource(resolvedLang) ||
    (resolvedLang && sameIsoLanguage(resolvedLang, targetLangIso));

  const hasTranslation = tx.status === "ready" && Boolean(tx.translated);

  const displayText = useMemo(() => {
    if (blockedAfterDetect || !hasTranslation) return original;
    if (showOriginal) return original;
    if (prefs.alwaysTranslate || wantTranslate) return tx.translated;
    return original;
  }, [
    blockedAfterDetect,
    hasTranslation,
    showOriginal,
    prefs.alwaysTranslate,
    wantTranslate,
    original,
    tx.translated,
  ]);

  const showingTranslated =
    !blockedAfterDetect &&
    hasTranslation &&
    !showOriginal &&
    (prefs.alwaysTranslate || wantTranslate);

  const busy =
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

  if (!canTranslate || blockedAfterDetect) {
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
