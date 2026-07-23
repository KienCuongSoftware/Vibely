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
};

export function subtitleLangToIso(name) {
  if (!name) return null;
  return SUBTITLE_LANG_TO_ISO[name] || null;
}

export function normalizeIsoLang(code) {
  if (!code) return null;
  const value = String(code).trim().toLowerCase().replace(/_/g, "-");
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
