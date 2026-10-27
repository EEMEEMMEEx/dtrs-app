#!/bin/sh
# Local smoke test for scripts/ci-cleanup-images.sh (dtrs-app scope only).
# Requires: docker daemon. Does NOT touch registry or remote hosts.
#
#   ./scripts/test-ci-cleanup-images.sh

set -e

ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
CLEANUP="${ROOT}/scripts/ci-cleanup-images.sh"
BASE_IMAGE="${TEST_BASE_IMAGE:-alpine:3.20}"
BACKEND="dtrs-app-backend"
FRONTEND="dtrs-app-frontend"
PASS=0
FAIL=0

assert_has() {
  repo="$1"
  tag="$2"
  if docker image inspect "${repo}:${tag}" >/dev/null 2>&1; then
    echo "  PASS has ${repo}:${tag}"
    PASS=$((PASS + 1))
  else
    echo "  FAIL missing ${repo}:${tag}"
    FAIL=$((FAIL + 1))
  fi
}

assert_gone() {
  repo="$1"
  tag="$2"
  if docker image inspect "${repo}:${tag}" >/dev/null 2>&1; then
    echo "  FAIL still present ${repo}:${tag}"
    FAIL=$((FAIL + 1))
  else
    echo "  PASS gone ${repo}:${tag}"
    PASS=$((PASS + 1))
  fi
}

cleanup_fixture() {
  for app in "$BACKEND" "$FRONTEND"; do
    docker images --format '{{.Repository}}:{{.Tag}}' "$app" 2>/dev/null | while read -r ref; do
      [ -n "$ref" ] || continue
      case "$ref" in
        *:size-audit) continue ;;
      esac
      docker rmi -f "$ref" >/dev/null 2>&1 || true
    done
  done
}

echo "=== pull base ${BASE_IMAGE} ==="
docker pull "$BASE_IMAGE" >/dev/null

echo "=== reset fixture tags (keep *:size-audit if any) ==="
cleanup_fixture

# Three UAT generations (oldest → newest). Same ID per generation pair via retag from base+label.
# Use distinct images so KEEP by ID is meaningful: tag alpine three times after tiny no-op?
# Simpler: one ID shared by many tags — KEEP=2 keeps that one ID; all older tags on other IDs removed.
# Build 3 unique IDs from alpine with different labels via docker build.

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"; cleanup_fixture' EXIT

i=1
while [ "$i" -le 3 ]; do
  printf 'FROM %s\nLABEL dtrs_cleanup_test=%s\n' "$BASE_IMAGE" "$i" >"$tmpdir/Dockerfile"
  docker build -q -t "dtrs-cleanup-seed:$i" "$tmpdir" >/dev/null
  i=$((i + 1))
done

# Seed BACKEND+FRONTEND with UAT + legacy + PRD tags across 3 generations
docker tag dtrs-cleanup-seed:1 "${BACKEND}:aaa11111-uat"
docker tag dtrs-cleanup-seed:1 "${FRONTEND}:aaa11111-uat"
docker tag dtrs-cleanup-seed:2 "${BACKEND}:bbb22222-uat"
docker tag dtrs-cleanup-seed:2 "${FRONTEND}:bbb22222-uat"
docker tag dtrs-cleanup-seed:3 "${BACKEND}:ccc33333-uat"
docker tag dtrs-cleanup-seed:3 "${FRONTEND}:ccc33333-uat"
docker tag dtrs-cleanup-seed:3 "${BACKEND}:uat-latest"
docker tag dtrs-cleanup-seed:3 "${FRONTEND}:uat-latest"
docker tag dtrs-cleanup-seed:1 "${BACKEND}:latest-uat"
docker tag dtrs-cleanup-seed:1 "${FRONTEND}:latest-uat"

docker tag dtrs-cleanup-seed:1 "${BACKEND}:oldold01-prd"
docker tag dtrs-cleanup-seed:1 "${FRONTEND}:oldold01-prd"
docker tag dtrs-cleanup-seed:2 "${BACKEND}:midmid02-prd"
docker tag dtrs-cleanup-seed:2 "${FRONTEND}:midmid02-prd"
docker tag dtrs-cleanup-seed:3 "${BACKEND}:newnew03-prd"
docker tag dtrs-cleanup-seed:3 "${FRONTEND}:newnew03-prd"
docker tag dtrs-cleanup-seed:3 "${BACKEND}:latest-prd"
docker tag dtrs-cleanup-seed:3 "${FRONTEND}:latest-prd"
docker tag dtrs-cleanup-seed:1 "${BACKEND}:prd"
docker tag dtrs-cleanup-seed:1 "${FRONTEND}:prd"
docker tag dtrs-cleanup-seed:1 "${BACKEND}:prd-latest"
docker tag dtrs-cleanup-seed:1 "${FRONTEND}:prd-latest"

# Control: unrelated image must survive
CONTROL_TAG="redis:7-alpine"
if ! docker image inspect "$CONTROL_TAG" >/dev/null 2>&1; then
  docker pull redis:7-alpine >/dev/null
fi

echo "=== run CLEANUP_ENV=uat KEEP=2 ==="
CLEANUP_ENV=uat CLEANUP_KEEP_IMAGES=2 \
  APP_IMAGE_BACKEND="$BACKEND" APP_IMAGE_FRONTEND="$FRONTEND" \
  sh "$CLEANUP"

echo "--- assertions UAT ---"
assert_has "$BACKEND" "uat-latest"
assert_has "$BACKEND" "ccc33333-uat"
assert_has "$BACKEND" "bbb22222-uat"
assert_gone "$BACKEND" "aaa11111-uat"
assert_gone "$BACKEND" "latest-uat"
# PRD tags must be untouched by UAT cleanup
assert_has "$BACKEND" "prd"
assert_has "$BACKEND" "prd-latest"
assert_has "$BACKEND" "oldold01-prd"
assert_has "$FRONTEND" "uat-latest"
assert_gone "$FRONTEND" "latest-uat"

echo "=== run CLEANUP_ENV=prd KEEP=2 ==="
CLEANUP_ENV=prd CLEANUP_KEEP_IMAGES=2 \
  APP_IMAGE_BACKEND="$BACKEND" APP_IMAGE_FRONTEND="$FRONTEND" \
  sh "$CLEANUP"

echo "--- assertions PRD ---"
assert_has "$BACKEND" "latest-prd"
assert_has "$BACKEND" "newnew03-prd"
assert_has "$BACKEND" "midmid02-prd"
assert_gone "$BACKEND" "oldold01-prd"
assert_gone "$BACKEND" "prd"
assert_gone "$BACKEND" "prd-latest"
assert_gone "$FRONTEND" "prd"
# UAT keep set still present
assert_has "$BACKEND" "uat-latest"
assert_has "$BACKEND" "ccc33333-uat"

echo "--- control (other project) ---"
assert_has "redis" "7-alpine"

echo "=== cleanup seeds ==="
docker rmi -f dtrs-cleanup-seed:1 dtrs-cleanup-seed:2 dtrs-cleanup-seed:3 >/dev/null 2>&1 || true

echo ""
echo "Result: PASS=${PASS} FAIL=${FAIL}"
if [ "$FAIL" -ne 0 ]; then
  exit 1
fi
echo "OK — ci-cleanup-images smoke passed"
