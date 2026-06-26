# POC: real Sentry MCP server (stdio) + mitmproxy intercepting *.sentry.io.
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      bash curl ca-certificates iptables iproute2 python3 python3-venv \
    && rm -rf /var/lib/apt/lists/*

# mitmproxy in a venv (Debian's python is externally-managed; venv avoids PEP668).
RUN python3 -m venv /opt/mitmproxy && /opt/mitmproxy/bin/pip install --no-cache-dir mitmproxy
ENV PATH="/opt/mitmproxy/bin:${PATH}"

# Pre-bake the Sentry MCP server so runtime needs no registry access.
RUN npm install -g @sentry/mcp-server@latest

# Dedicated low-priv user to run mitmproxy, so its own upstream traffic can be
# excluded from the iptables REDIRECT (otherwise the proxy loops on itself).
RUN useradd -m -u 1500 mitm

# Generate the mitmproxy CA at build time (stable per image) and trust it both
# system-wide (curl et al.) and for Node (which ignores the system store).
RUN runuser -u mitm -- mitmdump --set confdir=/home/mitm/.mitmproxy >/tmp/cagen.log 2>&1 & \
    for i in $(seq 1 100); do [ -f /home/mitm/.mitmproxy/mitmproxy-ca-cert.pem ] && break; sleep 0.2; done; \
    pkill -f mitmdump || true; \
    cp /home/mitm/.mitmproxy/mitmproxy-ca-cert.pem /usr/local/share/ca-certificates/mitmproxy.crt && \
    update-ca-certificates
ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/mitmproxy.crt

COPY addon.py entrypoint.sh /app/
RUN chmod +x /app/entrypoint.sh
WORKDIR /app
ENTRYPOINT ["/app/entrypoint.sh"]
