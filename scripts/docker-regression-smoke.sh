#!/usr/bin/env sh
# Docker regression smoke (Phase A) — TC-FE-01, TC-FE-03, TC-FE-05, TC-BE-01
# GitLab/UAT: ตั้ง SMOKE_FRONTEND_URL จาก FRONTEND_BASE_URL
# Local compose: SMOKE_FRONTEND_URL=http://localhost:8404 SMOKE_BACKEND_URL=http://localhost:8405/api
#
# Runner → host UAT อาจได้ 000 ชั่วคราว (connect flake) แม้แอปตอบ 200 ได้ก่อนหน้า
# → รอ ready + ทุก TC ใช้ retry ชุดเดียวกัน
set -eu

SMOKE_FRONTEND_URL="${SMOKE_FRONTEND_URL:-http://localhost:8404}"
SMOKE_FRONTEND_URL="${SMOKE_FRONTEND_URL%/}"

if [ -z "${SMOKE_BACKEND_URL:-}" ]; then
  case "$SMOKE_FRONTEND_URL" in
    *:8404)
      SMOKE_BACKEND_URL="${SMOKE_FRONTEND_URL%:*}:8405/api"
      ;;
    *)
      SMOKE_BACKEND_URL="${SMOKE_FRONTEND_URL}/api"
      ;;
  esac
fi
SMOKE_BACKEND_URL="${SMOKE_BACKEND_URL%/}"

# พร้อมรับ request / ทน connect flake: ลองสูงสุด SMOKE_READY_ATTEMPTS ครั้ง
SMOKE_READY_ATTEMPTS="${SMOKE_READY_ATTEMPTS:-30}"
SMOKE_READY_SLEEP="${SMOKE_READY_SLEEP:-2}"
SMOKE_CONNECT_TIMEOUT="${SMOKE_CONNECT_TIMEOUT:-5}"

CURL="${CURL:-curl}"

pass() { echo "[PASS] $1"; }
fail() { echo "[FAIL] $1"; exit 1; }

# คืน HTTP code อย่างเดียว — ไม่ต่อท้าย 000 เมื่อ curl fail (กันได้ 000000)
http_code() {
  code="$($CURL -sS -o /dev/null -w '%{http_code}' --connect-timeout "$SMOKE_CONNECT_TIMEOUT" --max-time 15 "$1" 2>/dev/null || true)"
  case "$code" in
    [1-5][0-9][0-9]) echo "$code" ;;
    *) echo "000" ;;
  esac
}

# รอจนได้รหัสในรายการ want (คั่นด้วย comma) — ใช้ทั้ง ready และแต่ละ TC
expect_http() {
  label="$1"
  url="$2"
  want="$3"
  i=1
  last="000"
  while [ "$i" -le "$SMOKE_READY_ATTEMPTS" ]; do
    last="$(http_code "$url")"
    case ",$want," in
      *",$last,"*)
        echo "[ok] $label HTTP $last (attempt $i/$SMOKE_READY_ATTEMPTS)"
        return 0
        ;;
    esac
    echo "[retry] $label got $last — $i/$SMOKE_READY_ATTEMPTS in ${SMOKE_READY_SLEEP}s (want: $want)"
    sleep "$SMOKE_READY_SLEEP"
    i=$((i + 1))
  done
  fail "$label expected one of [$want] got $last after ${SMOKE_READY_ATTEMPTS} attempts"
}

echo "=== docker-regression-smoke ==="
echo "frontend: ${SMOKE_FRONTEND_URL}"
echo "backend:  ${SMOKE_BACKEND_URL}"
echo "ready:    attempts=${SMOKE_READY_ATTEMPTS} sleep=${SMOKE_READY_SLEEP}s connect=${SMOKE_CONNECT_TIMEOUT}s"
echo ""

echo "=== wait until services accept HTTP ==="
expect_http "frontend /login" "${SMOKE_FRONTEND_URL}/login" "200"
expect_http "backend /api" "${SMOKE_BACKEND_URL}" "200,401,403,404"

echo "=== TC-FE-01 GET /login ==="
expect_http "TC-FE-01" "${SMOKE_FRONTEND_URL}/login" "200"
pass "TC-FE-01"

echo "=== TC-FE-03 GET /dashboard (no auth → redirect) ==="
# -L off: 307/308 จาก middleware/next-auth; 200 = บาง config render login wrapper
expect_http "TC-FE-03" "${SMOKE_FRONTEND_URL}/dashboard" "301,302,303,307,308,200"
pass "TC-FE-03"

echo "=== TC-FE-05 GET /fonts/Sarabun-Regular.ttf ==="
expect_http "TC-FE-05" "${SMOKE_FRONTEND_URL}/fonts/Sarabun-Regular.ttf" "200"
pass "TC-FE-05"

echo "=== TC-BE-01 backend reachable ==="
expect_http "TC-BE-01" "${SMOKE_BACKEND_URL}" "200,401,403,404"
pass "TC-BE-01"

echo ""
echo "Smoke passed. Manual: login (TC-FE-02), PDF (TC-INT-01/03)."
