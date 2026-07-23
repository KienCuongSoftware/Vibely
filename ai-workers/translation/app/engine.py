from __future__ import annotations

import logging
import os
import threading
from dataclasses import dataclass

from langdetect import DetectorFactory, detect_langs

from .lang_codes import to_iso, to_nllb

DetectorFactory.seed = 0
logger = logging.getLogger("vibely.translation")


@dataclass(frozen=True)
class DetectResult:
    language: str
    confidence: float


@dataclass(frozen=True)
class TranslateResult:
    translated_text: str
    source_lang: str
    target_lang: str
    model: str


class TranslationEngine:
    def __init__(self) -> None:
        self.model_id = os.getenv(
            "TRANSLATION_MODEL", "facebook/nllb-200-distilled-600M"
        )
        self.device = os.getenv("TRANSLATION_DEVICE", "cpu")
        self.mock = os.getenv("TRANSLATION_MOCK", "false").lower() in {
            "1",
            "true",
            "yes",
        }
        self._lock = threading.Lock()
        self._ready = False
        self._tokenizer = None
        self._model = None

    @property
    def ready(self) -> bool:
        return self._ready or self.mock

    @property
    def model_name(self) -> str:
        return "mock" if self.mock else self.model_id

    def warm(self) -> None:
        if self.mock:
            self._ready = True
            logger.info("Translation engine running in MOCK mode")
            return
        with self._lock:
            if self._ready:
                return
            logger.info("Loading translation model %s on %s", self.model_id, self.device)
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

            self._tokenizer = AutoTokenizer.from_pretrained(self.model_id)
            self._model = AutoModelForSeq2SeqLM.from_pretrained(self.model_id)
            self._model.to(self.device)
            self._model.eval()
            self._ready = True
            logger.info("Translation model ready")

    def detect(self, text: str) -> DetectResult:
        cleaned = (text or "").strip()
        if not cleaned:
            return DetectResult(language="und", confidence=0.0)
        if self.mock:
            # Heuristic: Vietnamese diacritics → vi, else en
            if any(ch in cleaned for ch in "ăâêôơưđĂÂÊÔƠƯĐ"):
                return DetectResult(language="vi", confidence=0.9)
            return DetectResult(language="en", confidence=0.7)
        try:
            ranked = detect_langs(cleaned)
            top = ranked[0]
            iso = to_iso(top.lang) or top.lang
            return DetectResult(language=iso, confidence=float(top.prob))
        except Exception:
            logger.exception("langdetect failed")
            return DetectResult(language="und", confidence=0.0)

    def translate(
        self,
        text: str,
        *,
        source_lang: str | None,
        target_lang: str,
    ) -> TranslateResult:
        cleaned = (text or "").strip()
        if not cleaned:
            tgt = to_iso(target_lang) or target_lang
            src = to_iso(source_lang) or source_lang or "und"
            return TranslateResult(
                translated_text="",
                source_lang=src,
                target_lang=tgt,
                model=self.model_name,
            )

        detected = source_lang
        if not detected or detected in {"und", "auto"}:
            detected = self.detect(cleaned).language

        src_iso = to_iso(detected) or detected
        tgt_iso = to_iso(target_lang) or target_lang

        if src_iso == tgt_iso or src_iso.split("-")[0] == tgt_iso.split("-")[0]:
            return TranslateResult(
                translated_text=cleaned,
                source_lang=src_iso,
                target_lang=tgt_iso,
                model=self.model_name,
            )

        if self.mock:
            return TranslateResult(
                translated_text=f"[{tgt_iso}] {cleaned}",
                source_lang=src_iso,
                target_lang=tgt_iso,
                model=self.model_name,
            )

        if not self._ready:
            self.warm()

        src_nllb = to_nllb(src_iso)
        tgt_nllb = to_nllb(tgt_iso)
        if not src_nllb or not tgt_nllb:
            raise ValueError(f"Unsupported language pair: {src_iso} → {tgt_iso}")

        import torch

        with self._lock:
            assert self._tokenizer is not None and self._model is not None
            self._tokenizer.src_lang = src_nllb
            inputs = self._tokenizer(
                cleaned,
                return_tensors="pt",
                truncation=True,
                max_length=512,
            )
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            forced_bos = self._tokenizer.convert_tokens_to_ids(tgt_nllb)
            with torch.no_grad():
                generated = self._model.generate(
                    **inputs,
                    forced_bos_token_id=forced_bos,
                    max_new_tokens=512,
                    num_beams=3,
                )
            out = self._tokenizer.batch_decode(generated, skip_special_tokens=True)[0]

        return TranslateResult(
            translated_text=out.strip(),
            source_lang=src_iso,
            target_lang=tgt_iso,
            model=self.model_name,
        )


engine = TranslationEngine()
