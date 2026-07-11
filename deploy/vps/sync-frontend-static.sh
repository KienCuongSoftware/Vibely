#!/usr/bin/env bash
# Copy the built SPA from the frontend Docker image into /var/www/vibely (host nginx root).
# Run on the VPS after: docker compose pull && docker compose up -d
set -euo pipefail

IMAGE="${VIBELY_FRONTEND_IMAGE:-kiencuongsoftware/vibely-frontend:latest}"
DEST="${VIBELY_STATIC_ROOT:-/var/www/vibely}"
TMP_CONTAINER="vibely-fe-static-extract-$$"

echo "Pulling ${IMAGE}..."
docker pull "${IMAGE}"

echo "Extracting static files to ${DEST}..."
docker rm -f "${TMP_CONTAINER}" 2>/dev/null || true
docker create --name "${TMP_CONTAINER}" "${IMAGE}" >/dev/null
mkdir -p "${DEST}"
docker cp "${TMP_CONTAINER}:/usr/share/nginx/html/." "${DEST}/"
docker rm -f "${TMP_CONTAINER}" >/dev/null

echo "Done. Verify ban appeal email prefill in bundle:"
grep -o 'Bạn có thể đổi sang email khác' "${DEST}/assets/"LoginPage-*.js 2>/dev/null | head -1 || true
echo "Verify OAuth path in bundle:"
grep -o 'oauth2/authorization[^`"]*' "${DEST}/assets/"LoginPage-*.js 2>/dev/null | head -1 || true
echo "Smoke test (expect HTTP/2 302): curl -sI https://vibely.sbs/api/oauth2/authorization/google | head -1"
