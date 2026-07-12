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
# Clear first so old hashed chunks cannot mix with a new index.html
find "${DEST}" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
docker cp "${TMP_CONTAINER}:/usr/share/nginx/html/." "${DEST}/"
docker rm -f "${TMP_CONTAINER}" >/dev/null

echo "Done. Assets:"
ls -1 "${DEST}/assets"/StudioEditPostPage-*.js 2>/dev/null | head -3 || echo "(no StudioEditPostPage chunk found)"
ls -1 "${DEST}/assets"/index-*.js 2>/dev/null | head -1 || true
echo "Smoke: curl -sI https://vibely.sbs/ | head -5"
