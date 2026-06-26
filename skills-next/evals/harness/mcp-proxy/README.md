# mcp-proxy — real Sentry MCP + mitmproxy interception (verified POC)

The plan for giving evals a Sentry MCP: run the **real** `@sentry/mcp-server`
over stdio inside the sandbox, but intercept its `*.sentry.io` API traffic with
**mitmproxy** and answer from a per-task Python addon. The agent exercises the
real MCP tool surface (real tool names, schemas, behavior); we only mock the
Sentry REST API beneath it, and that addon is where each task seeds responses
and state logic (e.g. `find_projects` empty until `create_project` is called).

This directory is a **standalone, verified proof-of-concept** — it is not yet
wired into the eval `run.sh`/`Dockerfile`.

## How it works

- **Routing:** transparent `iptables` REDIRECT sends outbound 443/80 to
  mitmproxy:8080 (excluding mitmproxy's own uid to avoid a loop). No per-app
  proxy config needed. Requires `--cap-add=NET_ADMIN`.
- **Cert trust:** mitmproxy's CA is generated at build and trusted both
  system-wide (`update-ca-certificates`) and by Node (`NODE_EXTRA_CA_CERTS` —
  Node ignores the system store).
- **Fake auth:** the MCP runs with `SENTRY_ACCESS_TOKEN=faketoken`, so it
  believes it's connected and makes real API calls (which we intercept).
- **Addon:** `addon.py` short-circuits `*.sentry.io` with canned JSON and logs
  every intercepted request.

## Run it

```bash
docker build -t mcp-proxy-poc .
docker run --rm --cap-add=NET_ADMIN mcp-proxy-poc
```

`entrypoint.sh` then verifies interception three ways: `curl`, a Node `fetch`,
and the real `sentry-mcp` server calling `find_organizations`.

## Verified

All three paths get intercepted. The MCP completes its `initialize` handshake
and `find_organizations` fans out to **two** endpoints, both caught:

```
[addon] INTERCEPTED GET https://sentry.io/api/0/organizations/
[addon] INTERCEPTED GET https://sentry.io/api/0/users/me/regions/
```

The POC stub returns an incomplete shape, so the MCP raises a ZodError
(`regions` required) — which confirms we're driving the *real* API client. The
next step is a complete, correctly-shaped default addon plus per-task seeding.

## Endpoint contracts learned so far

- `GET /api/0/organizations/` → list of orgs
- `GET /api/0/users/me/regions/` → `{ "regions": [...] }` (required by
  `find_organizations`)
- MCP bin name is `sentry-mcp`.
