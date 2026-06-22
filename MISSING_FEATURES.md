# Missing Features from Python Backend

## Doctor Module - MISSING ENDPOINTS

### Notes Management
- `GET /doctor/patients/:id/notes` - List patient notes
- `POST /doctor/patients/:id/notes` - Create note
- `PATCH /doctor/patients/:id/notes/:noteId` - Update note
- `DELETE /doctor/patients/:id/notes/:noteId` - Delete note

### Prescriptions
- `GET /doctor/patients/:id/prescriptions` - List prescriptions
- `POST /doctor/patients/:id/prescriptions` - Create prescription
- `PATCH /doctor/patients/:id/prescriptions/:rxId/status` - Update status

### Medications
- `GET /doctor/patients/:id/medications` - List active medications
- `POST /doctor/patients/:id/medications` - Create medication
- `PATCH /doctor/patients/:id/medications/:medId/status` - Update status

### Diagnoses
- `GET /doctor/patients/:id/diagnoses` - List diagnoses
- `POST /doctor/patients/:id/diagnoses` - Create diagnosis

### Documents
- `GET /doctor/patients/:id/documents` - List documents
- `POST /doctor/patients/:id/documents` - Upload document

### Medical Profile
- `GET /doctor/patients/:id/medical-profile` - Get profile
- `PUT /doctor/patients/:id/medical-profile` - Update profile

### Timeline
- `GET /doctor/patients/:id/timeline` - Unified patient history

### Meetings
- `POST /doctor/meetings/:id/start` - Start meeting

### Links
- `POST /doctor/patients/:id/link` - Link patient
- `DELETE /doctor/patients/:id/link` - Unlink patient

### Availability (EXISTS but incomplete)
- `GET /doctor/availability` ✓
- `PUT /doctor/availability` ✓

### Core (EXISTS but incomplete)
- `GET /doctor/patients` ✓
- `GET /doctor/appointments` ✓
- `PATCH /doctor/appointments/:id/status` - MISSING
- `POST /doctor/appointments` - MISSING
- `GET /doctor/appointments/:id/chat` - MISSING
- `POST /doctor/appointments/:id/chat` - MISSING
- `GET /doctor/consults` ✓

## Admin Module - MISSING ENDPOINTS

- `GET /admin/doct` - List doctors (typo in Python, should fix)
- `POST /admin/doctors/:id/consults` - MISSING
- `GET /admin/doctors/:id/consults` - MISSING
- `PUT /admin/consults/:id` - MISSING
- `DELETE /admin/consults/:id` - MISSING
- Revenue query filters (year, month, day, doctor_id) - INCOMPLETE

## Patient Module - MISSING ENDPOINTS

- `GET /patient/appointments/:id` - Get single appointment
- `GET /patient/appointments/:id/chat` - Get chat messages
- `POST /patient/appointments/:id/chat` - Send chat message  
- `PATCH /patient/notifications/:id/read` - Mark notification read

## Public Module - MISSING ENDPOINTS

- `POST /public/appointments` - Book appointment (needs auth)
- `POST /public/patients` - Create patient profile

## WebSocket Module - COMPLETELY MISSING

- `POST /ws/ticket` - Generate WebSocket ticket
- `GET /ws/:appointmentId` - WebSocket connection
- `POST /meetings/:appointmentId/end` - End meeting
- `GET /meetings/:appointmentId/turn` - TURN credentials
- Full signaling relay logic
- Room management
- TURN credentials (hmac/static/metered modes)

## Services - MISSING/INCOMPLETE

### Storage Service
- ✓ `generateStorageKey`
- ✓ `generateSignedUrl`
- ✓ `verifySignedUrl`
- MISSING: S3 integration (only HMAC local mode exists)

### JWKS Service
- ✓ JWKS cache
- ✓ Key rotation handling
- ✓ ECC P-256 support

### Security Service
- ✓ bcrypt hash/verify
- ✓ JWT create/decode
- ✓ JWKS verification
- MISSING: Refresh token family tracking in Redis
- MISSING: Token blacklist

## Middleware - MISSING/INCOMPLETE

- ✓ Security headers
- ✓ Audit logging
- MISSING: Rate limiting (mentioned but not implemented)
- MISSING: Body size limit check
- MISSING: RLS bypass helpers (_set_admin_rls, _set_doctor_rls)

## Auth - MISSING

- Legacy auth endpoints (login, register, refresh) - EXISTS but incomplete
- Supabase sync endpoint - MISSING
- Supabase assign-role endpoint - MISSING
- Supabase create-staff endpoint - MISSING

## Other Missing

- Health check endpoint - MISSING
- `/files/:path` endpoint for signed URL serving - MISSING
- Admin seed on startup - EXISTS in main.ts
- Notification creation/broadcasting
- Chat image validation (allowed hosts)
- Meeting join window validation
- RLS (Row Level Security) context setting for PostgreSQL
