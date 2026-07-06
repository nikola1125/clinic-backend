import * as Sentry from "@sentry/nestjs";

// Must be imported before any other module (see top of main.ts).
// With no SENTRY_DSN set, the SDK stays disabled — a complete no-op — so
// this is safe to ship before a Sentry project exists.
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    // Sample a fraction of requests for performance tracing; errors are
    // always captured regardless of this rate.
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"),
  });
}
