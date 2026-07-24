FROM python:3.12-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# CPU-only torch (nhẹ hơn bản CUDA mặc định trên PyPI — VPS không có GPU)
RUN pip install --no-cache-dir --default-timeout=1000 \
      --index-url https://download.pytorch.org/whl/cpu \
      torch==2.7.1+cpu \
 && pip install --no-cache-dir --default-timeout=1000 -r requirements.txt

COPY app ./app

ENV PYTHONUNBUFFERED=1 \
    TRANSLATION_MODEL=facebook/nllb-200-distilled-600M \
    TRANSLATION_DEVICE=cpu \
    TRANSLATION_INTERNAL_TOKEN=vibely-dev-translation-token \
    HF_HOME=/models/huggingface

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=5 \
    CMD curl -fsS http://127.0.0.1:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
