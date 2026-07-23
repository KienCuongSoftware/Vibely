"""ISO-639-1 / short codes ↔ NLLB Flores-200 codes used by facebook/nllb-200-*."""

from __future__ import annotations

# Common Vibely UI targets + sources.
ISO_TO_NLLB: dict[str, str] = {
    "af": "afr_Latn",
    "sq": "als_Latn",
    "am": "amh_Ethi",
    "ar": "arb_Arab",
    "hy": "hye_Armn",
    "az": "azj_Latn",
    "bn": "ben_Beng",
    "bs": "bos_Latn",
    "bg": "bul_Cyrl",
    "my": "mya_Mymr",
    "ca": "cat_Latn",
    "zh": "zho_Hans",
    "zh-hans": "zho_Hans",
    "zh-cn": "zho_Hans",
    "zh-hant": "zho_Hant",
    "zh-tw": "zho_Hant",
    "hr": "hrv_Latn",
    "cs": "ces_Latn",
    "da": "dan_Latn",
    "nl": "nld_Latn",
    "en": "eng_Latn",
    "eo": "epo_Latn",
    "et": "est_Latn",
    "fi": "fin_Latn",
    "fr": "fra_Latn",
    "gl": "glg_Latn",
    "ka": "kat_Geor",
    "de": "deu_Latn",
    "el": "ell_Grek",
    "gu": "guj_Gujr",
    "he": "heb_Hebr",
    "hi": "hin_Deva",
    "hu": "hun_Latn",
    "is": "isl_Latn",
    "id": "ind_Latn",
    "ga": "gle_Latn",
    "it": "ita_Latn",
    "ja": "jpn_Jpan",
    "jv": "jav_Latn",
    "kn": "kan_Knda",
    "kk": "kaz_Cyrl",
    "km": "khm_Khmr",
    "ko": "kor_Hang",
    "lo": "lao_Laoo",
    "lv": "lvs_Latn",
    "lt": "lit_Latn",
    "mk": "mkd_Cyrl",
    "ms": "zsm_Latn",
    "ml": "mal_Mlym",
    "mr": "mar_Deva",
    "mn": "khk_Cyrl",
    "ne": "npi_Deva",
    "no": "nob_Latn",
    "nb": "nob_Latn",
    "fa": "pes_Arab",
    "pl": "pol_Latn",
    "pt": "por_Latn",
    "pa": "pan_Guru",
    "ro": "ron_Latn",
    "ru": "rus_Cyrl",
    "sr": "srp_Cyrl",
    "si": "sin_Sinh",
    "sk": "slk_Latn",
    "sl": "slv_Latn",
    "es": "spa_Latn",
    "sw": "swh_Latn",
    "sv": "swe_Latn",
    "tl": "tgl_Latn",
    "fil": "tgl_Latn",
    "ta": "tam_Taml",
    "te": "tel_Telu",
    "th": "tha_Thai",
    "tr": "tur_Latn",
    "uk": "ukr_Cyrl",
    "ur": "urd_Arab",
    "uz": "uzn_Latn",
    "vi": "vie_Latn",
    "cy": "cym_Latn",
    "zu": "zul_Latn",
    "be": "bel_Cyrl",
    "eu": "eus_Latn",
    "ceb": "ceb_Latn",
    "fy": "fry_Latn",
    "tt": "tat_Cyrl",
    "mg": "plt_Latn",
}

NLLB_TO_ISO: dict[str, str] = {v: k for k, v in ISO_TO_NLLB.items()}
# Prefer canonical ISO for Chinese variants.
NLLB_TO_ISO["zho_Hans"] = "zh"
NLLB_TO_ISO["zho_Hant"] = "zh-hant"


def to_nllb(code: str | None) -> str | None:
    if not code:
        return None
    key = code.strip().lower().replace("_", "-")
    if key in ISO_TO_NLLB:
        return ISO_TO_NLLB[key]
    # Already NLLB?
    if "_" in code and len(code) >= 7:
        return code
    return ISO_TO_NLLB.get(key.split("-")[0])


def to_iso(code: str | None) -> str | None:
    if not code:
        return None
    if code in NLLB_TO_ISO:
        return NLLB_TO_ISO[code]
    key = code.strip().lower()
    if key in ISO_TO_NLLB:
        return key
    return key.split("-")[0] if key else None
