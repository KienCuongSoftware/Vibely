FROM python:3.11-slim-bookworm

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

ENV PYTHONUNBUFFERED=1 \
    VIBELY_API_BASE=http://host.docker.internal:8080 \
    CU_INTERNAL_TOKEN=vibely-dev-cu-token \
    CU_RABBITMQ_ENABLED=false \
    CU_POLL_SECONDS=3

CMD ["python", "-m", "app"]
