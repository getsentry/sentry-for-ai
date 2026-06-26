#!/usr/bin/env bash
# POC verification: stand up mitmproxy + iptables, then prove that (1) curl,
# (2) Node fetch, and (3) the real Sentry MCP server all get their *.sentry.io
# traffic intercepted by mitmproxy.
set -uo pipefail

echo ">> iptables REDIRECT 443/80 -> mitmproxy:8080 (excluding mitm's own uid)..."
iptables -t nat -A OUTPUT -p tcp --dport 443 -m owner ! --uid-owner 1500 -j REDIRECT --to-ports 8080
iptables -t nat -A OUTPUT -p tcp --dport 80  -m owner ! --uid-owner 1500 -j REDIRECT --to-ports 8080

echo ">> starting mitmdump (transparent)..."
runuser -u mitm -- mitmdump --mode transparent --showhost \
  --set confdir=/home/mitm/.mitmproxy \
  -s /app/addon.py --listen-port 8080 >/tmp/mitm.log 2>&1 &

for _ in $(seq 1 50); do (exec 3<>/dev/tcp/127.0.0.1/8080) 2>/dev/null && { exec 3>&-; break; }; sleep 0.2; done
echo ">> mitmproxy listening on :8080"

echo; echo "=== VERIFY 1: curl https://sentry.io/api/0/organizations/ (system trust) ==="
curl -sS https://sentry.io/api/0/organizations/ && echo

echo; echo "=== VERIFY 2: node fetch (NODE_EXTRA_CA_CERTS) ==="
node -e 'fetch("https://sentry.io/api/0/organizations/").then(r=>r.text()).then(t=>console.log("node got:",t)).catch(e=>console.error("node ERR:",e.message))'

echo; echo "=== VERIFY 3: real Sentry MCP (fake token) calls find_organizations ==="
MCP_BIN="$(ls /usr/local/bin | grep -iE 'sentry|mcp' | head -1)"
echo "mcp bin: ${MCP_BIN:-<none found>}"
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"probe","version":"0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"find_organizations","arguments":{}}}' \
  | SENTRY_ACCESS_TOKEN=faketoken timeout 25 "/usr/local/bin/$MCP_BIN" --access-token=faketoken >/tmp/mcp.out 2>/tmp/mcp.err
echo "--- mcp stdout (truncated) ---"; head -c 1200 /tmp/mcp.out; echo
echo "--- mcp stderr (tail) ---"; tail -15 /tmp/mcp.err

echo; echo "=== mitmproxy log (intercepts) ==="
grep -i intercepted /tmp/mitm.log || { echo "(no intercepts logged) full log:"; cat /tmp/mitm.log; }
