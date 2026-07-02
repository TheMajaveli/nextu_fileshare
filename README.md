# NEXTU FileShare

## Présentation du projet

NEXTU-FileShare est une application web sécurisée de gestion et de partage de fichiers, développée dans le cadre des travaux de fin de cours N4 — NEXTU-LILLE.

Elle permet à chaque utilisateur de déposer, télécharger et partager des documents avec ses collaborateurs. Un administrateur peut en outre créer et supprimer des comptes utilisateurs. L'application repose sur une architecture microservices composée d'un Frontend React, d'une passerelle BFF Spring Cloud Gateway, d'un service de stockage Spring Boot, d'un serveur d'identité Keycloak, et d'une base de données PostgreSQL.

---

Secure online file management and sharing platform built for NEXTU-LILLE N4. Users can upload files, share them with colleagues, and manage access through role-based permissions.

## Features

- **Authentication** — OAuth2 login via Keycloak with session-based access through a Backend-for-Frontend (BFF) gateway
- **File management** — Upload, download, and delete files with server-side extension and size validation (25 MB limit)
- **Sharing** — Share files with other users and revoke access when needed
- **Administration** — Admin users can create and manage user accounts
- **Roles** — `USER` and `ADMIN` realm roles enforced on both frontend routes and backend endpoints

## Architecture

```
Browser (React + Vite :5173)
    │  session cookie (HttpOnly)
    ▼
bff-gateway (:8090)
    ├── /api/me, /api/users, /api/admin/users
    ├── OAuth2 login / logout
    └── /api/files/** → storage-service (:8081)
                              JWT + Postgres
```

| Component | Path | Port |
|-----------|------|------|
| Frontend | `frontend/` | 5173 |
| BFF Gateway | `backend/bff-gateway/` | 8090 |
| Storage API | `backend/storage-service/` | 8081 (internal) |
| Keycloak | `backend/keycloak/` | 8180 |
| Postgres | Docker | 5432 |

The browser talks **only** to the BFF gateway. The storage service is internal and never called directly from the client.

### Maven layout

Two **sibling** Spring Boot projects under `backend/` (`bff-gateway`, `storage-service`) — no parent POM. Each service builds and deploys independently.

## Prerequisites

- Docker & Docker Compose
- Node.js 18+ (frontend)
- Java 17+ and Maven 3.9+ (optional — only if running backend services outside Docker)

## Quick start

### 1. Start the backend stack

From the repository root:

```bash
docker compose up --build
```

Or from `backend/`:

```bash
cd backend && docker compose up --build
```

Wait until all services are healthy (~2–3 minutes on first build).

| URL | Description |
|-----|-------------|
| http://localhost:8090 | BFF Gateway (API + OAuth2) |
| http://localhost:8180 | Keycloak admin console |

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

### Demo accounts

| Username | Password | Role |
|----------|----------|------|
| `alice` | `password` | USER |
| `bob` | `password` | USER |
| `admin.smith` | `password` | ADMIN |

Keycloak admin console: http://localhost:8180/admin (`admin` / `admin`)

Self-registration is enabled on the `nextu-files` realm — new users receive the `USER` role automatically.

## curl examples

### 1. Login (browser redirect)

```bash
open "http://localhost:8090/oauth2/authorization/keycloak"
```

Log in as `alice` / `password`. On success you are redirected to the frontend and receive a session cookie (`SESSION`).

### 2. List files (requires session cookie)

After logging in via browser, copy the `SESSION` cookie from DevTools:

```bash
curl -s -b "SESSION=<your-session-cookie>" http://localhost:8090/api/files | jq
```

### 3. Upload a file

```bash
curl -s -b "SESSION=<cookie>" \
  -F "file=@./sample.pdf" \
  http://localhost:8090/api/files | jq
```

### 4. Share a file

```bash
curl -s -b "SESSION=<cookie>" \
  -H "Content-Type: application/json" \
  -d '{"targetUserId":"<bob-uuid-from-/api/users>"}' \
  http://localhost:8090/api/files/<file-id>/share | jq
```

### 5. Admin — create user (as admin.smith)

```bash
curl -s -b "SESSION=<admin-cookie>" \
  -H "Content-Type: application/json" \
  -d '{"username":"charlie","email":"charlie@nextu.fr","role":"USER"}' \
  http://localhost:8090/api/admin/users | jq
```

The response includes a one-time `temporaryPassword` field for the admin to share with the new user.

## Project structure

```
├── frontend/              React 19, Vite, TypeScript, Tailwind
│   └── src/
│       ├── pages/         Dashboard, login, admin
│       ├── services/      API and auth integration
│       └── types/         Shared TypeScript interfaces
├── backend/
│   ├── bff-gateway/       OAuth2 BFF, user directory, admin API
│   ├── storage-service/   File storage API, Postgres, Flyway
│   ├── keycloak/          Realm import (nextu-files)
│   ├── docker/            Postgres init scripts
│   └── docker-compose.yml
├── docker-compose.yml     Includes backend stack (run from root)
└── .env.example           Local dev port configuration
```

## Configuration

Copy `frontend/.env.example` to `frontend/.env` and adjust `VITE_KEYCLOAK_REGISTRATION_URL` if needed. Copy `.env.example` to `frontend/.env.local` and adjust ports if needed. The Vite dev server proxies `/api`, `/oauth2`, `/login/oauth2`, and `/logout` to the BFF gateway on port 8090.

After Keycloak starts, sync OAuth redirect URIs for local dev:

```bash
./backend/scripts/sync-keycloak-client.sh
```

Verify the full file API (list, upload, share, revoke, download, access control, admin) with:

```bash
./backend/scripts/verify-api.sh
```

Requires the Docker stack running; the frontend dev server is not required (OAuth callback is completed on the BFF at port 8090).

## Development

```bash
# Frontend type check
cd frontend && npm run lint

# Build frontend for production
cd frontend && npm run build

# Compile backend services (without Docker)
cd backend/bff-gateway && mvn -q -DskipTests compile
cd backend/storage-service && mvn -q -DskipTests compile
```

## Testing

Functional requirements are covered by unit tests (Java + Vitest) and the `verify-api.sh` end-to-end script.

| Req | Feature | Unit tests | E2E (`verify-api.sh`) |
|-----|---------|------------|------------------------|
| 1 | Create one or more files | `FileServiceTest` (multi-upload), `Dashboard.test.tsx` | Upload `doc-a.pdf` + `doc-b.pdf`, list count |
| 2 | Allowed types `{pdf,xlsx,xls,doc,docx,mp3,mp4}` | `FileServiceTest` (parameterized), `Dashboard.test.tsx` | Loop all extensions; reject `.txt` |
| 3 | Share files with another user | `FileServiceTest` (share/revoke), `Dashboard.test.tsx` | Share, revoke, bob denied share (403) |
| 4 | Owner can delete files | `FileServiceTest` (owner vs non-owner), `Dashboard.test.tsx` | Owner delete; bob denied delete (403) |
| 5 | Admin create/delete users | `KeycloakAdminServiceTest`, `AdminUsers.test.tsx` | Create, login, self-delete guard, delete |
| 6 | Self-registration | `registrationUrl.test.ts`, `Login.test.tsx` | Keycloak registration + `/api/me` + cleanup |

```bash
# Unit tests (no Docker) — run each block from the repository root
(cd backend/storage-service && mvn test)
(cd backend/bff-gateway && mvn test)
(cd frontend && npm test)

# End-to-end (Docker stack required, from repository root)
docker compose up -d
./backend/scripts/verify-api.sh   # waits up to ~2 min for BFF readiness
```

If `docker compose up` reports a container name conflict (`nextu-postgres` already exists), the stack is already running — run `./backend/scripts/verify-api.sh` directly, or stop the existing stack first with `docker compose down`.

See [backend/BACKEND.md](backend/BACKEND.md) for API reference, troubleshooting, and local dev without Docker.

## Two things to change in the frontend to go live

The React UI is already built. To connect it to this backend, only two configuration values need attention:

| Setting | Dev value | Notes |
|---------|-----------|-------|
| **Vite dev proxy target** | `http://localhost:8090` | In `frontend/vite.config.ts` — proxies `/api`, `/oauth2`, `/login/oauth2`, `/logout` |
| **Keycloak registration URL** | `http://localhost:8180/realms/nextu-files/protocol/openid-connect/registrations` | Set via `VITE_KEYCLOAK_REGISTRATION_URL` in `frontend/.env` — `Login.tsx` appends `client_id`, `redirect_uri`, and other OIDC params |

No component code or JSON field names need to change. `fetch(..., { credentials: 'include' })` is already set in `auth.ts` and `api.ts`.

## Self-registration (Req 6)

The login page includes a **S'inscrire** link pointing to `VITE_KEYCLOAK_REGISTRATION_URL` (see `frontend/.env.example`). User registration is enabled in the Keycloak realm. In production, update the env var to your public Keycloak base URL.

## License

Apache-2.0
