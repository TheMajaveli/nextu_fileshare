#!/usr/bin/env bash
# End-to-end API verification against the BFF (session cookie OAuth flow).
# Usage: ./backend/scripts/verify-api.sh
set -euo pipefail

BFF_URL="${BFF_URL:-http://localhost:8090}"
KEYCLOAK_BASE="${KEYCLOAK_BASE:-http://localhost:8180}"
PASS="${PASS:-password}"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

pass() { echo -e "${GREEN}PASS${NC} $1"; }
fail() { echo -e "${RED}FAIL${NC} $1"; exit 1; }

login() {
  local username="$1"
  local cj
  cj=$(mktemp)
  local loc html action callback

  loc=$(curl -s -c "$cj" -b "$cj" -o /dev/null -w "%{redirect_url}" "${BFF_URL}/oauth2/authorization/keycloak")
  html=$(curl -s -c "$cj" -b "$cj" "$loc")
  action=$(echo "$html" | grep -o 'action="[^"]*"' | head -1 | sed 's/action="//;s/"$//' | sed 's/&amp;/\&/g')

  callback=$(curl -s -c "$cj" -b "$cj" -X POST "$action" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "username=${username}" \
    --data-urlencode "password=${PASS}" \
    -o /dev/null -w "%{redirect_url}")

  callback="${callback//http:\/\/localhost:5173/http://localhost:8090}"
  curl -s -c "$cj" -b "$cj" -o /dev/null "$callback"

  if ! grep -q 'SESSION' "$cj" 2>/dev/null; then
    rm -f "$cj"
    fail "Could not obtain SESSION cookie for ${username}"
  fi
  echo "$cj"
}

api() {
  local cj="$1"
  shift
  curl -s -b "$cj" "$@"
}

echo "=== NEXTU FileShare API verification ==="

# Health
health=$(curl -s "${BFF_URL}/actuator/health" | grep -o '"status":"UP"' || true)
[[ -n "$health" ]] && pass "BFF health" || fail "BFF health"

echo "--- Login alice ---"
ALICE_CJ=$(login alice)

me=$(api "$ALICE_CJ" "${BFF_URL}/api/me")
alice_id=$(echo "$me" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "")
[[ -n "$alice_id" ]] && pass "GET /api/me (alice) id=${alice_id}" || fail "GET /api/me (alice): $me"

users=$(api "$ALICE_CJ" "${BFF_URL}/api/users")
bob_id=$(echo "$users" | python3 -c "import sys,json; u=[x for x in json.load(sys.stdin) if x.get('username')=='bob']; print(u[0]['id'] if u else '')" 2>/dev/null || echo "")
[[ -n "$bob_id" ]] && pass "GET /api/users (bob id=${bob_id})" || fail "GET /api/users: $users"

list=$(api "$ALICE_CJ" "${BFF_URL}/api/files")
pass "GET /api/files (alice): $(echo "$list" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))' 2>/dev/null || echo 0) files"

shared=$(api "$ALICE_CJ" "${BFF_URL}/api/files/shared-with-me")
pass "GET /api/files/shared-with-me (alice)"

# Upload
TMPFILE=$(mktemp --suffix=.pdf 2>/dev/null || mktemp).pdf
printf '%%PDF-1.4 test content' > "$TMPFILE"
upload=$(api "$ALICE_CJ" -F "file=@${TMPFILE}" "${BFF_URL}/api/files")
file_id=$(echo "$upload" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")
[[ -n "$file_id" ]] && pass "POST /api/files upload id=${file_id}" || fail "POST /api/files: $upload"
rm -f "$TMPFILE"

# Share with bob
share=$(api "$ALICE_CJ" -H "Content-Type: application/json" \
  -d "{\"targetUserId\":\"${bob_id}\"}" \
  "${BFF_URL}/api/files/${file_id}/share")
share_ok=$(echo "$share" | python3 -c "import sys,json; d=json.load(sys.stdin); print('id' in d)" 2>/dev/null || echo "False")
[[ "$share_ok" == "True" ]] && pass "POST /api/files/${file_id}/share" || fail "POST /api/files/${file_id}/share: $share"

echo "--- Login bob ---"
BOB_CJ=$(login bob)

bob_shared=$(api "$BOB_CJ" "${BFF_URL}/api/files/shared-with-me")
bob_has=$(echo "$bob_shared" | python3 -c "import sys,json; ids=[x.get('id') for x in json.load(sys.stdin)]; print('${file_id}' in ids)" 2>/dev/null || echo "False")
[[ "$bob_has" == "True" ]] && pass "Bob sees shared file" || fail "Bob shared-with-me: $bob_shared"

bob_list=$(api "$BOB_CJ" "${BFF_URL}/api/files")
alice_private=$(echo "$bob_list" | python3 -c "import sys,json; ids=[x.get('id') for x in json.load(sys.stdin)]; print('${file_id}' in ids)" 2>/dev/null || echo "True")
[[ "$alice_private" == "False" ]] && pass "Bob cannot list alice private files" || fail "Bob list leaked alice file: $bob_list"

# Download as bob
dl_code=$(api "$BOB_CJ" -o /dev/null -w "%{http_code}" "${BFF_URL}/api/files/${file_id}/download")
[[ "$dl_code" == "200" ]] && pass "GET /api/files/${file_id}/download (bob)" || fail "Download bob: HTTP $dl_code"

# Revoke share
api "$ALICE_CJ" -X DELETE "${BFF_URL}/api/files/${file_id}/share/${bob_id}" > /dev/null
bob_shared2=$(api "$BOB_CJ" "${BFF_URL}/api/files/shared-with-me")
bob_still=$(echo "$bob_shared2" | python3 -c "import sys,json; ids=[x.get('id') for x in json.load(sys.stdin)]; print('${file_id}' in ids)" 2>/dev/null || echo "True")
[[ "$bob_still" == "False" ]] && pass "Revoke share — bob no longer sees file" || fail "Revoke failed: $bob_shared2"

dl_denied=$(api "$BOB_CJ" -o /dev/null -w "%{http_code}" "${BFF_URL}/api/files/${file_id}/download" || true)
[[ "$dl_denied" == "403" || "$dl_denied" == "404" ]] && pass "Bob denied download after revoke (HTTP $dl_denied)" || fail "Bob download after revoke: HTTP $dl_denied"

# Delete
del_code=$(api "$ALICE_CJ" -o /dev/null -w "%{http_code}" -X DELETE "${BFF_URL}/api/files/${file_id}")
[[ "$del_code" == "204" ]] && pass "DELETE /api/files/${file_id}" || fail "Delete: HTTP $del_code"

echo "--- Login admin ---"
ADMIN_CJ=$(login admin.smith)
admin_users=$(api "$ADMIN_CJ" "${BFF_URL}/api/admin/users")
admin_count=$(echo "$admin_users" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo 0)
[[ "$admin_count" -ge 3 ]] && pass "GET /api/admin/users (${admin_count} users)" || fail "Admin users: $admin_users"

# Non-admin denied
admin_denied=$(api "$ALICE_CJ" -o /dev/null -w "%{http_code}" "${BFF_URL}/api/admin/users")
[[ "$admin_denied" == "403" ]] && pass "Alice denied /api/admin/users (403)" || fail "Alice admin access: HTTP $admin_denied"

rm -f "$ALICE_CJ" "$BOB_CJ" "$ADMIN_CJ" 2>/dev/null || true
echo "=== All checks passed ==="
