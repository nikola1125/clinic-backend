/**
 * End-to-end call signaling test: a doctor peer and a patient peer join the
 * same appointment on the /meet namespace and BOTH must receive
 * "session-ready" (proof the Redis-backed room paired them).
 *
 * Run:  k6 run load-tests/06-meet-e2e.js
 * Pass: session_ready_received == 2, ws_meet_joined == 2
 */
import ws from "k6/ws";
import http from "k6/http";
import { check } from "k6";
import { Counter } from "k6/metrics";

const BASE = __ENV.BASE_URL || "https://clinic-backend-1234.fly.dev";
const WS_BASE = BASE.replace("https://", "wss://");
const JSON_HEADERS = { "Content-Type": "application/json" };

const LT_DOCTOR_ID = "4efb1f5b-c144-4c98-a79c-349aa63e10dd";
const LT_CONSULT_ID = "73910aee-c2d0-491d-a517-04df6685b192";

const joined = new Counter("ws_meet_joined");
const sessionReady = new Counter("session_ready_received");
const peerJoined = new Counter("peer_joined_received");

export const options = {
  scenarios: {
    doctor_peer: { executor: "per-vu-iterations", exec: "doctorPeer", vus: 1, iterations: 1 },
    patient_peer: { executor: "per-vu-iterations", exec: "patientPeer", vus: 1, iterations: 1 },
  },
  thresholds: {
    ws_meet_joined: ["count==2"],
    session_ready_received: ["count==2"],
  },
};

function post(url, body, token) {
  const headers = token
    ? { ...JSON_HEADERS, Authorization: `Bearer ${token}` }
    : JSON_HEADERS;
  return http.post(url, body ? JSON.stringify(body) : null, { headers });
}

export function setup() {
  // Doctor login
  const doc = post(`${BASE}/auth/login`, {
    email: "loadtest-doctor@mjekon-test.com",
    password: "LoadTest123!",
  });
  if (doc.status >= 300) throw new Error(`doctor login: ${doc.status}`);
  const docToken = doc.json("access_token");

  // Fresh throwaway patient
  const pat = post(`${BASE}/auth/register`, {
    email: `zz-loadtest-sig-${Date.now()}@mjekon-test.com`,
    password: "LoadTest123!",
    full_name: "ZZ LoadTest Signaling",
  });
  if (pat.status >= 300) throw new Error(`patient register: ${pat.status}`);
  const patToken = pat.json("access_token");
  const patientId = pat.json("patient_id");

  // Book an appointment tomorrow (retry a few slots on 409 races)
  const date = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
  let appointmentId = null;
  for (let i = 0; i < 5 && !appointmentId; i++) {
    const slotIdx = Math.floor(Math.random() * 48);
    const totalMin = 8 * 60 + slotIdx * 15;
    const hh = String(Math.floor(totalMin / 60)).padStart(2, "0");
    const mm = String(totalMin % 60).padStart(2, "0");
    const res = post(`${BASE}/public/appointments`, {
      doctor_id: LT_DOCTOR_ID,
      patient_id: patientId,
      consult_id: LT_CONSULT_ID,
      scheduled_at: new Date(`${date}T${hh}:${mm}:00Z`).toISOString(),
    }, patToken);
    if (res.status < 300) appointmentId = res.json("id");
  }
  if (!appointmentId) throw new Error("could not book test appointment");

  return { docToken, patToken, appointmentId };
}

function connectPeer(token, appointmentId, label) {
  // Fresh single-use ticket per connection
  const t = post(`${BASE}/ws/ticket`, null, token);
  check(t, { [`${label} ticket ok`]: (r) => r.status < 300 });
  const ticket = t.json("ticket");

  const url =
    `${WS_BASE}/socket.io/?EIO=4&transport=websocket` +
    `&ticket=${ticket}&appointmentId=${appointmentId}`;

  const res = ws.connect(url, {}, (socket) => {
    socket.on("message", (msg) => {
      if (msg.startsWith("0")) {
        socket.send("40/meet,"); // join the /meet namespace
      } else if (msg.startsWith("40/meet")) {
        joined.add(1);
      } else if (msg === "2") {
        socket.send("3"); // keepalive pong
      } else if (msg.includes('"session-ready"')) {
        sessionReady.add(1);
      } else if (msg.includes('"peer-joined"')) {
        peerJoined.add(1);
      }
    });
    socket.setTimeout(() => socket.close(), 20000); // overlap window
  });
  check(res, { [`${label} ws 101`]: (r) => r && r.status === 101 });
}

export function doctorPeer(data) {
  connectPeer(data.docToken, data.appointmentId, "doctor");
}

export function patientPeer(data) {
  connectPeer(data.patToken, data.appointmentId, "patient");
}
