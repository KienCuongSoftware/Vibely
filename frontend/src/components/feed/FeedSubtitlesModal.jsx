import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IoChevronForward, IoClose } from "react-icons/io5";

const ACCENT = "#00f2ea";
const STORAGE_KEY = "vibely_feed_subtitles_prefs";

const DEFAULT_PREFS = {
  captionsEnabled: true,
  alwaysTranslate: true,
  translateTo: "Tiếng Việt",
};

function readPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function writePrefs(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

function CyanToggle({ checked, onChange, ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      className={`relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors ${
        checked ? "bg-[#00f2ea]" : "bg-white/25"
      }`}
      onClick={() => onChange(!checked)}
    >
      <span
        className={`absolute top-[3px] left-[3px] h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-[20px]" : "translate-x-0"
        }`}
      />
    </button>
  );
}

/**
 * Modal phụ đề kiểu TikTok — mở từ mục «Phụ đề» trong menu ⋯.
 */
export function FeedSubtitlesModal({ open, onClose }) {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);

  useEffect(() => {
    if (!open) return;
    setPrefs(readPrefs());
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const patchPrefs = (patch) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      writePrefs(next);
      return next;
    });
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Đóng phụ đề"
        className="absolute inset-0 cursor-default bg-black/55"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Phụ đề"
        className="relative z-10 w-full max-w-[420px] overflow-hidden rounded-2xl bg-[#1e1e1e] shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center justify-center px-4 pb-2 pt-4">
          <h2 className="text-[17px] font-semibold text-white">Phụ đề</h2>
          <button
            type="button"
            aria-label="Đóng"
            className="absolute right-3 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
            onClick={onClose}
          >
            <IoClose className="text-xl" aria-hidden />
          </button>
        </div>

        <div className="px-4 pb-5 pt-2">
          <div className="flex items-center justify-between gap-4 py-3.5">
            <span className="min-w-0 text-[15px] leading-snug text-white">
              Chú thích (được tạo tự động)
            </span>
            <CyanToggle
              checked={prefs.captionsEnabled}
              onChange={(v) => patchPrefs({ captionsEnabled: v })}
              ariaLabel="Bật chú thích tự động"
            />
          </div>

          <div className="flex items-start justify-between gap-4 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] leading-snug text-white">
                Luôn dịch bài đăng
              </p>
              <p className="mt-1 text-[13px] leading-snug text-white/45">
                Mô tả và phụ đề sẽ được dịch, trừ những ngôn ngữ bạn đã loại trừ.
              </p>
            </div>
            <CyanToggle
              checked={prefs.alwaysTranslate}
              onChange={(v) => patchPrefs({ alwaysTranslate: v })}
              ariaLabel="Luôn dịch bài đăng"
            />
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 py-3.5 text-left"
            onClick={() => {
              /* Chọn ngôn ngữ loại trừ — UI stub TikTok */
            }}
          >
            <span className="text-[15px] text-white">Không dịch</span>
            <span className="flex shrink-0 items-center gap-1 text-[15px]" style={{ color: ACCENT }}>
              Chọn ngôn ngữ
              <IoChevronForward className="h-4 w-4 text-white/40" aria-hidden />
            </span>
          </button>

          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 py-3.5 text-left"
            onClick={() => {
              patchPrefs({
                translateTo:
                  prefs.translateTo === "Tiếng Việt" ? "English" : "Tiếng Việt",
              });
            }}
          >
            <span className="text-[15px] text-white">Dịch sang</span>
            <span className="flex shrink-0 items-center gap-1 text-[15px] text-white/55">
              {prefs.translateTo}
              <IoChevronForward className="h-4 w-4 text-white/40" aria-hidden />
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
