# Auth Module - Supabase Integration & Refresh Token Family Tracking

## Overview
Complete authentication module with dual-mode support (Supabase or Legacy) and refresh token family tracking using Redis.

## Features

### 1. Supabase Mode Endpoints (when `SUPABASE_JWT_SECRET` is set)
- **POST /auth/sync** - Sync Supabase user to local DB after login
  - Input: `{ full_name, email, phone? }`
  - Creates or updates local user record linked to Supabase auth_user_id
  - Returns: `{ status: "synced", role: string }`

- **POST /auth/assign-role** - Admin assigns role to Supabase user
  - Input: `{ auth_user_id, role, doctor_id?, patient_id? }`
  - Requires: Admin role
  - Returns: `{ status: "role assigned", role: string }`

- **POST /auth/create-staff** - Admin creates doctor/admin via Supabase Admin API
  - Input: `{ email, password, role, name, specialty? }`
  - Requires: Admin role
  - Creates user in Supabase Auth + local DB
  - Returns: `{ message: string, user_id?: string }`

### 2. Legacy Mode Endpoints (when `SUPABASE_JWT_SECRET` is not set)
- **POST /auth/login** - Email/password login
  - Input: `{ email, password }`
  - Returns: TokenResponse with access_token and refresh_token

- **POST /auth/register** - User registration
  - Input: `{ email, password, full_name, phone? }`
  - Creates patient + user records
  - Returns: TokenResponse

- **POST /auth/refresh** - Refresh access token with refresh token family tracking
  - Input: `{ refresh_token }`
  - Validates refresh token family in Redis
  - Detects token reuse and revokes entire family
  - Returns: TokenResponse with new tokens

### 3. Shared Endpoints
- **POST /auth/logout** - Logout (token invalidation placeholder)

## Refresh Token Family Tracking

Implements refresh token rotation with reuse detection using Redis:

### How It Works
1. **Token Issuance**: Each refresh token includes:
   - `jti` (JWT ID): Unique identifier for this specific token
   - `family` (Family ID): Shared identifier across token rotations

2. **Redis Storage**:
   - Key: `rt:{jti}`
   - Value: `family_id`
   - TTL: JWT refresh expiration time

3. **Token Refresh Flow**:
   - Client sends refresh_token
   - Server decodes and extracts `jti` and `family`
   - Checks if `rt:{jti}` exists in Redis
   - If exists: Valid refresh → Delete old JTI, issue new tokens
   - If not exists: Token reuse detected → Revoke family

4. **Reuse Detection**:
   - If a token is used twice, the second use finds JTI missing
   - All tokens in that family become invalid
   - User must re-authenticate

### Security Benefits
- Prevents token replay attacks
- Automatic revocation on compromise detection
- Maintains session continuity for legitimate users
- No database queries needed for validation

## Environment Variables

```env
# Supabase Mode (optional)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# JWT Configuration
JWT_SECRET_KEY=your-secret-key
JWT_REFRESH_SECRET_KEY=your-refresh-secret (optional, defaults to JWT_SECRET_KEY)
JWT_EXPIRE_MINUTES=60
JWT_REFRESH_EXPIRE_MINUTES=10080  # 7 days

# Redis
REDIS_URL=redis://localhost:6379
```

## Implementation Details

### Token Generation
- Access tokens: Short-lived (60 min default), signed with JWT_SECRET_KEY
- Refresh tokens: Long-lived (7 days default), signed with JWT_REFRESH_SECRET_KEY
- Both include: `sub`, `role`, `doctor_id?`, `patient_id?`
- Refresh tokens also include: `jti`, `family`, `type: "refresh"`

### Database Schema
Users table includes:
- `auth_user_id`: Links to Supabase Auth user (nullable for legacy mode)
- `hashed_pw`: Password hash (nullable for Supabase mode)
- `role`: "admin" | "doctor" | "patient"
- `doctor_id`, `patient_id`: Foreign keys to profile tables

## Usage Examples

### Supabase Mode Flow
```typescript
// 1. User logs in via Supabase Auth SDK (frontend)
// 2. Frontend calls sync endpoint with Supabase JWT
POST /auth/sync
Authorization: Bearer {supabase_jwt}
Body: { full_name: "John Doe", email: "john@example.com" }

// 3. Admin assigns role
POST /auth/assign-role
Authorization: Bearer {admin_jwt}
Body: { auth_user_id: "uuid", role: "doctor", doctor_id: "uuid" }

// 4. Admin creates staff
POST /auth/create-staff
Authorization: Bearer {admin_jwt}
Body: { email: "doc@clinic.com", password: "secure", role: "doctor", name: "Dr. Smith", specialty: "Cardiology" }
```

### Legacy Mode Flow
```typescript
// 1. Register
POST /auth/register
Body: { email: "user@example.com", password: "secure123", full_name: "Jane Doe" }
Response: { access_token, refresh_token, role, ... }

// 2. Login
POST /auth/login
Body: { email: "user@example.com", password: "secure123" }
Response: { access_token, refresh_token, role, ... }

// 3. Refresh
POST /auth/refresh
Body: { refresh_token: "..." }
Response: { access_token, refresh_token, role, ... }
```

## Security Considerations

1. **Constant-time password comparison** prevents timing attacks
2. **Refresh token family tracking** prevents token reuse
3. **Supabase Admin API** for secure staff account creation
4. **Redis TTL** ensures expired tokens are automatically cleaned up
5. **Role-based access control** via guards and decorators
6. **JWT signature verification** for Supabase mode

## Testing

Ensure Redis is running before testing:
```bash
docker run -d -p 6379:6379 redis:alpine
```

Test refresh token family tracking:
```bash
# Get initial tokens
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# First refresh - should succeed
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"..."}'

# Second refresh with same token - should fail with "reuse detected"
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"..."}'
```
