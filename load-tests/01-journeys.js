/**
 * k6 load test for the MjekOn backend (real-life read-only journeys).
 *
 * Run (basic — public browsing only):
 *   k6 run load-tests/api-load-test.js
 *
 * Run with authenticated journeys (any subset works):
 *   k6 run \
 *     -e ADMIN_EMAIL=admin@clinic.com -e ADMIN_PASSWORD='...' \
 *     -e DOCTOR_EMAIL=doc@example.com -e DOCTOR_PASSWORD='...' \
 *     -e PATIENT_EMAIL=pat@example.com -e PATIENT_PASSWORD='...' \
 *     load-tests/api-load-test.js
 *
 * Deliberately read-only: no bookings/registrations are created, so it is
 * safe against production data. Logins happen ONCE in setup() to stay under
 * the 60 req/min rate limit on /auth.
 */
import http from "k6/http";
import { check, sleep, group } from "k6";

const BASE = __ENV.BASE_URL || "https://clinic-backend-1234.fly.dev";
const JSON_HEADERS = { "Content-Type": "application/json" };

export const options = {
  scenarios: {
    public_browsing: {
      executor: "ramping-vus",
      exec: "publicBrowsing",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 },
        { duration: "1m", target: 10 },
        { duration: "15s", target: 0 },
      ],
    },
    patient_journey: {
      executor: "constant-vus",
      exec: "patientJourney",
      vus: 3,
      duration: "1m45s",
    },
    doctor_journey: {
      executor: "constant-vus",
      exec: "doctorJourney",
      vus: 3,
      duration: "1m45s",
    },
    admin_journey: {
      executor: "constant-vus",
      exec: "adminJourney",
      vus: 2,
      duration: "1m45s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"], // <2% errors overall
    "http_req_duration{journey:public}": ["p(95)<1000"],
    "http_req_duration{journey:patient}": ["p(95)<1200"],
    "http_req_duration{journey:doctor}": ["p(95)<1200"],
    "http_req_duration{journey:admin}": ["p(95)<1500"],
  },
};

function login(email, password) {
  if (!email || !password) return null;
  const res = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: JSON_HEADERS }
  );
  if (res.status !== 200 && res.status !== 201) {
    console.warn(`Login failed for ${email}: HTTP ${res.status}`);
    return null;
  }
  return res.json("access_token");
}

export function setup() {
  // One login per role for the whole run (rate limit friendly).
  const tokens = {
    patient: login(__ENV.PATIENT_EMAIL, __ENV.PATIENT_PASSWORD),
    doctor: login(__ENV.DOCTOR_EMAIL, __ENV.DOCTOR_PASSWORD),
    admin: login(__ENV.ADMIN_EMAIL, __ENV.ADMIN_PASSWORD),
  };

  // Grab a real doctor id for availability lookups.
  const docsRes = http.get(`${BASE}/public/doctors`);
  const doctors = docsRes.status === 200 ? docsRes.json() : [];
  const doctorId = doctors.length > 0 ? doctors[0].id : null;

  return { tokens, doctorId };
}

const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

function iso(d) {
  return d.toISOString().slice(0, 10);
}

/** Anonymous visitor browsing the public site. */
export function publicBrowsing(data) {
  const tag = { tags: { journey: "public" } };

  group("public", () => {
    const health = http.get(`${BASE}/health`, tag);
    check(health, { "health 200": (r) => r.status === 200 });

    const doctors = http.get(`${BASE}/public/doctors`, tag);
    check(doctors, { "doctors 200": (r) => r.status === 200 });

    const registry = http.get(`${BASE}/registry/doctors`, tag);
    check(registry, { "registry 200": (r) => r.status === 200 });

    if (data.doctorId) {
      const from = iso(new Date());
      const to = iso(new Date(Date.now() + 30 * 24 * 3600 * 1000));
      const avail = http.get(
        `${BASE}/public/doctors/${data.doctorId}/availability/dates?from=${from}&to=${to}`,
        tag
      );
      check(avail, { "availability 200": (r) => r.status === 200 });

      const consults = http.get(
        `${BASE}/public/doctors/${data.doctorId}/consults`,
        tag
      );
      check(consults, { "consults 200": (r) => r.status === 200 });
    }
  });

  sleep(Math.random() * 2 + 1); // 1-3s think time
}

/** Logged-in patient checking their dashboard. */
export function patientJourney(data) {
  const token = data.tokens.patient;
  if (!token) { sleep(5); return; }

  group("patient", () => {
    check(http.get(`${BASE}/patient/me`, { ...auth(token), tags: { journey: "patient" } }),
      { "me 200": (r) => r.status === 200 });
    check(http.get(`${BASE}/patient/appointments`, { ...auth(token), tags: { journey: "patient" } }),
      { "appointments 200": (r) => r.status === 200 });
    check(http.get(`${BASE}/patient/notifications`, { ...auth(token), tags: { journey: "patient" } }),
      { "notifications 200": (r) => r.status === 200 });
    check(http.get(`${BASE}/patient/prescriptions`, { ...auth(token), tags: { journey: "patient" } }),
      { "prescriptions 200": (r) => r.status === 200 });
  });

  sleep(Math.random() * 3 + 2); // 2-5s think time
}

/** Logged-in doctor working in the portal. */
export function doctorJourney(data) {
  const token = data.tokens.doctor;
  if (!token) { sleep(5); return; }

  group("doctor", () => {
    check(http.get(`${BASE}/doctor/profile`, { ...auth(token), tags: { journey: "doctor" } }),
      { "profile 200": (r) => r.status === 200 });
    check(http.get(`${BASE}/doctor/appointments`, { ...auth(token), tags: { journey: "doctor" } }),
      { "appointments 200": (r) => r.status === 200 });
    check(http.get(`${BASE}/doctor/patients`, { ...auth(token), tags: { journey: "doctor" } }),
      { "patients 200": (r) => r.status === 200 });
    check(http.get(`${BASE}/doctor/availability`, { ...auth(token), tags: { journey: "doctor" } }),
      { "availability 200": (r) => r.status === 200 });
  });

  sleep(Math.random() * 3 + 2);
}

/** Admin reviewing the HQ dashboard. */
export function adminJourney(data) {
  const token = data.tokens.admin;
  if (!token) { sleep(5); return; }

  group("admin", () => {
    check(http.get(`${BASE}/admin/stats`, { ...auth(token), tags: { journey: "admin" } }),
      { "stats 200": (r) => r.status === 200 });
    check(http.get(`${BASE}/admin/appointments`, { ...auth(token), tags: { journey: "admin" } }),
      { "appointments 200": (r) => r.status === 200 });
    check(http.get(`${BASE}/admin/doctors`, { ...auth(token), tags: { journey: "admin" } }),
      { "doctors 200": (r) => r.status === 200 });
    check(http.get(`${BASE}/admin/revenue`, { ...auth(token), tags: { journey: "admin" } }),
      { "revenue 200": (r) => r.status === 200 });
  });

  sleep(Math.random() * 4 + 3); // admins click slower
}
