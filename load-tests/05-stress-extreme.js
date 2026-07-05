/**
 * Extreme ladder — continues where 04 left off: 150 → 300 → 500 req/s.
 * Goal: find the actual breaking point of the single Fly machine.
 *
 * Run:  k6 run load-tests/05-stress-extreme.js
 */
import http from "k6/http";
import { check } from "k6";

const BASE = __ENV.BASE_URL || "https://clinic-backend-1234.fly.dev";

export const options = {
  scenarios: {
    extreme: {
      executor: "ramping-arrival-rate",
      startRate: 120,
      timeUnit: "1s",
      preAllocatedVUs: 200,
      maxVUs: 1000,
      stages: [
        { duration: "20s", target: 150 },
        { duration: "20s", target: 300 },
        { duration: "20s", target: 500 },
        { duration: "10s", target: 0 },
      ],
    },
  },
  thresholds: { http_req_failed: ["rate<0.9"] },
};

export default function () {
  if (Math.random() < 0.33) {
    check(http.get(`${BASE}/health`, { tags: { path: "health" } }),
      { "health ok": (r) => r.status === 200 });
  } else {
    check(http.get(`${BASE}/public/doctors`, { tags: { path: "doctors" } }),
      { "doctors ok": (r) => r.status === 200 });
  }
}
