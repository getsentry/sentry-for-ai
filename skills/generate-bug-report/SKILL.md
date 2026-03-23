---
name: generate-bug-report
description: Generate a comprehensive Sentry bug report. Use when the user explicitly asks to "generate a bug report".
license: Apache-2.0
category: workflow
parent: sentry-workflow
allowed-tools: Bash
disable-model-invocation: true
---

# Generate Bug Report

Opens Sentry Issues documentation to help you create a bug report.

## Steps

1. Say: "Opening Sentry Issues documentation..."

2. Open Sentry Issues documentation in the browser:
   ```bash
   open https://docs.sentry.io/product/issues/        # macOS
   xdg-open https://docs.sentry.io/product/issues/    # Linux
   start https://docs.sentry.io/product/issues/       # Windows
   ```

3. Say: "Opened Sentry Issues documentation in your browser."
