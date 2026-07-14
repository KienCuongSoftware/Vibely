FROM python:3.11-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

ENV PYTHONUNBUFFERED=1 \
    VIBELY_API_BASE=http://host.docker.internal:8080 \
    CU_INTERNAL_TOKEN=vibely-dev-cu-token \
    CU_RABBITMQ_ENABLED=false \
    CU_POLL_SECONDS=3 \
    CU_FRAMES_ENABLED=true \
    CU_OCR_ENABLED=true \
    CU_FRAME_COUNT=8 \
    CU_WORK_DIR=/tmp/cu-work

CMD ["python", "-m", "app"]
