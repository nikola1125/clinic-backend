/**
 * WebSocket concurrency test — holds many simultaneous Socket.IO connections
 * to the /notifications namespace (the same engine that powers live
 * notifications and call signaling).
 *
 * Ramps 0 → 100 → 250 concurrent connections. Each VU holds its socket open
 * for ~30s, answering Socket.IO pings, then reconnects.
 *
 * Run:
 *   k6 run load-tests/03-websocket-storm.js
 */
import ws from "k6/ws";
import http from "k6/http";
import { check } from "k6";
import { Counter, Trend } from "k6/metrics";

const BASE = __ENV.BASE_URL || "https://clinic-backend-1234.fly.dev";
const WS_BASE = BASE.replace("https://", "wss://");

const connected = new Counter("ws_ns_connected");
const rejected = new Counter("ws_ns_rejected");
const connectTime = new Trend("ws_connect_ms", true);

export const options = {
  scenarios: {
    ws_storm: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 100 },
        { duration: "1m", target: 250 },
        { duration: "30s", target: 250 },
        { duration: "15s", target: 0 },
      ],
      gracefulStop: "10s",
    },
  },
  thresholds: {
    ws_ns_rejected: ["count<20"],
    ws_connect_ms: ["p(95)<3000"],
  },
};

export function setup() {
  const res = http.post(`${BASE}/auth/login`, JSON.stringify({
    email: __ENV.PATIENT_EMAIL || "loadtest-patient@mjekon-test.com",
    password: __ENV.PATIENT_PASSWORD || "LoadTest123!",
  }), { headers: { "Content-Type": "application/json" } });
  if (res.status !== 200 && res.status !== 201) throw new Error(`login failed: ${res.status}`);
  return { token: res.json("access_token") };
}

export default function (data) {
  const url = `${WS_BASE}/socket.io/?EIO=4&transport=websocket`;
  const started = Date.now();

  const res = ws.connect(url, {}, (socket) => {
    let nsJoined = false;

    socket.on("open", () => {
      // engine.io will send "0{...handshake}" first; we reply in "message"
    });

    socket.on("message", (msg) => {
      if (msg.startsWith("0")) {
        // engine.io handshake done → join /notifications namespace with auth
        socket.send(`40/notifications,${JSON.stringify({ token: data.token })}`);
      } else if (msg.startsWith("40/notifications")) {
        nsJoined = true;
        connected.add(1);
        connectTime.add(Date.now() - started);
      } else if (msg.startsWith("44/notifications") || msg.startsWith("41/notifications")) {
        rejected.add(1); // namespace refused / server kicked us
        socket.close();
      } else if (msg === "2") {
        socket.send("3"); // engine.io ping → pong keeps us alive
      }
    });

    socket.setTimeout(() => {
      if (!nsJoined) rejected.add(1);
      socket.close();
    }, 30000); // hold the connection ~30s then recycle
  });

  check(res, { "ws 101 switching protocols": (r) => r && r.status === 101 });
}
