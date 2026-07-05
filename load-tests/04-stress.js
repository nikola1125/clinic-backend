/**
 * Breaking-point stress test — steadily increases request rate on the two
 * hottest public paths (/health = app only, /public/doctors = app + DB)
 * until latency degrades or errors appear. Answers "when does it fail?"
 * rather than "does it handle N?".
 *
 * Rate ladder: 5 → 10 → 20 → 40 → 80 → 120 req/s (30s each, ~3min total).
 *
 * Run:
 *   k6 run load-tests/04-stress.js
 *
 * Read the results per stage: the breaking point is where
 * http_req_duration p(95) explodes or http_req_failed climbs.
 */
import http from "k6/http";
import { check } from "k6";

const BASE = __ENV.BASE_URL || "https://clinic-backend-1234.fly.dev";

export const options = {
  scenarios: {
    ladder: {
      executor: "ramping-arrival-rate",
      startRate: 5,
      timeUnit: "1s",
      preAllocatedVUs: 50,
      maxVUs: 400,
      stages: [
        { duration: "30s", target: 10 },
        { duration: "30s", target: 20 },
        { duration: "30s", target: 40 },
        { duration: "30s", target: 80 },
        { duration: "30s", target: 120 },
        { duration: "15s", target: 0 },
      ],
    },
  },
  thresholds: {
    // deliberately loose — we WANT to see where it breaks, not abort early
    http_req_failed: ["rate<0.5"],
  },
};

export default function () {
  // ~1/3 of traffic is app-only, ~2/3 hits the database
  if (Math.random() < 0.33) {
    check(http.get(`${BASE}/health`, { tags: { path: "health" } }),
      { "health ok": (r) => r.status === 200 });
  } else {
    check(http.get(`${BASE}/public/doctors`, { tags: { path: "doctors" } }),
      { "doctors ok": (r) => r.status === 200 });
  }
}
