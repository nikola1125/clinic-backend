# Clinic Backend - NestJS

NestJS rewrite of Python FastAPI backend.

## Setup

```bash
npm install
cp .env.example .env
# Configure DATABASE_URL, REDIS_URL, and other vars
```

## Run

```bash
npm run start:dev   # Development
npm run build       # Production build
npm run start       # Production
```

## Structure

- `src/config` - Configuration service
- `src/database` - TypeORM setup
- `src/entities` - Database models (User, Doctor, Patient, Appointment, etc.)
- `src/common` - Guards, decorators, middleware, services (Security, Redis, Storage)
- `src/modules` - API modules (Admin, Auth, Doctor, Patient, Public, Registry, Triage, WebSocket, Applications, Contact)

## API Endpoints

Matches Python backend:
- `/health` - Health check
- `/auth/*` - Authentication
- `/admin/*` - Admin operations
- `/doctor/*` - Doctor endpoints
- `/patient/*` - Patient endpoints
- `/public/*` - Public doctor listing
- `/registry/*` - Doctor registry
- `/api/triage` - Symptom triage
- `/api/applications/*` - Doctor/partner applications
- `/api/contact` - Contact form
- `/ws/*` - WebSocket for video meetings
