# NEXTU FileShare

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
| Storage API | `backend/storage-service/` | 8081 |
| Keycloak | `backend/keycloak/` | 8180 |
| Postgres | Docker | 5432 |

The browser talks **only** to the BFF gateway. The storage service is internal and never called directly from the client.

## Prerequisites

- Docker & Docker Compose
- Node.js 18+ (frontend)
- Java 17+ and Maven 3.9+ (optional — only if running backend services outside Docker)

## Quick start

### 1. Start the backend stack

```bash
cd backend
docker compose up --build
```

Wait until all services are healthy (~2–3 minutes on first build).

| URL | Description |
|-----|-------------|
| http://localhost:8090 | BFF Gateway (API + OAuth2) |
| http://localhost:8180 | Keycloak admin console |
| http://localhost:8081 | Storage service (internal) |

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

Self-registration is enabled — new users receive the `USER` role automatically.

## Project structure

```
├── frontend/          React 19, Vite, TypeScript, Tailwind
│   └── src/
│       ├── pages/     Dashboard, login, admin
│       ├── services/  API and auth integration
│       └── types/     Shared TypeScript interfaces
├── backend/
│   ├── bff-gateway/       OAuth2 BFF, user directory, admin API
│   ├── storage-service/   File storage API, Postgres, Flyway
│   ├── keycloak/          Realm import (nextu-files)
│   ├── docker/            Postgres init scripts
│   └── docker-compose.yml
└── .env.example           Local dev port configuration
```

## Configuration

Copy `.env.example` to `frontend/.env.local` and adjust ports if needed. The Vite dev server proxies `/api`, `/oauth2`, `/login`, and `/logout` to the BFF gateway on port 8090.

After Keycloak starts, sync OAuth redirect URIs for local dev:

```bash
./backend/scripts/sync-keycloak-client.sh
```

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

## License

Apache-2.0
