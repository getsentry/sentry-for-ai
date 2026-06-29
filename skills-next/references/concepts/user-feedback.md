# User Feedback — What & Why

## What it is

Qualitative reports from real users, linked to Sentry context — the surrounding error,
replay, trace, release, and user. It's the one signal that captures *what the human thinks
went wrong*, which the machine signals can't tell you.

## When to reach for it

- You want a "report a problem" path in your app that lands in Sentry with full context.
- You want to prompt for detail right after a crash, while the user remembers what happened.
- You're triaging UX issues where the symptom is subjective ("the page felt broken").

## The three mechanisms (pick by need)

- **Feedback widget** (browser) — an embeddable button/form, optional screenshot;
  auto-injectable. The good default for web apps where you want passive, always-available
  feedback.
- **`captureFeedback` API** (most SDKs) — programmatic; wire it into your own UI when you want
  control over when and how feedback is collected.
- **Crash-report modal** — prompts the user for detail *after* an error fires. Often the only
  practical option on backends/desktop where there's no persistent UI to host a widget, and
  the natural choice when feedback should be tied to a specific crash.

## Best practices

- **Route feedback somewhere actionable** (Slack / Jira / an alert) so it isn't a black hole
  no one reads.
- **Decide required fields and screenshots up front.** More required fields = fewer but
  richer submissions; fewer = more but noisier.
- **Respect privacy in screenshots** — they can capture whatever is on screen; apply the same
  masking discipline as replay.

## Pitfalls

- Collecting feedback with no downstream routing — it accumulates unseen.
- Requiring too much and suppressing submissions, or too little and getting "it's broken" with
  no detail.
- Screenshots leaking on-screen PII.

## Related

- [`session-replay.md`](session-replay.md) — feedback often pairs with a replay of the session.
- [`data-scrubbing.md`](data-scrubbing.md) — screenshots/fields can carry PII.
- [`search-query-language.md`](search-query-language.md) — user-feedback properties.
