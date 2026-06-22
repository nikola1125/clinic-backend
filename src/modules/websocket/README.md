# WebSocket Module

Complete WebSocket/Socket.IO implementation for real-time video meeting signaling, chat, and TURN server integration.

## Architecture

Based on Python FastAPI implementation (`clinic-backend/app/routers/websocket.py`), ported to NestJS with Socket.IO.

## Files

### 1. `websocket.service.ts`
Core business logic for WebSocket operations:

- **`generateTicket()`** - Generate JWT ticket with 60s expiry for WebSocket auth
- **`verifyTicket()`** - Validate and consume single-use ticket
- **`getMeetContext()`** - Get appointment + meeting + doctor + patient details
- **`validateJoinWindow()`** - Check if user can join (15 min before, 120 min after scheduled time)
- **`endMeeting()`** - Mark meeting ended, update duration
- **`getTurnCredentials()`** - Generate TURN credentials in 3 modes:
  - **hmac**: Self-hosted coturn with time-limited credentials
  - **static**: External TURN provider with fixed credentials
  - **metered**: Metered.ca API integration with fallback to STUN
- **`saveChatMessage()`** - Save chat message to DB

### 2. `websocket.controller.ts`
REST API endpoints:

- **POST `/ws/ticket`** - Generate WebSocket ticket (requires auth)
- **POST `/ws/meetings/:appointmentId/end`** - End meeting
- **GET `/ws/meetings/:appointmentId/turn`** - Get TURN credentials

### 3. `websocket.gateway.ts`
Socket.IO gateway (`/meet` namespace):

#### Connection Flow
1. Client connects with `ticket` or `token` query param
2. Verify ticket and validate appointment access
3. Check join window (15 min before to 120 min after)
4. Evict stale same-role connection (prevents duplicate doctor/patient)
5. Join room and notify peers
6. If both doctor and patient present, mint fresh `session_id`

#### Room Management
- **Room** - Per-appointment signaling room
- **Peers** - Map of socketId -> role (doctor, patient, admin)
- **Session ID** - Unique ID per call session, regenerated when both peers rejoin

#### Message Handlers
- **`offer`** - WebRTC offer relay
- **`answer`** - WebRTC answer relay
- **`ice-candidate`** - ICE candidate relay
- **`chat`** - Chat message (text or image, saved to DB)
- **`ping/pong`** - Heartbeat

#### Events Emitted
- **`peer-joined`** - Peer joined room
- **`peer-left`** - Peer left room
- **`session-ready`** - Both doctor and patient present, includes `session_id`
- **`session-ended`** - One peer left, session terminated
- **`session-evicted`** - Replaced by newer connection for same role

### 4. `websocket.module.ts`
Module configuration with TypeORM entities and dependencies.

## Environment Variables

```bash
# Redis (required)
REDIS_URL=redis://localhost:6379

# Meeting join window
MEETING_SKIP_JOIN_WINDOW_CHECK=false
MEETING_JOIN_WINDOW_BEFORE_MINUTES=15
MEETING_JOIN_WINDOW_AFTER_MINUTES=120

# TURN mode (hmac, static, metered)
TURN_MODE=hmac

# TURN HMAC mode (self-hosted coturn)
TURN_SECRET=your-turn-secret
TURN_HOST=turn.example.com
TURN_PORT=3478
TURN_TLS_PORT=5349
TURN_TLS_ENABLED=true
TURN_REALM=example.com
TURN_TTL_SECONDS=86400

# TURN static mode
TURN_STATIC_USERNAME=username
TURN_STATIC_PASSWORD=password
TURN_STATIC_URIS=turn:turn.example.com:3478,turns:turn.example.com:5349

# TURN metered mode (Metered.ca)
TURN_METERED_SECRET_KEY=your-api-key
TURN_METERED_DOMAIN=example.metered.live
```

## Client Usage

### 1. Get Ticket
```typescript
const response = await fetch('/ws/ticket', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
const { ticket, ttl } = await response.json();
```

### 2. Connect to Socket
```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/meet', {
  query: { 
    ticket,
    appointmentId: 'uuid'
  }
});

socket.on('connect', () => console.log('Connected'));
socket.on('peer-joined', ({ role }) => console.log(`${role} joined`));
socket.on('session-ready', ({ session_id }) => {
  // Both peers present, start WebRTC
  initPeerConnection(session_id);
});
```

### 3. WebRTC Signaling
```typescript
// Send offer
socket.emit('offer', { sdp, session_id });

// Receive answer
socket.on('answer', ({ sdp, session_id, from_role }) => {
  peerConnection.setRemoteDescription(sdp);
});

// ICE candidates
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    socket.emit('ice-candidate', { candidate: event.candidate, session_id });
  }
};

socket.on('ice-candidate', ({ candidate, session_id }) => {
  peerConnection.addIceCandidate(candidate);
});
```

### 4. Chat
```typescript
// Send chat
socket.emit('chat', { text: 'Hello', imageUrl: 'https://...' });

// Receive chat
socket.on('chat', ({ from_role, text, imageUrl, message }) => {
  displayMessage(message);
});
```

### 5. TURN Credentials
```typescript
const turnResponse = await fetch(`/ws/meetings/${appointmentId}/turn`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { username, password, uris } = await turnResponse.json();

const peerConnection = new RTCPeerConnection({
  iceServers: [
    { urls: uris, username, credential: password }
  ]
});
```

## Security

- **Ticket-based auth**: Short-lived (60s) single-use tickets prevent JWT leakage in query strings
- **Role validation**: Only appointment participants (doctor/patient) can join
- **Time window**: Join only 15 min before to 120 min after scheduled time
- **Session isolation**: `session_id` prevents ICE/SDP leakage across calls
- **Input sanitization**: Text truncated to 5000 chars, URLs validated

## Database Schema

### meetings
- `appointment_id` - FK to appointments (unique)
- `status` - waiting, active, ended
- `started_at`, `ended_at`, `duration_seconds`
- `doctor_joined_at`, `patient_joined_at`

### chat_messages
- `appointment_id` - FK to appointments
- `sender` - doctor, patient
- `message` - text content (max 5000 chars)
- `image_url` - optional HTTPS image URL
- `created_at` - timestamp (part of PK)

## Testing

```bash
# Start server
npm run start:dev

# Connect from browser console
const socket = io('http://localhost:3000/meet', {
  query: { ticket: 'xxx', appointmentId: 'uuid' }
});
```
