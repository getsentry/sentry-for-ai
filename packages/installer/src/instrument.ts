import * as Sentry from "@sentry/node";

// Call once at startup. When `enabled` is false (--no-telemetry or
// DO_NOT_TRACK=1) this is a no-op and the Sentry SDK is never loaded.
export function initTelemetry(enabled: boolean): void {
  if (!enabled) {
    return;
  }

  Sentry.init({
    dsn:
      process.env.SENTRY_DSN ??
      "https://229b213cf5670aeb117d4de56ba6814e@o1.ingest.us.sentry.io/4511570959335425",

    tracesSampleRate: 1.0,
  });

  process.on("SIGTERM", async () => {
    await Sentry.close(2000);
    process.exit(0);
  });
}
