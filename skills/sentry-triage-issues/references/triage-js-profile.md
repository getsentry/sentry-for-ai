# Triage profile: JavaScript / browser / frontend

Platform-specific recognition patterns for triaging a JavaScript/browser/frontend Sentry project.
Apply these on top of the generic taxonomy in `SKILL.md`. Load when `PLATFORM_PROFILE=js` or the
project is clearly a JS/browser app.

## Contents

- Third-party-frame noise (libraries, extensions, wallets)
- Runtime / environment noise (browser APIs, network, proxy)
- Wrong-project / mis-routed (backend errors in a frontend project)
- React-internal nuance
- Negative criteria specific to JS

## Third-party-frame noise (category 4)

Top in-app frame is inside a dependency under `node_modules/`, a browser extension
(`chrome-extension://`), or an injected global — not our code.

- **Library internals:** top frame under `node_modules/<lib>/…` for libraries like `echarts`,
  `mobx`, `html2canvas`, `lodash`, or `react-dom` (only when the error is React-internal and not
  reached from our component with our state).
- **Extension / wallet globals:** `ReferenceError: Can't find variable: DarkReader`,
  `WeixinJSBridge`, `TypeError: undefined is not an object (evaluating 'window.ethereum.<prop>')`,
  `ReferenceError: html2canvas is not defined`.
- **Examples:**
  - `TypeError: Cannot set properties of null (setting 'innerHTML')` with top frame in
    `echarts/lib/component/tooltip/…`
  - `Error: [MobX] minified error nr: <N>`
- **Reason:** `Third-party library noise — <library>; not actionable in our code.`
- **Caution:** if the third-party frame is *reached from* our component code passing bad input
  (inspect the second frame), it may be our misuse — prefer `skip`.

## Runtime / environment noise (category 5)

Browser/OS behavior we cannot fix from our code.

- **Denied/blocked browser APIs:** `NotAllowedError` (clipboard, WebAuthn, permissions, 2FA),
  `OperationError: A request is already pending.`, `SecurityError: Blocked a frame … cross-origin`,
  `Failed to execute 'writeText' on 'Clipboard'`, `WebGL not supported`, `NotReadableError`,
  `NotSupportedError: … public key credentials`, `IndexedDB … Internal error opening backing store`.
- **Extension messaging:** `Could not establish connection. Receiving end does not exist.`,
  `A listener indicated an asynchronous response by returning true`,
  `Invalid call to runtime.sendMessage()`.
- **Network noise:** `TypeError: Failed to fetch (<host>)` where `<host>` is a third-party
  (analytics, ad/marketing, customer-internal host) — **not** a host we own.
- **Proxy interference:** `Error: 200 treated as error: …` or `JSON parse error` with an HTML body
  (`<!DOCTYPE html>` / proxy notice from McAfee, Forcepoint, Zscaler, Symantec).
- **Reason:** `Environment noise — <specific API/host>; not actionable from our code.`
- **Caution:** `Failed to fetch (<a host we own>)` could be a real outage — if multiple users in the
  last hour, mark `needs-human`.

## Wrong-project / mis-routed (category 3)

Backend errors reported into a frontend project via a shared/misconfigured DSN.

- **Signals:** title prefix `PrismaClientKnownRequestError`, `PrismaClientUnknownRequestError`,
  `HTTPException`, `AttributeError`, `ImportError`, `ProgrammingError`, or a `ZodError` with a
  Python-shaped stack; culprit looks like a dotted Python module path.
- **Reason:** `Wrong project — non-frontend error mis-routed (Prisma/Python).`

## React-internal nuance

- Archive only when the React error is clearly framework-internal and not in our component tree.
- **Never archive** React errors pointing at our components (`hydration mismatch`, render-time
  exceptions in our components, `useEffectEvent`), or `Error: Should not already be working.`
  recurring across many users — escalate as `needs-human`/`skip`.

## JS-specific negative criteria (reinforce: skip, don't archive)

- `ZodError` whose stack points into our schema validation — likely a real schema mismatch we own.
- React internal error pointing at our component tree.
- Any error whose top in-app frame is under our `app/`, `src/`, or `static/` paths.

## Example reasons (use this voice)

- `Third-party library noise — echarts tooltip; not actionable in our code.`
- `Environment noise — Clipboard writeText denied by user agent.`
- `Environment noise — Failed to fetch from api2.amplitude.com; third-party network.`
- `Customer-environment proxy interference — corporate proxy returned HTML for a JSON request.`
- `Browser extension noise — ReferenceError for extension-injected global (DarkReader).`
- `Wrong project — Prisma/Python error mis-routed to the frontend project.`
- `Single-event fluke — 1 event, 1 user, no recurrence in 30+ days.`
