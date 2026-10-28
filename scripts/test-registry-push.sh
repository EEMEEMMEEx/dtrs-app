#!/usr/bin/env bash
# Smoke-test: push stub images for BOTH backend + frontend to private registry.
# (alpine stub — ไม่ใช่ build จริงของแอป; แค่ยืนยัน path/push/pull)
#
# Usage:
#   ./scripts/test-registry-push.sh
#   REGISTRY_URL=192.168.0.128:5000 ./scripts/test-registry-push.sh
#   REMOTE_FLAT=1 ./scripts/test-registry-push.sh
#
# Prerequisites:
#   - Docker Desktop running + insecure-registries
#   - LAN/VPN ถึง registry ได้

set -euo pipefail

REGISTRY_URL="${REGISTRY_URL:-registry-it.forth.co.th:5000}"
TAG="${TAG:-smoke-$(date +%Y%m%d%H%M%S)}"
PLATFORM="${PLATFORM:-linux/amd64}"
BASE_IMAGE="${BASE_IMAGE:-alpine:3.20}"
export BUILDX_NO_DEFAULT_ATTESTATIONS="${BUILDX_NO_DEFAULT_ATTESTATIONS:-1}"

remote_for() {
  # $1 = dtrs-app-backend | dtrs-app-frontend
  if [ "${REMOTE_FLAT:-0}" = "1" ]; then
    echo "${REGISTRY_URL}/${1}:${TAG}"
  else
    echo "${REGISTRY_URL}/dtrs-app/${1}:${TAG}"
  fi
}

push_one() {
  local name="$1"
  local remote
  remote="$(remote_for "$name")"
  echo ""
  echo "=== buildx push → ${remote} ==="
  docker buildx build \
    --platform "$PLATFORM" \
    --provenance=false \
    --sbom=false \
    --output "type=image,name=${remote},push=true,oci-mediatypes=false,compression=gzip" \
    "$TMPDIR_BUILD"
  echo "=== pull back ${remote} ==="
  docker pull --platform "$PLATFORM" "$remote"
  echo "OK: ${remote}"
}

echo "=== Docker context / host ==="
docker context show 2>/dev/null || true
docker info --format 'Server={{.ServerVersion}} OS={{.OperatingSystem}}' || {
  echo "ERROR: ไม่คุยกับ Docker daemon ได้ — เปิด Docker Desktop แล้ว:"
  echo "  docker context use desktop-linux"
  exit 1
}

echo ""
echo "=== Insecure registries (ต้องมี ${REGISTRY_URL}) ==="
docker info 2>/dev/null | sed -n '/Insecure Registries/,/^[^ ]/p' || true

echo ""
echo "=== Probe registry HTTP /v2/ ==="
if curl -sfS -m 8 "http://${REGISTRY_URL}/v2/" >/dev/null; then
  echo "OK: http://${REGISTRY_URL}/v2/"
else
  echo "ERROR: เข้า http://${REGISTRY_URL}/v2/ ไม่ได้"
  echo "  ลอง: REGISTRY_URL=192.168.0.128:5000 $0"
  exit 1
fi

if [ -n "${REGISTRY_USER:-}" ] && [ -n "${REGISTRY_PASSWORD:-}" ]; then
  echo ""
  echo "=== docker login ${REGISTRY_URL} ==="
  printf '%s' "$REGISTRY_PASSWORD" | docker login -u "$REGISTRY_USER" --password-stdin "$REGISTRY_URL"
else
  echo ""
  echo "REGISTRY_USER/PASSWORD empty — skip login (anonymous)"
fi

TMPDIR_BUILD="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_BUILD"' EXIT
cat >"$TMPDIR_BUILD/Dockerfile" <<EOF
FROM ${BASE_IMAGE}
CMD ["echo", "dtrs-app registry smoke"]
EOF

push_one "dtrs-app-backend"
push_one "dtrs-app-frontend"

echo ""
echo "OK — backend + frontend push/pull ใช้ได้ (tag=${TAG})"
echo "  $(remote_for dtrs-app-backend)"
echo "  $(remote_for dtrs-app-frontend)"
echo "รีเฟรช Registry Browser → namespace dtrs-app ควรเห็นทั้งสอง IMG"
