#!/bin/sh
# SSH to deploy/build host and run scripts/ci-cleanup-images.sh against DOCKER_HOST.
# Usage: sh scripts/ci-cleanup-remote.sh <user@host> <DOCKER_HOST>
# Requires (env): CLEANUP_ENV, SSH key already configured; optional CLEANUP_KEEP_IMAGES, APP_IMAGE_*, REGISTRY_URL

set -e

SERVER="${1:-}"
DOCKER_HOST_REMOTE="${2:-}"
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
SCRIPT="${ROOT}/scripts/ci-cleanup-images.sh"

if [ -z "$SERVER" ] || [ -z "$DOCKER_HOST_REMOTE" ]; then
  echo "ERROR: usage: ci-cleanup-remote.sh <user@host> <DOCKER_HOST>"
  exit 1
fi
if [ -z "${CLEANUP_ENV:-}" ]; then
  echo "ERROR: CLEANUP_ENV is required (uat|prd)"
  exit 1
fi
if [ ! -f "$SCRIPT" ]; then
  echo "ERROR: missing ${SCRIPT}"
  exit 1
fi

mkdir -p ~/.ssh
chmod 700 ~/.ssh 2>/dev/null || true
ssh-keyscan -H "${SERVER#*@}" >> ~/.ssh/known_hosts 2>/dev/null || true

echo "=== cleanup env=${CLEANUP_ENV} via ${SERVER} DOCKER_HOST=${DOCKER_HOST_REMOTE} ==="
ssh "$SERVER" \
  "export DOCKER_HOST='${DOCKER_HOST_REMOTE}'; \
   export CLEANUP_ENV='${CLEANUP_ENV}'; \
   export CLEANUP_KEEP_IMAGES='${CLEANUP_KEEP_IMAGES:-2}'; \
   export APP_IMAGE_BACKEND='${APP_IMAGE_BACKEND:-dtrs-app-backend}'; \
   export APP_IMAGE_FRONTEND='${APP_IMAGE_FRONTEND:-dtrs-app-frontend}'; \
   export REGISTRY_URL='${REGISTRY_URL:-}'; \
   bash -s" <"$SCRIPT"
