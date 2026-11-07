/** Map tên ngôn ngữ UI (TikTok-style) → ISO-639 dùng bởi Spring/NLLB. */
export const SUBTITLE_LANG_TO_ISO = {
  Afrikaans: "af",
  Azərbaycan: "az",
  "Bahasa Indonesia": "id",
  "Bahasa Melayu": "ms",
  "Basa Jawa": "jv",
  bosanski: "bs",
  Català: "ca",
  Cebuano: "ceb",
  Čeština: "cs",
  Dansk: "da",
  Deutsch: "de",
  Eesti: "et",
  English: "en",
  Español: "es",
  Esperanto: "eo",
  Euskara: "eu",
  Filipino: "fil",
  Français: "fr",
  Frysk: "fy",
  Gaeilge: "ga",
  Hrvatski: "hr",
  IsiZulu: "zu",
  Íslenska: "is",
  Italiano: "it",
  Kiswahili: "sw",
  Latviešu: "lv",
  Lietuvių: "lt",
  Magyar: "hu",
  Malagasy: "mg",
  Nederlands: "nl",
  norsk: "no",
  "norsk (bokmål)": "nb",
  Oʻzbek: "uz",
  Polski: "pl",
  Português: "pt",
  Română: "ro",
  Shqip: "sq",
  slovenčina: "sk",
  slovenščina: "sl",
  Suomi: "fi",
  Svenska: "sv",
  Tagalog: "tl",
  "Tiếng Việt": "vi",
  Türkçe: "tr",
  Ελληνικά: "el",
  беларуская: "be",
  български: "bg",
  Қазақша: "kk",
  македонски: "mk",
  монгол: "mn",
  Русский: "ru",
  српски: "sr",
  Татарча: "tt",
  Українська: "uk",
  ქართული: "ka",
  עברית: "he",
  اردو: "ur",
  العربية: "ar",
  فارسی: "fa",
  मराठी: "mr",
  हिन्दी: "hi",
  বাঙালি: "bn",
  ਪੰਜਾਬੀ: "pa",
  ગુજરાતી: "gu",
  தமிழ்: "ta",
  తెలుగు: "te",
  ಕನ್ನಡ: "kn",
  മലയാളം: "ml",
  සිංහල: "si",
  ภาษาไทย: "th",
  မြန်မာ: "my",
  ລາວ: "lo",
  ខ្មែរ: "km",
  አማርኛ: "am",
  日本語: "ja",
  "中文 (繁體)": "zh-hant",
  "中文 (简体)": "zh",
  한국어: "ko",
  // Vibely SUPPORTED_LANGUAGES nativeLabel extras
  "English (US)": "en",
  "English (UK)": "en",
  "Español (Latinoamérica)": "es",
  "Français (Canada)": "fr",
  "Português (Brasil)": "pt",
  हिंदी: "hi",
  বাংলা: "bn",
  Български: "bg",
  Slovenčina: "sk",
  Slovenščina: "sl",
};

/** Map Vibely locale code → canonical subtitle ISO. */
export const LOCALE_CODE_TO_SUBTITLE_ISO = {
  az: "az",
  id: "id",
  ms: "ms",
  jv: "jv",
  ca: "ca",
  ceb: "ceb",
  cs: "cs",
  da: "da",
  de: "de",
  et: "et",
  "en-GB": "en",
  en: "en",
  es: "es",
  "es-419": "es",
  fil: "tl",
  fr: "fr",
  "fr-CA": "fr",
  ga: "ga",
  hr: "hr",
  is: "is",
  it: "it",
  sw: "sw",
  lv: "lv",
  lt: "lt",
  hu: "hu",
  nl: "nl",
  nb: "nb",
  uz: "uz",
  pl: "pl",
  pt: "pt",
  "pt-BR": "pt",
  ro: "ro",
  sq: "sq",
  sk: "sk",
  sl: "sl",
  fi: "fi",
  sv: "sv",
  vi: "vi",
  tr: "tr",
  el: "el",
  bg: "bg",
  kk: "kk",
  ru: "ru",
  uk: "uk",
  he: "he",
  ur: "ur",
  ar: "ar",
  hi: "hi",
  bn: "bn",
  th: "th",
  my: "my",
  km: "km",
  ja: "ja",
  "zh-Hant": "zh-hant",
  "zh-Hans": "zh",
  ko: "ko",
};

export function subtitleLangToIso(name) {
  if (!name) return null;
  const raw = String(name).trim();
  if (SUBTITLE_LANG_TO_ISO[raw]) return SUBTITLE_LANG_TO_ISO[raw];
  if (LOCALE_CODE_TO_SUBTITLE_ISO[raw]) return LOCALE_CODE_TO_SUBTITLE_ISO[raw];
  const lower = raw.toLowerCase();
  if (LOCALE_CODE_TO_SUBTITLE_ISO[lower]) return LOCALE_CODE_TO_SUBTITLE_ISO[lower];
  return null;
}

export function localeCodeToSubtitleIso(code) {
  if (!code) return null;
  return LOCALE_CODE_TO_SUBTITLE_ISO[code] || subtitleLangToIso(code);
}

export function normalizeIsoLang(code) {
  if (!code) return null;
  const value = String(code).trim().toLowerCase().replace(/_/g, "-");
  if (value === "vi-diacritic" || value === "vidia") {
    return "vi-diacritic";
  }
  if (value.startsWith("zh-hant") || value === "zh-tw" || value === "zh-hk") {
    return "zh-hant";
  }
  if (value.startsWith("zh")) return "zh";
  const dash = value.indexOf("-");
  return dash > 0 ? value.slice(0, dash) : value;
}

export function sameIsoLanguage(a, b) {
  const na = normalizeIsoLang(a);
  const nb = normalizeIsoLang(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  return (
    na.split("-")[0] === nb.split("-")[0] &&
    !na.startsWith("zh") &&
    !nb.startsWith("zh")
  );
}

/**
 * Gợi ý ngôn ngữ khi API chưa có descriptionLang (tránh hiện «Xem bản dịch»
 * với bài tiếng Việt dù đã chọn Không dịch → Tiếng Việt).
 */
export function detectCaptionLangHint(text) {
  const s = String(text ?? "").trim();
  if (!s) return null;
  if (/[ăâêôơưđĂÂÊÔƠƯĐáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(
    s,
  )) {
    return "vi";
  }
  if (/[\u3040-\u30ff]/.test(s)) return "ja";
  if (/[\uac00-\ud7af]/.test(s)) return "ko";
  if (/[\u4e00-\u9fff]/.test(s)) return "zh";
  if (/[\u0e00-\u0e7f]/.test(s)) return "th";
  if (/[\u0600-\u06ff]/.test(s)) return "ar";
  if (/[\u0400-\u04ff]/.test(s)) return "ru";
  // Latin không dấu: không đoán (tránh nhầm en/id/…)
  return null;
}
