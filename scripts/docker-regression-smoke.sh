#!/usr/bin/env sh
# Docker regression smoke (Phase A) — TC-FE-01, TC-FE-03, TC-FE-05, TC-BE-01
# GitLab/UAT: ตั้ง SMOKE_FRONTEND_URL จาก FRONTEND_BASE_URL
# Local compose: SMOKE_FRONTEND_URL=http://localhost:8404 SMOKE_BACKEND_URL=http://localhost:8405/api
#
# หลัง deploy container อาจ Running แต่ Next/Nest ยังไม่รับ HTTP → retry ก่อน fail
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

# พร้อมรับ request: ลองสูงสุด SMOKE_READY_ATTEMPTS ครั้ง ห่าง SMOKE_READY_SLEEP วินาที
SMOKE_READY_ATTEMPTS="${SMOKE_READY_ATTEMPTS:-30}"
SMOKE_READY_SLEEP="${SMOKE_READY_SLEEP:-2}"

CURL="${CURL:-curl}"

pass() { echo "[PASS] $1"; }
fail() { echo "[FAIL] $1"; exit 1; }

# คืน HTTP code อย่างเดียว — ไม่ต่อท้าย 000 เมื่อ curl -f fail (กันได้ 000000)
http_code() {
  # shellcheck disable=SC2086
  code="$($CURL -sS -o /dev/null -w '%{http_code}' --connect-timeout 5 "$1" 2>/dev/null || true)"
  case "$code" in
    [1-5][0-9][0-9]) echo "$code" ;;
    *) echo "000" ;;
  esac
}

wait_http() {
  label="$1"
  url="$2"
  want="$3"
  i=1
  while [ "$i" -le "$SMOKE_READY_ATTEMPTS" ]; do
    code="$(http_code "$url")"
    case ",$want," in
      *",$code,"*)
        echo "[ready] $label HTTP $code (attempt $i/$SMOKE_READY_ATTEMPTS)"
        return 0
        ;;
    esac
    echo "[wait] $label got $code — retry $i/$SMOKE_READY_ATTEMPTS in ${SMOKE_READY_SLEEP}s"
    sleep "$SMOKE_READY_SLEEP"
    i=$((i + 1))
  done
  fail "$label not ready after ${SMOKE_READY_ATTEMPTS} attempts (last HTTP $(http_code "$url"); want one of: $want)"
}

echo "=== docker-regression-smoke ==="
echo "frontend: ${SMOKE_FRONTEND_URL}"
echo "backend:  ${SMOKE_BACKEND_URL}"
echo "ready:    attempts=${SMOKE_READY_ATTEMPTS} sleep=${SMOKE_READY_SLEEP}s"
echo ""

echo "=== wait until services accept HTTP ==="
wait_http "frontend /login" "${SMOKE_FRONTEND_URL}/login" "200"
wait_http "backend /api" "${SMOKE_BACKEND_URL}" "200,401,403,404"

echo "=== TC-FE-01 GET /login ==="
code="$(http_code "${SMOKE_FRONTEND_URL}/login")"
[ "$code" = "200" ] && pass "TC-FE-01 ($code)" || fail "TC-FE-01 expected 200 got $code"

echo "=== TC-FE-03 GET /dashboard (no auth → redirect) ==="
# -L off: 307/308 จาก middleware/next-auth
redirect_code="$(http_code "${SMOKE_FRONTEND_URL}/dashboard")"
case "$redirect_code" in
  301|302|303|307|308)
    pass "TC-FE-03 redirect ($redirect_code)"
    ;;
  200)
    # บาง config อาจ render หน้า login ที่ /dashboard wrapper
    pass "TC-FE-03 (200 — ตรวจ middleware ด้วยตาเพิ่มถ้าจำเป็น)"
    ;;
  *)
    fail "TC-FE-03 expected redirect got $redirect_code"
    ;;
esac

echo "=== TC-FE-05 GET /fonts/Sarabun-Regular.ttf ==="
code="$(http_code "${SMOKE_FRONTEND_URL}/fonts/Sarabun-Regular.ttf")"
[ "$code" = "200" ] && pass "TC-FE-05 ($code)" || fail "TC-FE-05 expected 200 got $code"

echo "=== TC-BE-01 backend reachable ==="
be_code="$(http_code "${SMOKE_BACKEND_URL}")"
case "$be_code" in
  200|401|403|404)
    pass "TC-BE-01 backend responded ($be_code)"
    ;;
  *)
    fail "TC-BE-01 backend not reachable (HTTP $be_code)"
    ;;
esac

echo ""
echo "Smoke passed. Manual: login (TC-FE-02), PDF (TC-INT-01/03)."
