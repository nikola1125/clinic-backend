# Load Tests (k6)

Real-life load tests for the MjekOn backend (`https://clinic-backend-1234.fly.dev`).

## Prerequisites

```bash
brew install k6
```

## The scripts

| Script | What it simulates | Load | Duration | Writes data? |
|---|---|---|---|---|
| `01-journeys.js` | Mixed realistic traffic: anonymous visitors browsing doctors + logged-in patient, doctor, and admin using their dashboards | 10 public + 8 authenticated VUs | ~2 min | No |
| `02-booking-flow.js` | Full patient lifecycle: register → browse → book appointment → open meeting → get signaling ticket → chat → logout | 4 VUs | ~1.5 min | **Yes** (throwaway patients + bookings against the isolated "ZZ LoadTest" doctor) |
| `03-websocket-storm.js` | Concurrent Socket.IO connections (notifications / signaling engine) | ramps to 250 concurrent sockets | ~2.5 min | No |
| `04-stress.js` | Breaking-point ladder on public endpoints: 5→120 req/s | up to 400 VUs | ~3 min | No |
| `05-stress-extreme.js` | Continues the ladder: 150→500 req/s | up to 1000 VUs | ~1 min | No |

## How to run

From `backend-nest/`:

```bash
# Read-only mixed journeys (full coverage needs the test-account creds):
k6 run \
  -e ADMIN_EMAIL=admin@clinic.com -e ADMIN_PASSWORD='<admin password>' \
  -e DOCTOR_EMAIL=loadtest-doctor@mjekon-test.com -e DOCTOR_PASSWORD='LoadTest123!' \
  -e PATIENT_EMAIL=loadtest-patient@mjekon-test.com -e PATIENT_PASSWORD='LoadTest123!' \
  load-tests/01-journeys.js

# The others need no credentials:
k6 run load-tests/02-booking-flow.js
k6 run load-tests/03-websocket-storm.js
k6 run load-tests/04-stress.js
k6 run load-tests/05-stress-extreme.js
```

Point at another environment with `-e BASE_URL=https://...`.

> **Important:** the backend rate-limits per IP (`RATE_LIMIT_PER_MINUTE`, currently 300).
> From a single test machine you will hit it quickly. For full-capacity runs,
> temporarily raise it: `fly secrets set RATE_LIMIT_PER_MINUTE=100000 --app clinic-backend-1234`
> and **restore it afterwards**: `fly secrets set RATE_LIMIT_PER_MINUTE=300 --app clinic-backend-1234`.

## How to read the output

k6 prints a summary at the end of each run:

- `checks_succeeded` — % of assertions that passed (every request is checked for the right status code). Want: 100%.
- `http_req_duration` — latency. `med` = typical, `p(95)` = the slow tail 5% of users see. Want p95 under ~500 ms.
- `http_req_failed` — error rate. Want ~0%.
- `✓ / ✗` per check — which specific endpoint failed, if any.
- Custom counters in `02`: `bookings_succeeded` and `bookings_conflict_409` (two virtual patients racing for the same slot — expected under concurrency, not a bug).
- In `03`: `ws_ns_connected` / `ws_ns_rejected` — how many sockets fully joined the namespace vs got kicked.

Add `--summary-export load-tests/results/<name>.json` to keep a machine-readable copy.
Watch the server side live in another terminal: `fly logs --app clinic-backend-1234`.

## Test accounts / fixtures (safe to delete anytime)

- Doctor: `loadtest-doctor@mjekon-test.com` / `LoadTest123!` — id `4efb1f5b-c144-4c98-a79c-349aa63e10dd` ("ZZ LoadTest Doctor")
- Consult: `73910aee-c2d0-491d-a517-04df6685b192` ("LoadTest Consult")
- Patient: `loadtest-patient@mjekon-test.com` / `LoadTest123!`
- `02` creates additional throwaway patients named `ZZ LoadTest …` with emails `zz-loadtest-…@mjekon-test.com` and pending appointments against the test doctor. They sort last alphabetically and are easy to spot in the admin panel.

## Results — 2026-07-05 (single Fly machine, shared-cpu-1x / 256 MB, Neon free, Upstash free)

| Test | Result |
|---|---|
| 01 journeys (18 VUs, all roles) | ✅ 2,208/2,208 checks, p95 238 ms |
| 02 booking E2E (4 VUs) | ✅ 100% checks, 26 bookings + 16 expected 409 races, p95 302 ms |
| 03 WebSockets | ✅ 832 connections, 0 rejected at 250 concurrent, connect p95 1.4 s |
| 04 stress to 120 req/s | ✅ 7,271 reqs, 0 errors, p95 246 ms |
| 05 extreme to ~500 req/s | ✅ 17,697 reqs, 0 errors, p95 358 ms — **no breaking point reached from one test machine** |

### What this means for capacity

Rule of thumb from measured numbers (~170 ms/req, 250+ req/s sustained):

- **Today (1 machine):** comfortably handles a small-to-regional clinic — hundreds of concurrent active users, 250 concurrent WebSocket clients proven (likely more).
- **~1,000 concurrent users:** scale Fly to 2–4 machines — but first the app needs multi-machine support for calls: a Socket.IO Redis adapter + room state in Redis (currently in-memory, which is why we run exactly 1 machine). Neon free tier's connection limit becomes the next constraint — add pgBouncer pooling (Neon has it built in) and upgrade the plan.
- **~10,000 concurrent:** dedicated Postgres (replicas), paid Upstash/Redis, several Fly machines behind Fly's proxy, and object storage (S3/R2) for documents. Video media itself stays on Metered's TURN infrastructure (paid tier) — your server only does signaling, which is the right architecture.
- **~100,000 concurrent:** separate the signaling service from the REST API, CDN in front (Cloudflare), DB cluster, and consider an SFU (LiveKit) if group calls ever appear. Not a today problem.

### Not covered (by design)

- **Real WebRTC media** — audio/video packets flow peer-to-peer or through Metered's TURN relays, never through this backend. Capacity there is Metered's SLA (free tier: 0.5 GB/month — upgrade before launch).
- **File uploads** — the API stores document URLs, not file bytes; there is no upload endpoint to stress yet.
- **Email delivery** — not configured in the backend.
