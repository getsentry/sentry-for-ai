# User Feedback — What & Why

Qualitative reports from real users, linked to Sentry context — the surrounding error, replay, trace,
release, and user. The one signal that captures *what the human thinks went wrong*, which the machine
signals can't tell you.

## What a feedback entry is worth

Its value is the **linked context**, not the prose. A feedback entry carries a pivot to the moment it's
about: a widget submission attaches the user's replay (roughly the minute before they hit submit) and
the page URL; a crash-report submission links straight to the **issue**. So feedback is a way *into* the
machine signals from the human side — and it surfaces as its own issue category (`Feedback`) rather than
living in a separate silo.

## Setup essentials — three mechanisms

- **Feedback widget** (browser only) — an embeddable, auto-injectable button/form with an optional
  screenshot. The default for web.
- **`captureFeedback` API** — programmatic; the cross-platform path (mobile/desktop/backend) and when
  you want control over your own UI.
- **Crash-report modal** — prompts for detail right after an error fires; the practical option where
  there's no persistent UI to host a widget.

Decide required fields and screenshots up front (more fields = fewer but richer submissions), **route
feedback somewhere actionable** (Slack / Jira / an alert) so it isn't a black hole, and apply
replay-grade masking to screenshots — they capture whatever is on screen.

## Related

- [`session-replay.md`](session-replay.md)
- [`data-scrubbing.md`](data-scrubbing.md)
- [`search-query-language.md`](search-query-language.md) — user-feedback properties.
