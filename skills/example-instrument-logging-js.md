---
name: add-sentry-logging
description: Adds Sentry logging to an application following the best practices outlined in [sentry-concepts/references/logging.md](sentry-concepts/references/logging.md).
---

# Add Sentry Logging

This skill adds structured logs to an application following the practices outlined in
[sentry-concepts/references/logging.md](sentry-concepts/references/logging.md).

The goal is to give users a useful real-world starting point: a small set of
high-signal logs that demonstrate where, what, and how to instrument their app.

## When to use

When assisting users to:

* Set up logging in their project.
* Add Sentry logging to an existing project.
* Improve or expand existing application logs.

## Prerequisites

The repository should already have basic Sentry configuration.

Provide the user with the option to set up Sentry using [skills](./) if it is
not already configured.

## Steps

1. Read [sentry-concepts/references/logging.md](sentry-concepts/references/logging.md).
2. Analyze the codebase and identify its language or languages.
3. For each application area, read the corresponding language-specific skill in
   [skills](./) and confirm that Sentry logging is configured.
4. Identify high-value places to add logs. Prefer:
   * Important runtime decisions.
   * Algorithm or workflow progress.
   * Audit and forensic events.
   * Context around recoverable or non-critical failures.
5. Add structured log lines using:
   * The guidance in [sentry-concepts/references/logging.md](sentry-concepts/references/logging.md).
   * The syntax and conventions from the relevant language-specific skill.
   * The Instrumentation Guidance section below.

## Instrumentation guidance

Prioritize quality over quantity.

Add logs that are immediately useful for debugging real production behavior.
Avoid sprinkling shallow logs across many files just to increase coverage.

When choosing where to instrument:

* Prefer a few well-chosen files over many lightly touched files.
* Prefer complete examples over partial ones.
* Once you add logs for a workflow, entity, or algorithm, make the instrumentation
  reasonably comprehensive.
* Avoid logging every function call or every branch.
* Avoid sensitive data, large blobs, raw request bodies, tokens, passwords, and
  unnecessary PII.
* Use structured fields with consistent names.
* Include enough context to debug without redeploying the application.
* Take all the advice in [sentry-concepts/references/logging.md](sentry-concepts/references/logging.md) seriously:
    * The type of context to log.
    * What to avoid logging.
    * When to avoid logs alltogether, as other telemetry is better suited.

For a small codebase, aim to add enough high-value logs that the user can use
the result as a practical model for future instrumentation.

For large codebases, focus on a few high-value, illustrative locations rather
than trying to instrument everything.
