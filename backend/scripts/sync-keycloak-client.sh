#!/usr/bin/env bash
# Sync gateway-client redirect URIs with local dev ports (5173 frontend, 8090 BFF).
# Run after Keycloak is healthy: ./scripts/sync-keycloak-client.sh

set -euo pipefail

CONTAINER="${KEYCLOAK_CONTAINER:-nextu-keycloak}"
REALM="${KEYCLOAK_REALM:-nextu-files}"
CLIENT_ID="${GATEWAY_CLIENT_ID:-gateway-client}"
ADMIN_USER="${KEYCLOAK_ADMIN:-admin}"
ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin}"
FRONTEND_ORIGIN="${FRONTEND_ORIGIN:-http://localhost:5173}"
BFF_ORIGIN="${BFF_ORIGIN:-http://localhost:8090}"

echo "Waiting for Keycloak in container ${CONTAINER}..."
for i in $(seq 1 30); do
  if docker exec "${CONTAINER}" curl -sf http://localhost:8080/realms/"${REALM}" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

docker exec "${CONTAINER}" /opt/keycloak/bin/kcadm.sh config credentials \
  --server http://localhost:8080 \
  --realm master \
  --user "${ADMIN_USER}" \
  --password "${ADMIN_PASSWORD}" >/dev/null

INTERNAL_ID=$(docker exec "${CONTAINER}" /opt/keycloak/bin/kcadm.sh get clients -r "${REALM}" \
  -q clientId="${CLIENT_ID}" --fields id --format csv --noquotes | tail -1)

if [[ -z "${INTERNAL_ID}" || "${INTERNAL_ID}" == "id" ]]; then
  echo "Client ${CLIENT_ID} not found in realm ${REALM}" >&2
  exit 1
fi

REDIRECT_URIS="[\"${FRONTEND_ORIGIN}/login/oauth2/code/keycloak\",\"${BFF_ORIGIN}/login/oauth2/code/keycloak\"]"
WEB_ORIGINS="[\"${FRONTEND_ORIGIN}\",\"${BFF_ORIGIN}\",\"+\"]"

docker exec "${CONTAINER}" /opt/keycloak/bin/kcadm.sh update "clients/${INTERNAL_ID}" -r "${REALM}" \
  -s "redirectUris=${REDIRECT_URIS}" \
  -s "webOrigins=${WEB_ORIGINS}"

echo "Updated ${CLIENT_ID} redirect URIs:"
docker exec "${CONTAINER}" /opt/keycloak/bin/kcadm.sh get "clients/${INTERNAL_ID}" -r "${REALM}" \
  --fields redirectUris,webOrigins
