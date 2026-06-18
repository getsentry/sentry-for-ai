import type * as SentryNode from "@sentry/node";

type SentryInstance = typeof SentryNode | undefined;

// Resolves to the live Sentry module once initialized, or undefined when
// telemetry is disabled or the SDK fails to load. Exported so the command
// handler can explicitly capture and flush before exit rather than relying
// solely on global uncaughtException handlers.
let sentryReady: Promise<SentryInstance> = Promise.resolve(undefined);

// Kick off @sentry/node initialization in the background so its ~200ms OTel
// startup runs concurrently with CLI setup instead of blocking the banner.
// Important errors from the command execution path should go through
// captureAndFlush rather than relying only on the global handlers installed
// after this promise resolves.
export function initTelemetry(enabled: boolean): void {
  if (!enabled) {
    return;
  }

  sentryReady = import("@sentry/node")
    .then((Sentry) => {
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

      return Sentry as SentryInstance;
    })
    .catch(() => undefined);
}

// Capture an exception and flush pending events. Waits up to 2s for Sentry to
// finish initializing (handling the window where init is still in flight);
// silently no-ops when telemetry is disabled or the SDK failed to load.
export async function captureAndFlush(err: unknown): Promise<void> {
  const Sentry = await Promise.race([
    sentryReady,
    new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 2000)),
  ]);

  if (Sentry) {
    Sentry.captureException(err);
    await Sentry.flush(1000);
  }
}
