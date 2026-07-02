#!/usr/bin/env bash
# End-to-end API verification against the BFF (session cookie OAuth flow).
# Usage: ./backend/scripts/verify-api.sh
set -euo pipefail

BFF_URL="${BFF_URL:-http://localhost:8090}"
KEYCLOAK_BASE="${KEYCLOAK_BASE:-http://localhost:8180}"
REALM="${REALM:-nextu-files}"
PASS="${PASS:-password}"
VERIFY_SUFFIX="${VERIFY_SUFFIX:-verify-$(date +%s)}"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

pass() { echo -e "${GREEN}PASS${NC} $1"; }
fail() { echo -e "${RED}FAIL${NC} $1"; exit 1; }

parse_form_action() {
  echo "$1" | grep -o 'action="[^"]*"' | head -1 | sed 's/action="//;s/"$//' | sed 's/&amp;/\&/g'
}

normalize_callback() {
  local url="$1"
  url="${url//http:\/\/localhost:5173/${BFF_URL}}"
  echo "$url"
}

login_with_credentials() {
  local username="$1"
  local password="$2"
  local cj loc html action callback next_html next_action

  cj=$(mktemp)
  loc=$(curl -s -c "$cj" -b "$cj" -o /dev/null -w "%{redirect_url}" "${BFF_URL}/oauth2/authorization/keycloak")
  html=$(curl -s -c "$cj" -b "$cj" "$loc")
  action=$(parse_form_action "$html")

  callback=$(curl -s -c "$cj" -b "$cj" -X POST "$action" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "username=${username}" \
    --data-urlencode "password=${password}" \
    -o /dev/null -w "%{redirect_url}")

  callback=$(normalize_callback "$callback")
  next_html=$(curl -s -c "$cj" -b "$cj" -L "$callback")

  if echo "$next_html" | grep -qE 'name="password-new"|update-password|required-action'; then
    next_action=$(parse_form_action "$next_html")
    callback=$(curl -s -c "$cj" -b "$cj" -X POST "$next_action" \
      -H "Content-Type: application/x-www-form-urlencoded" \
      --data-urlencode "password-new=${PASS}" \
      --data-urlencode "password-confirm=${PASS}" \
      -o /dev/null -w "%{redirect_url}")
    callback=$(normalize_callback "$callback")
    curl -s -c "$cj" -b "$cj" -o /dev/null -L "$callback"
  else
    curl -s -c "$cj" -b "$cj" -o /dev/null -L "$callback"
  fi

  if ! grep -q 'SESSION' "$cj" 2>/dev/null; then
    rm -f "$cj"
    fail "Could not obtain SESSION cookie for ${username}"
  fi
  echo "$cj"
}

login() {
  login_with_credentials "$1" "$PASS"
}

register_user() {
  local username="$1"
  local email="$2"
  local cj loc html action callback

  cj=$(mktemp)

  # Registration must be initiated through the BFF's own OAuth2 client (registrationId
  # "keycloak-register", see application.yml) so Spring Security stores the state/nonce
  # needed to validate the callback — a hand-built link to Keycloak's registrations
  # endpoint bypasses that and the OAuth2 callback fails with "authorization_request_not_found".
  loc=$(curl -s -c "$cj" -b "$cj" -o /dev/null -w "%{redirect_url}" "${BFF_URL}/oauth2/authorization/keycloak-register")
  html=$(curl -s -c "$cj" -b "$cj" "$loc")
  action=$(parse_form_action "$html")

  callback=$(curl -s -c "$cj" -b "$cj" -X POST "$action" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "username=${username}" \
    --data-urlencode "email=${email}" \
    --data-urlencode "firstName=Verify" \
    --data-urlencode "lastName=User" \
    --data-urlencode "password=${PASS}" \
    --data-urlencode "password-confirm=${PASS}" \
    -o /dev/null -w "%{redirect_url}")

  callback=$(normalize_callback "$callback")
  curl -s -c "$cj" -b "$cj" -o /dev/null -L "$callback"

  if ! grep -q 'SESSION' "$cj" 2>/dev/null; then
    rm -f "$cj"
    fail "Could not obtain SESSION cookie after registration for ${username}"
  fi
  echo "$cj"
}

api() {
  local cj="$1"
  shift
  curl -s -b "$cj" "$@"
}

create_temp_file() {
  local ext="$1"
  local f
  f=$(mktemp)."${ext}"
  printf 'verify test content for .%s\n' "$ext" > "$f"
  echo "$f"
}

wait_for_bff_health() {
  local attempts="${VERIFY_HEALTH_ATTEMPTS:-60}"
  local delay="${VERIFY_HEALTH_DELAY_SEC:-2}"
  local i health

  for ((i = 1; i <= attempts; i++)); do
    health=$(curl -s "${BFF_URL}/actuator/health" 2>/dev/null | grep -o '"status":"UP"' || true)
    if [[ -n "$health" ]]; then
      return 0
    fi
    if (( i < attempts )); then
      sleep "$delay"
    fi
  done
  return 1
}

echo "=== NEXTU FileShare API verification ==="

wait_for_bff_health && pass "BFF health" || fail "BFF health (timed out waiting for ${BFF_URL}/actuator/health)"

echo "--- Login alice ---"
ALICE_CJ=$(login alice)

me=$(api "$ALICE_CJ" "${BFF_URL}/api/me")
alice_id=$(echo "$me" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "")
[[ -n "$alice_id" ]] && pass "GET /api/me (alice) id=${alice_id}" || fail "GET /api/me (alice): $me"

users=$(api "$ALICE_CJ" "${BFF_URL}/api/users")
bob_id=$(echo "$users" | python3 -c "import sys,json; u=[x for x in json.load(sys.stdin) if x.get('username')=='bob']; print(u[0]['id'] if u else '')" 2>/dev/null || echo "")
[[ -n "$bob_id" ]] && pass "GET /api/users (bob id=${bob_id})" || fail "GET /api/users: $users"

initial_count=$(api "$ALICE_CJ" "${BFF_URL}/api/files" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo 0)
pass "GET /api/files (alice): ${initial_count} files before uploads"

shared=$(api "$ALICE_CJ" "${BFF_URL}/api/files/shared-with-me")
pass "GET /api/files/shared-with-me (alice)"

echo "--- Req 1: multiple file uploads ---"
TMP_A=$(mktemp /tmp/doc-a.XXXXXX.pdf)
TMP_B=$(mktemp /tmp/doc-b.XXXXXX.pdf)
printf '%%PDF-1.4 doc-a' > "$TMP_A"
printf '%%PDF-1.4 doc-b' > "$TMP_B"

upload_a=$(api "$ALICE_CJ" -F "file=@${TMP_A}" "${BFF_URL}/api/files")
upload_b=$(api "$ALICE_CJ" -F "file=@${TMP_B}" "${BFF_URL}/api/files")
file_id_a=$(echo "$upload_a" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")
file_id_b=$(echo "$upload_b" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")
[[ -n "$file_id_a" && -n "$file_id_b" ]] && pass "POST /api/files x2 (ids=${file_id_a}, ${file_id_b})" || fail "Multi upload failed: $upload_a / $upload_b"

after_multi=$(api "$ALICE_CJ" "${BFF_URL}/api/files")
multi_ok=$(echo "$after_multi" | python3 -c "
import sys, json
files = json.load(sys.stdin)
ids = {f.get('id') for f in files}
expected = {'${file_id_a}', '${file_id_b}'}
print(len(files) >= ${initial_count} + 2 and expected.issubset(ids))
" 2>/dev/null || echo "False")
[[ "$multi_ok" == "True" ]] && pass "File list includes both uploaded files" || fail "Multi-upload list check: $after_multi"
rm -f "$TMP_A" "$TMP_B"

echo "--- Req 2: allowed extensions ---"
for ext in pdf xlsx xls doc docx mp3 mp4; do
  ext_file=$(create_temp_file "$ext")
  ext_resp=$(api "$ALICE_CJ" -F "file=@${ext_file}" "${BFF_URL}/api/files")
  ext_code=$(echo "$ext_resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('extension',''))" 2>/dev/null || echo "")
  [[ "$ext_code" == "$ext" ]] && pass "POST /api/files .${ext} accepted" || fail "Extension .${ext} failed: $ext_resp"
  rm -f "$ext_file"
done

txt_file=$(create_temp_file txt)
txt_body_file=$(mktemp)
txt_http=$(curl -s -b "$ALICE_CJ" -o "$txt_body_file" -w "%{http_code}" -F "file=@${txt_file}" "${BFF_URL}/api/files" || true)
txt_err=$(python3 -c "import json; print(json.load(open('${txt_body_file}')).get('error',''))" 2>/dev/null || echo "")
[[ "$txt_http" == "400" && "$txt_err" == "INVALID_FILE_TYPE" ]] && pass "POST /api/files .txt rejected (INVALID_FILE_TYPE)" || fail "txt rejection: HTTP $txt_http body=$(cat "$txt_body_file")"
rm -f "$txt_file" "$txt_body_file"

file_id="$file_id_a"

echo "--- Login bob ---"
BOB_CJ=$(login bob)

echo "--- Req 3: share access control ---"
bob_share_code=$(api "$BOB_CJ" -o /dev/null -w "%{http_code}" -H "Content-Type: application/json" \
  -d "{\"targetUserId\":\"${alice_id}\"}" \
  "${BFF_URL}/api/files/${file_id}/share" || true)
[[ "$bob_share_code" == "403" ]] && pass "Bob denied share on alice file (403)" || fail "Bob share on alice file: HTTP $bob_share_code"

share=$(api "$ALICE_CJ" -H "Content-Type: application/json" \
  -d "{\"targetUserId\":\"${bob_id}\"}" \
  "${BFF_URL}/api/files/${file_id}/share")
share_ok=$(echo "$share" | python3 -c "import sys,json; d=json.load(sys.stdin); print('id' in d)" 2>/dev/null || echo "False")
[[ "$share_ok" == "True" ]] && pass "POST /api/files/${file_id}/share" || fail "POST /api/files/${file_id}/share: $share"

bob_shared=$(api "$BOB_CJ" "${BFF_URL}/api/files/shared-with-me")
bob_has=$(echo "$bob_shared" | python3 -c "import sys,json; ids=[x.get('id') for x in json.load(sys.stdin)]; print('${file_id}' in ids)" 2>/dev/null || echo "False")
[[ "$bob_has" == "True" ]] && pass "Bob sees shared file" || fail "Bob shared-with-me: $bob_shared"

bob_list=$(api "$BOB_CJ" "${BFF_URL}/api/files")
alice_private=$(echo "$bob_list" | python3 -c "import sys,json; ids=[x.get('id') for x in json.load(sys.stdin)]; print('${file_id}' in ids)" 2>/dev/null || echo "True")
[[ "$alice_private" == "False" ]] && pass "Bob cannot list alice private files" || fail "Bob list leaked alice file: $bob_list"

dl_code=$(api "$BOB_CJ" -o /dev/null -w "%{http_code}" "${BFF_URL}/api/files/${file_id}/download")
[[ "$dl_code" == "200" ]] && pass "GET /api/files/${file_id}/download (bob)" || fail "Download bob: HTTP $dl_code"

echo "--- Req 4: delete access control ---"
bob_del_code=$(api "$BOB_CJ" -o /dev/null -w "%{http_code}" -X DELETE "${BFF_URL}/api/files/${file_id}" || true)
[[ "$bob_del_code" == "403" || "$bob_del_code" == "404" ]] && pass "Bob denied delete on alice file (HTTP $bob_del_code)" || fail "Bob delete on alice file: HTTP $bob_del_code"

api "$ALICE_CJ" -X DELETE "${BFF_URL}/api/files/${file_id}/share/${bob_id}" > /dev/null
bob_shared2=$(api "$BOB_CJ" "${BFF_URL}/api/files/shared-with-me")
bob_still=$(echo "$bob_shared2" | python3 -c "import sys,json; ids=[x.get('id') for x in json.load(sys.stdin)]; print('${file_id}' in ids)" 2>/dev/null || echo "True")
[[ "$bob_still" == "False" ]] && pass "Revoke share — bob no longer sees file" || fail "Revoke failed: $bob_shared2"

dl_denied=$(api "$BOB_CJ" -o /dev/null -w "%{http_code}" "${BFF_URL}/api/files/${file_id}/download" || true)
[[ "$dl_denied" == "403" || "$dl_denied" == "404" ]] && pass "Bob denied download after revoke (HTTP $dl_denied)" || fail "Bob download after revoke: HTTP $dl_denied"

del_code=$(api "$ALICE_CJ" -o /dev/null -w "%{http_code}" -X DELETE "${BFF_URL}/api/files/${file_id}")
[[ "$del_code" == "204" ]] && pass "DELETE /api/files/${file_id} (owner)" || fail "Delete: HTTP $del_code"

echo "--- Login admin ---"
ADMIN_CJ=$(login admin.smith)
admin_users=$(api "$ADMIN_CJ" "${BFF_URL}/api/admin/users")
admin_count=$(echo "$admin_users" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo 0)
[[ "$admin_count" -ge 3 ]] && pass "GET /api/admin/users (${admin_count} users)" || fail "Admin users: $admin_users"

admin_denied=$(api "$ALICE_CJ" -o /dev/null -w "%{http_code}" "${BFF_URL}/api/admin/users")
[[ "$admin_denied" == "403" ]] && pass "Alice denied /api/admin/users (403)" || fail "Alice admin access: HTTP $admin_denied"

echo "--- Req 5: admin create and delete user ---"
NEW_USER="${VERIFY_SUFFIX}"
NEW_EMAIL="${VERIFY_SUFFIX}@nextu.fr"
create_resp=$(api "$ADMIN_CJ" -H "Content-Type: application/json" \
  -d "{\"username\":\"${NEW_USER}\",\"email\":\"${NEW_EMAIL}\",\"role\":\"USER\"}" \
  "${BFF_URL}/api/admin/users")
new_user_id=$(echo "$create_resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")
temp_pass=$(echo "$create_resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('temporaryPassword',''))" 2>/dev/null || echo "")
[[ -n "$new_user_id" && -n "$temp_pass" ]] && pass "POST /api/admin/users id=${new_user_id}" || fail "Admin create user: $create_resp"

listed=$(api "$ADMIN_CJ" "${BFF_URL}/api/admin/users")
in_list=$(echo "$listed" | python3 -c "import sys,json; ids=[u.get('id') for u in json.load(sys.stdin)]; print('${new_user_id}' in ids)" 2>/dev/null || echo "False")
[[ "$in_list" == "True" ]] && pass "New user appears in admin directory" || fail "User not in list: $listed"

NEW_USER_CJ=$(login_with_credentials "$NEW_USER" "$temp_pass")
new_me=$(api "$NEW_USER_CJ" "${BFF_URL}/api/me")
new_username=$(echo "$new_me" | python3 -c "import sys,json; print(json.load(sys.stdin).get('username',''))" 2>/dev/null || echo "")
[[ "$new_username" == "$NEW_USER" ]] && pass "Admin-created user can login" || fail "New user /api/me: $new_me"
rm -f "$NEW_USER_CJ"

admin_me=$(api "$ADMIN_CJ" "${BFF_URL}/api/me")
admin_id=$(echo "$admin_me" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")
self_del_code=$(api "$ADMIN_CJ" -o /dev/null -w "%{http_code}" -X DELETE "${BFF_URL}/api/admin/users/${admin_id}" || true)
[[ "$self_del_code" == "400" ]] && pass "Admin cannot delete self (400)" || fail "Admin self-delete: HTTP $self_del_code"

del_user_code=$(api "$ADMIN_CJ" -o /dev/null -w "%{http_code}" -X DELETE "${BFF_URL}/api/admin/users/${new_user_id}" || true)
[[ "$del_user_code" == "204" ]] && pass "DELETE /api/admin/users/${new_user_id}" || fail "Admin delete user: HTTP $del_user_code"

gone=$(api "$ADMIN_CJ" "${BFF_URL}/api/admin/users")
still_there=$(echo "$gone" | python3 -c "import sys,json; ids=[u.get('id') for u in json.load(sys.stdin)]; print('${new_user_id}' in ids)" 2>/dev/null || echo "True")
[[ "$still_there" == "False" ]] && pass "Deleted user removed from directory" || fail "User still listed: $gone"

echo "--- Req 6: self-registration ---"
REG_USER="reg-${VERIFY_SUFFIX}"
REG_EMAIL="reg-${VERIFY_SUFFIX}@nextu.fr"
REG_CJ=$(register_user "$REG_USER" "$REG_EMAIL")

reg_me=$(api "$REG_CJ" "${BFF_URL}/api/me")
reg_username=$(echo "$reg_me" | python3 -c "import sys,json; print(json.load(sys.stdin).get('username',''))" 2>/dev/null || echo "")
reg_roles=$(echo "$reg_me" | python3 -c "import sys,json; print('USER' in json.load(sys.stdin).get('roles',[]))" 2>/dev/null || echo "False")
[[ "$reg_username" == "$REG_USER" && "$reg_roles" == "True" ]] && pass "Self-registered user /api/me (${REG_USER}, USER role)" || fail "Registration /api/me: $reg_me"
rm -f "$REG_CJ"

reg_user_id=$(api "$ADMIN_CJ" "${BFF_URL}/api/admin/users" | python3 -c "
import sys, json
users = json.load(sys.stdin)
match = [u for u in users if u.get('username') == '${REG_USER}']
print(match[0]['id'] if match else '')
" 2>/dev/null || echo "")
[[ -n "$reg_user_id" ]] && pass "Registered user visible to admin" || fail "Registered user not in admin list"

cleanup_code=$(api "$ADMIN_CJ" -o /dev/null -w "%{http_code}" -X DELETE "${BFF_URL}/api/admin/users/${reg_user_id}" || true)
[[ "$cleanup_code" == "204" ]] && pass "Admin cleanup of registered test user" || fail "Registration cleanup: HTTP $cleanup_code"

rm -f "$ALICE_CJ" "$BOB_CJ" "$ADMIN_CJ" 2>/dev/null || true
echo "=== All checks passed ==="
