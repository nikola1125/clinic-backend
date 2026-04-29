# Clinic Backend (FastAPI)

## What is included

- Keycloak-ready JWT validation (JWKS) with **dev bypass**
- Dual auth: Bearer JWT (users) + `X-API-Key` (service-to-service)
- PostgreSQL schema with Row-Level Security (RLS)
- Redis rate limiting
- Audit logging middleware (writes to `audit_log`)

## Run (Docker)

1. Start services:

```bash
docker compose up --build
```

2. API is on:

- `http://localhost:8000/health`
- `http://localhost:8000/me`

## Dev auth bypass

`docker-compose.yml` sets `DEV_BYPASS_AUTH=true`.

You can simulate doctor access by sending headers:

- `X-Dev-Role: doctor`
- `X-Dev-Doctor-Id: <uuid>`

Admin simulation:

- `X-Dev-Role: admin`

## Keycloak setup (later)

Set:

- `KEYCLOAK_ISSUER_URL` (realm issuer)
- `KEYCLOAK_JWKS_URL` (JWKS endpoint)

Then disable bypass:

- `DEV_BYPASS_AUTH=false`

## RLS notes

RLS policies depend on per-request settings:

- `app.current_doctor_id`
- `app.is_admin`

The API sets these via SQL `set_config()`.
