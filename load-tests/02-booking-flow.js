/**
 * Full patient lifecycle, end to end (WRITES REAL DATA — uses isolated
 * "ZZ LoadTest" doctor + throwaway patients so production data stays clean):
 *
 *   register → browse doctors → check availability → book appointment
 *   → open meeting context → get signaling ticket → chat → logout
 *
 * Run:
 *   k6 run load-tests/02-booking-flow.js
 *
 * Booking collisions (409) are counted separately — under concurrency two
 * virtual patients WILL race for the same slot; that's realistic, not a bug.
 */
import http from "k6/http";
import { check, sleep, group } from "k6";
import { Counter } from "k6/metrics";

const BASE = __ENV.BASE_URL || "https://clinic-backend-1234.fly.dev";
const JSON_HEADERS = { "Content-Type": "application/json" };

// Isolated load-test entities (created 2026-07-05, safe to delete anytime)
const LT_DOCTOR_ID = "4efb1f5b-c144-4c98-a79c-349aa63e10dd";
const LT_CONSULT_ID = "73910aee-c2d0-491d-a517-04df6685b192";

const bookings = new Counter("bookings_succeeded");
const bookingConflicts = new Counter("bookings_conflict_409");

export const options = {
  scenarios: {
    patient_lifecycle: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "20s", target: 4 },
        { duration: "1m", target: 4 },
        { duration: "10s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<2000"],
    checks: ["rate>0.9"],
  },
};

const auth = (t) => ({ headers: { Authorization: `Bearer ${t}`, ...JSON_HEADERS } });

function randomSlot() {
  // random day 1-13 ahead (test doctor has 14 days of availability),
  // random 15-min slot between 08:00 and 19:45
  const days = 1 + Math.floor(Math.random() * 13);
  const d = new Date(Date.now() + days * 24 * 3600 * 1000);
  const date = d.toISOString().slice(0, 10);
  const slotIdx = Math.floor(Math.random() * 48);
  const totalMin = 8 * 60 + slotIdx * 15;
  const hh = String(Math.floor(totalMin / 60)).padStart(2, "0");
  const mm = String(totalMin % 60).padStart(2, "0");
  return new Date(`${date}T${hh}:${mm}:00Z`).toISOString();
}

// Register ONE throwaway patient for the whole run. Auth endpoints are
// rate-limited to 10/min/IP (by design — bcrypt is CPU-heavy), and all VUs
// share this machine's IP, so per-iteration registration would be blocked.
export function setup() {
  const uid = `setup-${Date.now()}`;
  const res = http.post(`${BASE}/auth/register`, JSON.stringify({
    email: `zz-loadtest-${uid}@mjekon-test.com`,
    password: "LoadTest123!",
    full_name: `ZZ LoadTest ${uid}`,
  }), { headers: JSON_HEADERS });
  if (res.status >= 400) throw new Error(`register failed: HTTP ${res.status}`);
  return { token: res.json("access_token"), patientId: res.json("patient_id") };
}

export default function (data) {
  const { token, patientId } = data;

  group("lifecycle", () => {
    sleep(1);

    group("browse", () => {
      check(http.get(`${BASE}/public/doctors`), { "doctors 200": (r) => r.status === 200 });
      const from = new Date().toISOString().slice(0, 10);
      const to = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      check(
        http.get(`${BASE}/public/doctors/${LT_DOCTOR_ID}/availability/dates?from=${from}&to=${to}`),
        { "availability 200": (r) => r.status === 200 }
      );
      check(http.get(`${BASE}/public/doctors/${LT_DOCTOR_ID}/consults`),
        { "consults 200": (r) => r.status === 200 });
    });
    sleep(1);

    let appointmentId = null;
    group("book", () => {
      const res2 = http.post(`${BASE}/public/appointments`, JSON.stringify({
        doctor_id: LT_DOCTOR_ID,
        patient_id: patientId,
        consult_id: LT_CONSULT_ID,
        scheduled_at: randomSlot(),
      }), {
        ...auth(token),
        // 409 = slot race between virtual patients; expected under load,
        // must not pollute the http_req_failed metric
        responseCallback: http.expectedStatuses(200, 201, 409),
      });
      if (res2.status === 409) {
        bookingConflicts.add(1); // two VUs raced for the slot — expected
      } else {
        check(res2, { "booking created": (r) => r.status === 200 || r.status === 201 });
        if (res2.status < 300) {
          bookings.add(1);
          appointmentId = res2.json("id");
        }
      }
    });
    sleep(1);

    if (appointmentId) {
      group("meeting", () => {
        check(http.get(`${BASE}/meet/context/${appointmentId}`, auth(token)),
          { "meet context 200": (r) => r.status === 200 });
        check(http.post(`${BASE}/ws/ticket`, null, auth(token)),
          { "ws ticket 200/201": (r) => r.status === 200 || r.status === 201 });
      });

      group("chat", () => {
        const res3 = http.post(
          `${BASE}/patient/appointments/${appointmentId}/chat`,
          JSON.stringify({ message: "Load test message" }),
          auth(token)
        );
        // pending appointments may legitimately refuse chat — only 5xx is a failure
        check(res3, { "chat not 5xx": (r) => r.status < 500 });
      });
      sleep(1);
    }

    group("dashboard", () => {
      // no logout here — the token is shared across iterations by design
      check(http.get(`${BASE}/patient/appointments`, auth(token)),
        { "my appointments 200": (r) => r.status === 200 });
    });
  });

  sleep(Math.random() * 2 + 1);
}
