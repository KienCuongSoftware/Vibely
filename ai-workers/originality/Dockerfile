FROM python:3.11-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libchromaprint-tools \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

ENV PYTHONUNBUFFERED=1 \
    VIBELY_API_BASE=http://host.docker.internal:8080 \
    ORIGINALITY_INTERNAL_TOKEN=vibely-dev-originality-token \
    QDRANT_URL=http://qdrant:6333 \
    QDRANT_ENABLED=true \
    ORIGINALITY_POLL_SECONDS=3 \
    ORIGINALITY_CLIP_MODEL=ViT-B-32 \
    ORIGINALITY_CLIP_PRETRAINED=openai

CMD ["python", "-m", "app"]
