import * as Sentry from "@sentry/node";

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
