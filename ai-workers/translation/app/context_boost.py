"""Context helpers: glossary + proper-noun protection for better caption MT."""

from __future__ import annotations

import re

# Longest-first phrase map (English → Vietnamese). Domain: short-video / wallpaper.
_GLOSSARY_EN_VI: list[tuple[str, str]] = sorted(
    [
        ("happy new year", "Chúc mừng năm mới"),
        ("live wallpaper", "Hình nền động"),
        ("live wallpapers", "Hình nền động"),
        ("animated wallpaper", "Hình nền động"),
        ("dynamic wallpaper", "Hình nền động"),
        ("phone wallpaper", "Hình nền điện thoại"),
        ("desktop wallpaper", "Hình nền máy tính"),
        ("new year", "Năm mới"),
        ("valentine", "Valentine"),
        ("christmas", "Giáng sinh"),
        ("halloween", "Halloween"),
        ("coming soon", "Sắp ra mắt"),
        ("official trailer", "Trailer chính thức"),
        ("teaser trailer", "Trailer teaser"),
        ("character demo", "Demo nhân vật"),
        ("gameplay", "Gameplay"),
        ("wallpaper", "Hình nền"),
        ("exclusive", "Độc quyền"),
        ("official", "Chính thức"),
        ("trailer", "Trailer"),
        ("animation", "Hoạt ảnh"),
        ("aesthetic", "Aesthetic"),
        ("eyes", "mắt"),
    ],
    key=lambda p: len(p[0]),
    reverse=True,
)

_PLACEHOLDER_RE = re.compile(r"«P(\d+)»")
# Title-Case / Camel name runs (Theresa Apocalypse, Shorekeeper, RaidenShogun)
_PROPER_RE = re.compile(
    r"\b("
    r"[A-Z][a-zA-Z0-9]*(?:'[A-Za-z]+)?"
    r"(?:\s+[A-Z][a-zA-Z0-9]*(?:'[A-Za-z]+)?)*"
    r")\b"
)

# Do not lock these as "names" — they are covered by glossary or are plain English.
_PROPER_BLOCKLIST = {
    "live",
    "wallpaper",
    "wallpapers",
    "new",
    "year",
    "happy",
    "the",
    "a",
    "an",
    "of",
    "and",
    "or",
    "for",
    "to",
    "in",
    "on",
    "with",
    "from",
    "by",
    "official",
    "trailer",
    "exclusive",
    "coming",
    "soon",
    "animation",
    "aesthetic",
    "phone",
    "desktop",
    "animated",
    "dynamic",
    "character",
    "demo",
    "gameplay",
    "valentine",
    "christmas",
    "halloween",
    "eyes",
    "eye",
    "edit",
    "edits",
    "version",
    "special",
}


def apply_glossary(text: str, *, source_lang: str, target_lang: str) -> str:
    src = (source_lang or "").split("-")[0].lower()
    tgt = (target_lang or "").split("-")[0].lower()
    if tgt != "vi" or src not in {"en", "und", ""}:
        return text
    out = text
    for en, vi in _GLOSSARY_EN_VI:
        out = re.sub(re.escape(en), vi, out, flags=re.IGNORECASE)
    return out


def protect_proper_nouns(text: str) -> tuple[str, list[str]]:
    """Replace name-like spans with «P0», «P1», … so NLLB cannot mangle them."""
    mapping: list[str] = []

    def repl(match: re.Match[str]) -> str:
        span = match.group(1)
        words = span.split()
        trailing: list[str] = []
        while words and words[-1].lower() in _PROPER_BLOCKLIST:
            trailing.insert(0, words.pop())
        leading: list[str] = []
        while words and words[0].lower() in _PROPER_BLOCKLIST:
            leading.append(words.pop(0))
        if not words:
            return span
        if all(w.lower() in _PROPER_BLOCKLIST for w in words):
            return span
        if len(words) == 1:
            w = words[0]
            if w.lower() in _PROPER_BLOCKLIST or len(w) < 7:
                if not re.search(r"[a-z][A-Z]", w):
                    return span
        idx = len(mapping)
        mapping.append(" ".join(words))
        core = f"«P{idx}»"
        parts = [*leading, core, *trailing]
        return " ".join(parts)

    protected = _PROPER_RE.sub(repl, text)
    return protected, mapping


def restore_proper_nouns(text: str, mapping: list[str]) -> str:
    if not mapping:
        return text

    def repl(match: re.Match[str]) -> str:
        idx = int(match.group(1))
        if 0 <= idx < len(mapping):
            return mapping[idx]
        return match.group(0)

    # Model may drop guillemets or alter spacing — try strict then loose
    out = _PLACEHOLDER_RE.sub(repl, text)
    for i, name in enumerate(mapping):
        out = re.sub(rf"\bP{i}\b", name, out)
        out = out.replace(f"<<P{i}>>", name).replace(f"<P{i}>", name)
    return out


_VI_CHAR = re.compile(
    r"[ăâêôơưđĂÂÊÔƠƯĐáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]",
    re.IGNORECASE,
)
_LATIN_WORD = re.compile(r"[A-Za-z]{3,}")


def should_skip_neural_mt(text: str) -> bool:
    """
    After glossary + placeholders, if little English prose remains, skip NLLB
    (avoids mangling already-good Vietnamese + names).
    """
    residual = _PLACEHOLDER_RE.sub(" ", text)
    # Count remaining English-looking words that are not short noise
    words = [w for w in _LATIN_WORD.findall(residual) if w.lower() not in _PROPER_BLOCKLIST]
    # If we already injected Vietnamese glossary terms, prefer skip when ≤2 English leftovers
    has_vi = bool(_VI_CHAR.search(text))
    if has_vi and len(words) <= 2:
        return True
    if len(words) == 0:
        return True
    return False


def prepare_for_mt(text: str, *, source_lang: str, target_lang: str) -> tuple[str, list[str], bool]:
    """
    Returns (text_for_model_or_final, name_mapping, skip_neural).
    When skip_neural is True, caller should only restore names (no NLLB).
    """
    # Glossary first so "Live Wallpaper" is not locked as a proper noun.
    glossed = apply_glossary(text, source_lang=source_lang, target_lang=target_lang)
    protected, mapping = protect_proper_nouns(glossed)
    skip = should_skip_neural_mt(protected)
    return protected, mapping, skip
