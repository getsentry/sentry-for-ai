---
name: sentry-otel-exporter-setup
description: Configure the OpenTelemetry Collector with Sentry Exporter for multi-project routing and automatic project creation. Use when setting up OTel with Sentry, configuring collector pipelines for traces and logs, or routing telemetry from multiple services to Sentry projects.
license: Apache-2.0
category: feature-setup
parent: sentry-feature-setup
disable-model-invocation: true
---

> [All Skills](../../SKILL_TREE.md) > [Feature Setup](../sentry-feature-setup/SKILL.md) > OTel Exporter

# Sentry OTel Exporter Setup

**Terminology**: Always capitalize "Sentry Exporter" when referring to the exporter component.

Configure the OpenTelemetry Collector to send traces and logs to Sentry using the Sentry Exporter.

## How this setup runs

Every step ends on a **recorded decision** — the user's answer, plus the concrete
path or version it produced. Later steps read those recorded values rather than
re-deriving them, so ask, wait for the answer, write it down, and only then move on.
Four values get recorded and reused throughout:

| Recorded value | Set in | Read by |
|---|---|---|
| Collector path (`otelcol-contrib` or `./otelcol-contrib`) and numeric version | Step 2 | Steps 6, 7 |
| Config file path (existing file or new `collector-config.yaml`) | Steps 1, 4 | Steps 6, 7 |
| Env file path | Step 5 | Steps 6, 7 |
| Auto-create-projects choice | Step 3 | Step 4 |

Copy this checklist to track your progress:

```
OTel Exporter Setup:
- [ ] Step 1: Check for existing configuration
- [ ] Step 2: Check collector version and install if needed
- [ ] Step 3: Configure project creation settings
- [ ] Step 4: Write collector config
- [ ] Step 5: Add environment variable placeholders
- [ ] Step 6: Validate the config and confirm readiness to run
- [ ] Step 7: Run the collector
- [ ] Step 8: Verify setup
- [ ] Step 9: Enable trace connectedness with OTLPIntegration (Python/Ruby/Node.js)
```

## Step 1: Check for Existing Configuration

Search for existing OpenTelemetry Collector configs by looking for YAML files containing `receivers:`. Also check for files named `otel-collector-config.*`, `collector-config.*`, or `otelcol.*`.

**If an existing config is found**: Ask the user which approach they want:
- **Modify existing config**: Add Sentry Exporter to the existing file (recommended to avoid duplicates)
- **Create separate config**: Keep existing config unchanged and create a new one for testing

**Record the config file path** their answer implies. The rest of the workflow depends on this decision.

**If no config exists**: Record `collector-config.yaml` as the config file path — you'll write the file itself in Step 4 — then proceed to Step 2.

## Step 2: Check Collector Version

The Sentry Exporter requires **otelcol-contrib v0.145.0 or later**.

### Check for existing collector

1. Run `which otelcol-contrib` to check if it's on PATH, or check for `./otelcol-contrib` in the project
2. If found, run the appropriate version command and parse the version number
3. **Record the collector path** (e.g., `otelcol-contrib` if on PATH, or `./otelcol-contrib` if local) and the **numeric version** you parsed (without the `v` prefix, e.g. `0.145.0`) for use in later steps

| Existing Version | Action |
|------------------|--------|
| ≥ 0.145.0 | Skip to Step 3 — existing collector is compatible |
| < 0.145.0 | Proceed with installation below |
| Not installed | Proceed with installation below |

### Installation

Ask the user how they want to run the collector:
- **Binary**: Download from GitHub releases. No Docker required.
- **Docker**: Run as a container. Requires Docker installed.

### Binary Installation

Fetch the latest release version from GitHub:
```bash
curl -s https://api.github.com/repos/open-telemetry/opentelemetry-collector-releases/releases/latest | grep '"tag_name"' | cut -d'"' -f4
```

**Important**: The GitHub API returns versions with a `v` prefix (e.g., `v0.145.0`). The download URL path requires the full tag with `v` prefix, but the filename and Docker tags use the numeric version without the prefix (e.g., `0.145.0`).

Detect the user's platform and download the binary:

1. Run `uname -s` and `uname -m` to detect OS and architecture
2. Map to release values:
   - Darwin + arm64 → `darwin_arm64`
   - Darwin + x86_64 → `darwin_amd64`
   - Linux + x86_64 → `linux_amd64`
   - Linux + aarch64 → `linux_arm64`
3. Download and extract:
```bash
curl -LO https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v<numeric_version>/otelcol-contrib_<numeric_version>_<os>_<arch>.tar.gz
tar -xzf otelcol-contrib_<numeric_version>_<os>_<arch>.tar.gz
chmod +x otelcol-contrib
```

Example: For version `v0.145.0`, the URL uses `v0.145.0` in the path but `0.145.0` in the filename.

Perform these steps for the user—do not just show them the commands.

4. **Ask the user** if they want to delete the downloaded tarball to save disk space (~50MB):
   - **Yes, delete it**: Remove the tarball
   - **No, keep it**: Leave the tarball in place

Delete it only on an explicit yes:
```bash
rm otelcol-contrib_<numeric_version>_<os>_<arch>.tar.gz
```

### Docker Installation

1. Verify Docker is installed by running `docker --version`
2. Fetch the latest release tag from GitHub (same as above)
3. Pull the image using the numeric version (without `v` prefix):
```bash
docker pull otel/opentelemetry-collector-contrib:<numeric_version>
```

Example: For GitHub tag `v0.145.0`, use `docker pull otel/opentelemetry-collector-contrib:0.145.0`.

The `docker run` command comes later in Step 7 after the config is created.

**Before leaving Step 2**, make sure both the collector path and the numeric
version are recorded — whether they came from an existing collector or from the
install you just performed. Steps 6 and 7 build their validate and `docker run`
commands from both values and have no other source for them.

## Step 3: Configure Sentry Project Creation

Ask the user whether to enable automatic Sentry project creation, and let them pick — present both options neutrally rather than recommending one:
- **Yes**: Projects created from service.name. Requires at least one team in your Sentry org. All new projects are assigned to the first team found. Initial data may be dropped during creation.
- **No**: Projects must exist in Sentry before telemetry arrives.

**If user chooses Yes**: Warn them that the exporter will scan all projects and use the first team it finds. All auto-created projects will be assigned to that team. If they don't have any teams yet, they should create one in Sentry first.

## Step 4: Write Collector Config

**Use the config file path recorded in Step 1** — if the user chose to modify an existing config, edit that file; otherwise create the file at the recorded path. If the path you actually wrote differs from the one recorded in Step 1, update the recorded value now: Steps 6 and 7 read it, and they have no other source for it.

Fetch the latest configuration from the Sentry Exporter documentation:

- **Example config** (use as template): `https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/exporter/sentryexporter/docs/example-config.yaml`
- **Full spec** (all available options): `https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/exporter/sentryexporter/docs/spec.md`

Use WebFetch to retrieve the example config as a starting template. Reference the spec if the user needs advanced options not shown in the example.

### If editing an existing config (per Step 1 decision)

Add the `sentry` exporter to the `exporters:` section and include it in the appropriate pipelines (`traces`, `logs`). Do not remove or modify other exporters unless the user requests it.

### If creating a new config (per Step 1 decision)

Create `collector-config.yaml` based on the fetched example. Ensure credentials use environment variable references (`${env:SENTRY_ORG_SLUG}`, `${env:SENTRY_AUTH_TOKEN}`).

If user chose auto-create in Step 3, add `auto_create_projects: true` to the sentry exporter.

### Add Debug Exporter (Recommended)

For troubleshooting during setup, add a `debug` exporter with `verbosity: detailed` to the pipelines. This logs all telemetry to console. Remove it once setup is verified.

## Step 5: Add Environment Variable Placeholders

The Sentry Exporter requires two environment variables. You write the **keys with placeholder values**; the user supplies the real credentials themselves.

**Say "placeholder" every time you mention this work**, so the user always knows no real credential is being written:

- "I'll add placeholder environment variables for you to fill in"
- "Adding placeholder values — you'll replace these with your actual credentials"
- "I'll set up the env var keys with placeholder values"

The one hard rule: the value you write is always a placeholder. A real token or org slug reaches the file only by the user's own hand.

Search for existing `.env` files in the project using glob `**/.env`. **Ask the user which file to use** — their answer decides it, not the file layout or which files happen to be open.

Present the discovered options:
- **[path to discovered .env file]**: Add to existing file (list each discovered path)
- **Create new at root**: Create .env in project root

**Record the env file path** they choose.

Add these placeholder values to the chosen file:

```bash
SENTRY_ORG_SLUG=your-org-slug
SENTRY_AUTH_TOKEN=your-token-here
```

After adding the placeholders, tell the user how to get their real values from Sentry:

1. **Sentry org slug**: In Sentry, go to **Settings → Organization Settings → Organization Slug**. This is also your subdomain (e.g., `myorg` in `https://myorg.sentry.io`)
2. **Sentry auth token**: Create an Internal Integration in Sentry:
   - In Sentry, go to **Settings → Developer Settings → Custom Integrations**
   - Click **Create New Integration** → Choose **Internal Integration**
   - Set permissions:
     - **Organization: Read** — required
     - **Project: Read** — required
     - **Project: Write** — required only if using `auto_create_projects`
   - Save, then click **Create New Token** and copy it

Ensure the chosen `.env` file is in `.gitignore`.

## Step 6: Validate the Config and Confirm Readiness

### Confirm the credentials are in place

Ask the user to confirm when they've updated the `.env` file:
- **Yes, credentials are set**: Continue to validation below
- **Not yet**: Wait, then ask again

Validation reads the real values, so it only runs once they confirm.

### Validate config

Validate using the method that matches the installation choice recorded in Step 2, against the config file path recorded in Steps 1 and 4 (the existing config you modified, or the new `collector-config.yaml` you wrote).

#### Binary validation

Use the collector path recorded in Step 2 (either `otelcol-contrib` if on PATH, or `./otelcol-contrib` if local).

**Load environment variables first**, then run validation:

```bash
set -a && source "<env_file>" && set +a && "<collector_path>" validate --config "<config_file>"
```

#### Docker validation

**Note**: Docker volume mounts require absolute paths. If `<config_file>` or `<env_file>` are relative paths, prefix them with `$(pwd)/`. If they're already absolute paths, use them directly.

```bash
docker run --rm \
  -v "<config_file>":/etc/otelcol-contrib/config.yaml \
  --env-file "<env_file>" \
  otel/opentelemetry-collector-contrib:<numeric_version> \
  validate --config /etc/otelcol-contrib/config.yaml
```

**If validation fails:** read the error, fix the config, and re-run validation until it passes.

**Completion criterion:** validation passes, and the user has answered whether they're ready to run the collector:
- **Yes, run it now**: Continue to Step 7
- **Not yet**: Wait — they may want to review the config or prepare their environment first

## Step 7: Run the Collector

**The user runs the collector themselves** — give them the command rather than executing it.

Build the command from the values recorded earlier: the collector path and numeric version from Step 2, the config file path from Steps 1 and 4, and the env file path from Step 5.

### Binary

**Load environment variables first**, then run the collector:

```bash
set -a && source "<env_file>" && set +a && "<collector_path>" --config "<config_file>"
```

### Docker

**Note**: Docker volume mounts require absolute paths. If `<config_file>` or `<env_file>` are relative paths, prefix them with `$(pwd)/`. If they're already absolute paths, use them directly.

**If re-running**: Stop and remove any existing container first:
```bash
docker stop otel-collector 2>/dev/null; docker rm otel-collector 2>/dev/null
```

```bash
docker run -d \
  --name otel-collector \
  -p 4317:4317 \
  -p 4318:4318 \
  -p 13133:13133 \
  -v "<config_file>":/etc/otelcol-contrib/config.yaml \
  --env-file "<env_file>" \
  otel/opentelemetry-collector-contrib:<numeric_version>
```

Use the same numeric version (without `v` prefix) that was pulled in Step 2.

After providing the command, tell the user to run it when they're ready, then proceed to Step 8 for verification.

## Step 8: Verify Setup

1. Check collector logs for successful startup (no errors about invalid config or failed connections)
2. Look for log messages indicating connection to Sentry
3. Send test telemetry from an instrumented service and verify it appears in Sentry

If using Docker, check logs with `docker logs otel-collector`.

**Completion criterion:** the collector starts clean, and a trace or log sent through it has been **seen in Sentry** — within about 60 seconds of sending. If nothing arrives, work the Troubleshooting table below; "check your Sentry dashboard" is not a finish line.

## Step 9: Enable Trace Connectedness with OTLPIntegration

If the user's application uses a Sentry SDK (Python, Ruby, or Node.js), recommend enabling the OTLPIntegration. This ensures **trace connectedness** — linking OTel traces to Sentry errors, logs, crons, and metrics — and sets up distributed tracing propagation automatically.

Without this step, traces sent through the collector appear in Sentry but are not connected to other Sentry events (errors, logs) from the same service.

Ask the user: **Does your application use the Sentry Python SDK, Sentry Ruby SDK, or Sentry Node.js SDK?**

- **Python**: Follow the Python setup below
- **Ruby**: Follow the Ruby setup below
- **Node.js**: Follow the Node.js setup below
- **Neither / Other SDK**: Skip this step. Trace connectedness via OTLPIntegration is currently available for Python, Ruby, and Node.js.

### Python OTLPIntegration

Docs: https://docs.sentry.io/platforms/python/integrations/otlp/

1. Install the extra:
```bash
pip install "sentry-sdk[opentelemetry-otlp]"
```

2. Add the `OTLPIntegration` to the existing `sentry_sdk.init()` call, setting `collector_url` to the collector's OTLP traces endpoint:
```python
from sentry_sdk.integrations.otlp import OTLPIntegration

sentry_sdk.init(
    dsn="___PUBLIC_DSN___",
    integrations=[
        OTLPIntegration(collector_url="http://localhost:4318/v1/traces"),
    ],
)
```

Use the collector's actual OTLP HTTP endpoint. The default is `http://localhost:4318/v1/traces` if running locally.

### Ruby OTLPIntegration

Docs: https://docs.sentry.io/platforms/ruby/integrations/otlp/

1. Add gems to the Gemfile:
```ruby
gem "sentry-opentelemetry"
gem "opentelemetry-sdk"
gem "opentelemetry-exporter-otlp"
gem "opentelemetry-instrumentation-all"
```

2. Run `bundle install`

3. Configure OpenTelemetry instrumentation:
```ruby
OpenTelemetry::SDK.configure do |c|
  c.use_all
end
```

4. Enable OTLP in the existing `Sentry.init` block, setting `collector_url` to the collector's OTLP traces endpoint:
```ruby
Sentry.init do |config|
  config.dsn = "___PUBLIC_DSN___"
  config.otlp.enabled = true
  config.otlp.collector_url = "http://localhost:4318/v1/traces"
end
```

Use the collector's actual OTLP HTTP endpoint. The default is `http://localhost:4318/v1/traces` if running locally.

### Node.js OTLPIntegration

Docs: https://docs.sentry.io/platforms/javascript/guides/node/

1. Install the lightweight Sentry SDK and OpenTelemetry dependencies:
```bash
npm install @sentry/node-core @opentelemetry/api @opentelemetry/sdk-trace-node @opentelemetry/sdk-trace-base
```

2. Create an instrument file (`instrument.mjs`) that sets up OTel and Sentry together:
```javascript
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import * as Sentry from '@sentry/node-core/light';
import { otlpIntegration } from '@sentry/node-core/light/otlp';

const provider = new NodeTracerProvider();
provider.register();

Sentry.init({
  dsn: '___PUBLIC_DSN___',
  integrations: [
    otlpIntegration({
      collectorUrl: 'http://localhost:4318/v1/traces',
    }),
  ],
});
```

3. Start your app with the `--import` flag:
```bash
node --import ./instrument.mjs app.mjs
```

Use the collector's actual OTLP HTTP endpoint. The default is `http://localhost:4318/v1/traces` if running locally.

> **Do not set `tracesSampleRate`** when using `otlpIntegration` — OTel controls sampling. Setting it would conflict with the OTLP path.

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| "failed to create project" | Missing Project:Write permission | Update Internal Integration permissions in Sentry |
| "no team found" | No teams in org | Create a team in Sentry before enabling auto-create |
| "invalid auth token" | Wrong token type or expired | Use Internal Integration token, not user auth token |
| "connection refused" on 4317/4318 | Collector not running or port conflict | Check collector logs and ensure ports are available |
| Validation fails with env var errors | .env file not loaded or placeholders not replaced | Ensure real credentials are in .env and the file is sourced |
| "container name already in use" | Previous container exists | Run `docker stop otel-collector && docker rm otel-collector` |
