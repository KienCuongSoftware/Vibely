from __future__ import annotations

import logging
import os
import threading
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from .engine import engine

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("vibely.translation.api")

INTERNAL_TOKEN = os.getenv(
    "TRANSLATION_INTERNAL_TOKEN", "vibely-dev-translation-token"
)


class DetectRequest(BaseModel):
    text: str = Field(..., min_length=0, max_length=8000)


class DetectResponse(BaseModel):
    language: str
    confidence: float


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=0, max_length=8000)
    source_lang: Optional[str] = Field(default=None, max_length=16)
    target_lang: str = Field(..., min_length=2, max_length=16)


class TranslateResponse(BaseModel):
    translated_text: str
    source_lang: str
    target_lang: str
    model: str


app = FastAPI(title="Vibely Translation", version="1.0.0")


def require_internal_token(
    x_internal_token: Optional[str] = Header(default=None, alias="X-Internal-Token"),
) -> None:
    if not INTERNAL_TOKEN:
        return
    if x_internal_token != INTERNAL_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid internal token")


@app.on_event("startup")
def on_startup() -> None:
    def _load() -> None:
        try:
            engine.warm()
        except Exception:
            logger.exception("Failed to warm translation model")

    threading.Thread(target=_load, name="translation-warm", daemon=True).start()


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok" if engine.ready else "loading",
        "ready": engine.ready,
        "model": engine.model_name,
    }


@app.post("/v1/detect", response_model=DetectResponse)
def detect(
    body: DetectRequest,
    _: None = Depends(require_internal_token),
) -> DetectResponse:
    result = engine.detect(body.text)
    return DetectResponse(language=result.language, confidence=result.confidence)


@app.post("/v1/translate", response_model=TranslateResponse)
def translate(
    body: TranslateRequest,
    _: None = Depends(require_internal_token),
) -> TranslateResponse:
    if not engine.ready:
        raise HTTPException(status_code=503, detail="Model not ready")
    try:
        result = engine.translate(
            body.text,
            source_lang=body.source_lang,
            target_lang=body.target_lang,
        )
    except ValueError as ex:
        raise HTTPException(status_code=400, detail=str(ex)) from ex
    except Exception as ex:
        logger.exception("translate failed")
        raise HTTPException(status_code=500, detail="Translation failed") from ex
    return TranslateResponse(
        translated_text=result.translated_text,
        source_lang=result.source_lang,
        target_lang=result.target_lang,
        model=result.model,
    )
