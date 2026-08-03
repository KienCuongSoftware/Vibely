FROM python:3.11-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

ENV PYTHONUNBUFFERED=1 \
    VIBELY_API_BASE=http://host.docker.internal:8080 \
    ENHANCE_INTERNAL_TOKEN=vibely-dev-enhance-token \
    ENHANCE_RABBITMQ_ENABLED=false \
    ENHANCE_POLL_SECONDS=5 \
    ENHANCE_WORK_DIR=/var/lib/vibely-enhance/workspace \
    ENHANCE_COMPLETE_TIMEOUT=600 \
    ENHANCE_ENGINE=noop \
    ENHANCE_MIN_FREE_GB=5

RUN mkdir -p /var/lib/vibely-enhance/workspace

HEALTHCHECK --interval=60s --timeout=10s --start-period=20s --retries=3 \
  CMD ffmpeg -version >/dev/null 2>&1 && test -d /var/lib/vibely-enhance/workspace || exit 1

CMD ["python", "-m", "app"]
