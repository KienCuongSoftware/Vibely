import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  IoChevronBack,
  IoChevronForward,
  IoClose,
} from "react-icons/io5";

const ACCENT = "#00f2ea";
const BRAND_RED = "#fe2c55";
export const FEED_SUBTITLES_PREFS_KEY = "vibely_feed_subtitles_prefs";
export const FEED_SUBTITLES_PREFS_EVENT = "vibely-subtitles-prefs";
const STORAGE_KEY = FEED_SUBTITLES_PREFS_KEY;

/** Danh sách ngôn ngữ kiểu TikTok (Không dịch / Dịch sang). */
export const SUBTITLE_LANGUAGES = [
  "Afrikaans",
  "Azərbaycan",
  "Bahasa Indonesia",
  "Bahasa Melayu",
  "Basa Jawa",
  "bosanski",
  "Català",
  "Cebuano",
  "Čeština",
  "Dansk",
  "Deutsch",
  "Eesti",
  "English",
  "Español",
  "Esperanto",
  "Euskara",
  "Filipino",
  "Français",
  "Frysk",
  "Gaeilge",
  "Hrvatski",
  "IsiZulu",
  "Íslenska",
  "Italiano",
  "Kiswahili",
  "Latviešu",
  "Lietuvių",
  "Magyar",
  "Malagasy",
  "Nederlands",
  "norsk",
  "norsk (bokmål)",
  "Oʻzbek",
  "Polski",
  "Português",
  "Română",
  "Shqip",
  "slovenčina",
  "slovenščina",
  "Suomi",
  "Svenska",
  "Tagalog",
  "Tiếng Việt",
  "Türkçe",
  "Ελληνικά",
  "беларуская",
  "български",
  "Қазақша",
  "македонски",
  "монгол",
  "Русский",
  "српски",
  "Татарча",
  "Українська",
  "ქართული",
  "עברית",
  "اردو",
  "العربية",
  "فارسی",
  "मराठी",
  "हिन्दी",
  "বাঙালি",
  "ਪੰਜਾਬੀ",
  "ગુજરાતੀ",
  "தமிழ்",
  "తెలుగు",
  "ಕನ್ನಡ",
  "മലയാളം",
  "සිංහල",
  "ภาษาไทย",
  "မြန်မာ",
  "ລາວ",
  "ខ្មែរ",
  "አማርኛ",
  "日本語",
  "中文 (繁體)",
  "中文 (简体)",
  "한국어",
];

/** @deprecated alias — dùng SUBTITLE_LANGUAGES */
export const SUBTITLE_EXCLUDE_LANGUAGES = SUBTITLE_LANGUAGES;

const LANG_ALIASES = {
  বাংলা: "বাঙালি",
  ไทย: "ภาษาไทย",
  繁體中文: "中文 (繁體)",
  简体中文: "中文 (简体)",
  "中文（繁體）": "中文 (繁體)",
  "中文（简体）": "中文 (简体)",
};

function normalizeLang(name) {
  if (!name) return name;
  return LANG_ALIASES[name] || name;
}
export const DEFAULT_FEED_SUBTITLES_PREFS = {
  captionsEnabled: true,
  alwaysTranslate: true,
  translateTo: "Tiếng Việt",
  /** Ngôn ngữ không dịch (loại trừ). */
  excludeLanguages: [],
};

const DEFAULT_PREFS = DEFAULT_FEED_SUBTITLES_PREFS;

export function readFeedSubtitlesPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw);
    const translateTo = normalizeLang(parsed?.translateTo) || DEFAULT_PREFS.translateTo;
    const excludeLanguages = Array.isArray(parsed?.excludeLanguages)
      ? parsed.excludeLanguages.map(normalizeLang).filter(Boolean)
      : [];
    return {
      ...DEFAULT_PREFS,
      ...parsed,
      translateTo,
      excludeLanguages,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function readPrefs() {
  return readFeedSubtitlesPrefs();
}

function writePrefs(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(FEED_SUBTITLES_PREFS_EVENT, { detail: prefs }),
      );
    }
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

function RadioRow({ label, selected, onSelect }) {
  return (
    <button
      type="button"
      className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.04]"
      onClick={onSelect}
    >
      <span className="min-w-0 flex-1 text-[15px] leading-snug text-white">
        {label}
      </span>
      <span
        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? "border-transparent" : "border-white/35 bg-transparent"
        }`}
        style={
          selected
            ? { backgroundColor: BRAND_RED, borderColor: BRAND_RED }
            : undefined
        }
        aria-hidden
      >
        {selected ? (
          <span className="h-2 w-2 rounded-full bg-white" />
        ) : null}
      </span>
    </button>
  );
}

/** Tóm tắt ngôn ngữ loại trừ kiểu TikTok: "Tiếng Việt, Afrikaa…" */
function formatExcludeSummary(langs) {
  if (!langs?.length) return null;
  const joined = langs.join(", ");
  if (joined.length <= 18) return joined;
  return `${joined.slice(0, 17)}…`;
}

/**
 * Modal phụ đề kiểu TikTok — mở từ mục «Phụ đề» trong menu ⋯.
 * View: main | exclude (Không dịch) | translateTo (Dịch sang)
 */
export function FeedSubtitlesModal({ open, onClose }) {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  /** 'main' | 'exclude' | 'translateTo' */
  const [view, setView] = useState("main");
  const [draftExclude, setDraftExclude] = useState([]);
  const [draftTranslateTo, setDraftTranslateTo] = useState("Tiếng Việt");

  useEffect(() => {
    if (!open) return;
    const next = readPrefs();
    setPrefs(next);
    setView("main");
    setDraftExclude([...(next.excludeLanguages || [])]);
    setDraftTranslateTo(next.translateTo || "Tiếng Việt");
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (view !== "main") {
        setView("main");
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, view]);

  const patchPrefs = (patch) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      writePrefs(next);
      return next;
    });
  };

  const excludeSummary = useMemo(
    () => formatExcludeSummary(prefs.excludeLanguages),
    [prefs.excludeLanguages],
  );

  /** Đã chọn lên đầu danh sách (giống TikTok «Không dịch»). */
  const excludeListOrdered = useMemo(() => {
    const selected = new Set(draftExclude);
    const top = draftExclude.filter((l) => SUBTITLE_LANGUAGES.includes(l));
    const rest = SUBTITLE_LANGUAGES.filter((l) => !selected.has(l));
    return [...top, ...rest];
  }, [draftExclude]);

  const toggleExcludeDraft = (lang) => {
    setDraftExclude((prev) =>
      prev.includes(lang) ? prev.filter((x) => x !== lang) : [...prev, lang],
    );
  };

  const confirmExclude = () => {
    patchPrefs({ excludeLanguages: draftExclude });
    setView("main");
  };

  const confirmTranslateTo = () => {
    patchPrefs({ translateTo: draftTranslateTo });
    setView("main");
  };

  if (!open || typeof document === "undefined") return null;

  const isPicker = view === "exclude" || view === "translateTo";
  const pickerTitle = view === "exclude" ? "Không dịch" : "Dịch sang";
  /** Không dịch: multi + đưa đã chọn lên đầu. Dịch sang: single, giữ thứ tự list. */
  const pickerLanguages =
    view === "exclude" ? excludeListOrdered : SUBTITLE_LANGUAGES;

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
        aria-label={isPicker ? pickerTitle : "Phụ đề"}
        className={`relative z-10 flex w-full flex-col overflow-hidden rounded-2xl bg-[#1e1e1e] shadow-[0_16px_48px_rgba(0,0,0,0.55)] ${
          isPicker
            ? "max-h-[min(78vh,640px)] max-w-[420px]"
            : "max-w-[420px]"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {view === "main" ? (
          <>
            <div className="relative flex shrink-0 items-center justify-center px-4 pb-2 pt-4">
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
                    Mô tả và phụ đề sẽ được dịch, trừ những ngôn ngữ bạn đã loại
                    trừ.
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
                className="flex w-full cursor-pointer items-center justify-between gap-3 py-3.5 text-left"
                onClick={() => {
                  setDraftExclude([...(prefs.excludeLanguages || [])]);
                  setView("exclude");
                }}
              >
                <span className="text-[15px] text-white">Không dịch</span>
                <span
                  className={`flex min-w-0 max-w-[58%] shrink-0 cursor-pointer items-center gap-1 text-[15px] ${
                    excludeSummary ? "text-white/55" : ""
                  }`}
                  style={excludeSummary ? undefined : { color: ACCENT }}
                >
                  <span className="truncate">
                    {excludeSummary ?? "Chọn ngôn ngữ"}
                  </span>
                  <IoChevronForward
                    className="h-4 w-4 shrink-0 text-white/40"
                    aria-hidden
                  />
                </span>
              </button>

              <button
                type="button"
                className="flex w-full cursor-pointer items-center justify-between gap-3 py-3.5 text-left"
                onClick={() => {
                  setDraftTranslateTo(prefs.translateTo || "Tiếng Việt");
                  setView("translateTo");
                }}
              >
                <span className="text-[15px] text-white">Dịch sang</span>
                <span className="flex shrink-0 items-center gap-1 text-[15px] text-white/55">
                  {prefs.translateTo}
                  <IoChevronForward
                    className="h-4 w-4 text-white/40"
                    aria-hidden
                  />
                </span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="relative flex shrink-0 items-center px-2 pb-2 pt-3">
              <button
                type="button"
                aria-label="Quay lại"
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white transition hover:bg-white/10"
                onClick={() => setView("main")}
              >
                <IoChevronBack className="h-5 w-5" aria-hidden />
              </button>
              <h2 className="min-w-0 flex-1 text-center text-[17px] font-semibold text-white">
                {pickerTitle}
              </h2>
              <button
                type="button"
                aria-label="Đóng"
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
                onClick={onClose}
              >
                <IoClose className="text-xl" aria-hidden />
              </button>
            </div>

            <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <ul>
                {pickerLanguages.map((lang) => {
                  const selected =
                    view === "exclude"
                      ? draftExclude.includes(lang)
                      : draftTranslateTo === lang;
                  return (
                    <li key={lang}>
                      <RadioRow
                        label={lang}
                        selected={selected}
                        onSelect={() => {
                          if (view === "exclude") {
                            toggleExcludeDraft(lang);
                          } else {
                            setDraftTranslateTo(lang);
                          }
                        }}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="shrink-0 border-t border-white/10 px-4 pb-4 pt-3">
              <button
                type="button"
                className="w-full cursor-pointer rounded-full py-3 text-[16px] font-bold text-white transition hover:brightness-110"
                style={{ backgroundColor: BRAND_RED }}
                onClick={() => {
                  if (view === "exclude") confirmExclude();
                  else confirmTranslateTo();
                }}
              >
                Xong
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
