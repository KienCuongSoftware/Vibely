"""Split caption body vs hashtags/handles so NLLB only translates readable text."""

from __future__ import annotations

import re

# Lines / tokens that are mostly tags — keep as-is, do not send to the model.
_HASHTAG_OR_MENTION = re.compile(r"^(?:[#＠@][\w.]+)+$", re.UNICODE)
_TAG_TOKEN = re.compile(r"[#＠@][\w.]+", re.UNICODE)


def split_caption(text: str) -> tuple[str, str]:
    """
    Returns (body_to_translate, suffix_keep_as_is).

    Hashtag walls dominate live-wallpaper captions and make CPU NLLB
    slow, truncate, or barely translate. We translate the prose line(s)
    only and append tags unchanged.
    """
    raw = (text or "").strip()
    if not raw:
        return "", ""

    lines = raw.splitlines()
    body_lines: list[str] = []
    suffix_lines: list[str] = []
    seen_tag_block = False

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if not seen_tag_block:
                body_lines.append(line)
            else:
                suffix_lines.append(line)
            continue

        tokens = stripped.split()
        tag_like = sum(1 for t in tokens if _TAG_TOKEN.search(t) or _HASHTAG_OR_MENTION.match(t))
        # Line is "all tags" or mostly tags → keep out of model input
        if tokens and tag_like / len(tokens) >= 0.6:
            seen_tag_block = True
            suffix_lines.append(line)
            continue

        if seen_tag_block:
            suffix_lines.append(line)
        else:
            # Strip inline trailing hashtags from a prose line
            prose_tokens: list[str] = []
            trailing: list[str] = []
            hit_trail = False
            for tok in tokens:
                if _TAG_TOKEN.match(tok) or tok.startswith("#") or tok.startswith("@"):
                    hit_trail = True
                    trailing.append(tok)
                elif hit_trail:
                    trailing.append(tok)
                else:
                    prose_tokens.append(tok)
            if prose_tokens:
                body_lines.append(" ".join(prose_tokens))
            if trailing:
                suffix_lines.append(" ".join(trailing))
                seen_tag_block = True

    body = "\n".join(body_lines).strip()
    suffix = "\n".join(suffix_lines).strip()

    # Fallback: if everything looked like tags, translate a short head anyway
    if not body and raw:
        first = raw.splitlines()[0].strip()
        tags_on_first = " ".join(_TAG_TOKEN.findall(first))
        head = _TAG_TOKEN.sub(" ", first)
        head = re.sub(r"\s+", " ", head).strip()
        body = head or raw[:120]
        rest = "\n".join(raw.splitlines()[1:]).strip()
        suffix = "\n".join(x for x in (tags_on_first, rest) if x).strip()

    return body, suffix


def join_caption(body: str, suffix: str) -> str:
    body = (body or "").strip()
    suffix = (suffix or "").strip()
    if body and suffix:
        return f"{body}\n{suffix}"
    return body or suffix
