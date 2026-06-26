# POC mitmproxy addon: intercept all *.sentry.io traffic and short-circuit it
# with a canned response, so the real Sentry MCP server talks to us instead of
# real Sentry. For the POC this just proves interception + logs what was caught;
# the per-task state logic (empty project list -> populated after create_project,
# etc.) will live in a task-supplied addon later.

import sys
from mitmproxy import http


def _log(msg: str) -> None:
    sys.stderr.write(f"[addon] {msg}\n")
    sys.stderr.flush()


def request(flow: http.HTTPFlow) -> None:
    host = flow.request.pretty_host
    if not host.endswith("sentry.io"):
        return

    _log(f"INTERCEPTED {flow.request.method} {flow.request.pretty_url}")

    path = flow.request.path

    # Minimal canned responses for the auth/orient probe so the MCP server
    # believes it is connected and authenticated.
    if path.rstrip("/").endswith("/api/0/organizations"):
        body = '[{"id":"1","slug":"demo-org","name":"Demo Org","links":{"regionUrl":"https://us.sentry.io"}}]'
    else:
        body = '{"intercepted":true,"host":"%s","path":"%s"}' % (host, path)

    flow.response = http.Response.make(
        200, body, {"Content-Type": "application/json"}
    )
