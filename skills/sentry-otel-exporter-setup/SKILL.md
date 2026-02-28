---
name: sentry-otel-exporter-setup
description: Configure the OpenTelemetry Collector with Sentry Exporter for multi-project routing and automatic project creation. Use when setting up OTel with Sentry, configuring collector pipelines for traces and logs, or routing telemetry from multiple services to Sentry projects.
license: Apache-2.0
---

# Sentry OTel Exporter Setup

**Terminology**: Always capitalize "Sentry Exporter" when referring to the exporter component.

Configure the OpenTelemetry Collector to send traces and logs to Sentry using the Sentry Exporter.

## Setup Overview

Copy this checklist to track your progress:

```
OTel Exporter Setup:
- [ ] Step 1: Check for existing configuration
- [ ] Step 2: Check collector version and install if needed
- [ ] Step 3: Configure project creation settings
- [ ] Step 4: Write collector config
- [ ] Step 5: Add environment variable placeholders
- [ ] Step 6: Run the collector
- [ ] Step 7: Verify setup
```

## Step 1: Check for Existing Configuration

Search for existing OpenTelemetry Collector configs by looking for YAML files containing `receivers:`. Also check for files named `otel-collector-config.*`, `collector-config.*`, or `otelcol.*`.

**If an existing config is found**: Ask the user which approach they want:
- **Modify existing config**: Add Sentry Exporter to the existing file (recommended to avoid duplicates)
- **Create separate config**: Keep existing config unchanged and create a new one for testing

**Wait for the user's answer and record their choice before proceeding to Step 2.** The rest of the workflow depends on this decision.

**If no config exists**: Note that you'll create a new `collector-config.yaml` in Step 4, then proceed to Step 2.

## Step 2: Check Collector Version

The Sentry Exporter requires **otelcol-contrib v0.145.0 or later**.

### Check for existing collector

1. Run `which otelcol-contrib` to check if it's on PATH, or check for `./otelcol-contrib` in the project
2. If found, run the appropriate version command and parse the version number
3. **Record the collector path** (e.g., `otelcol-contrib` if on PATH, or `./otelcol-contrib` if local) for use in later steps

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

**Wait for the user's response.** Only delete if they explicitly choose to:
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

The `docker run` command comes later in Step 6 after the config is created.

## Step 3: Configure Sentry Project Creation

Ask the user whether to enable automatic Sentry project creation. Do not recommend either option:
- **Yes**: Projects created from service.name. Requires at least one team in your Sentry org. All new projects are assigned to the first team found. Initial data may be dropped during creation.
- **No**: Projects must exist in Sentry before telemetry arrives.

**Wait for the user's answer before proceeding to Step 4.**

**If user chooses Yes**: Warn them that the exporter will scan all projects and use the first team it finds. All auto-created projects will be assigned to that team. If they don't have any teams yet, they should create one in Sentry first.

## Step 4: Write Collector Config

**Use the decision from Step 1** - if the user chose to modify an existing config, edit that file. If they chose to create a separate config, create a new file. **Record the config file path** for use in Steps 5 and 6.

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

The Sentry Exporter requires two environment variables. You will add placeholder values that the user fills in themselves—never actual credentials.

**Language constraint**: NEVER say "add credentials", "add environment variables", or "add the token" without explicitly stating these are **placeholders**. Always clarify the user fills them in later.

DO NOT say:
- "Let me add the environment variables"
- "I'll add the credentials to your .env"
- "Adding the Sentry auth token"

SAY INSTEAD:
- "I'll add placeholder environment variables for you to fill in"
- "Adding placeholder values—you'll replace these with your actual credentials"
- "I'll set up the env var keys with placeholder values"

Search for existing `.env` files in the project using glob `**/.env`. **Always ask the user which file to use**—do not infer from context or guess based on open files.

Present the discovered options:
- **[path to discovered .env file]**: Add to existing file (list each discovered path)
- **Create new at root**: Create .env in project root

**Wait for the user's explicit selection.** Do not proceed until they choose. Record the env file path for use in Steps 5 (validation) and 6 (running).

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

### Wait for user to set credentials

After explaining how to get the values, ask the user to confirm when they've updated the `.env` file:
- **Yes, credentials are set**: Proceed to validate and run the collector
- **Not yet**: I'll wait while you update the .env file

If user selects "Not yet", wait and ask again. Do not proceed to Step 6 until credentials are confirmed.

### Validate config

Once credentials are set, validate the configuration using the appropriate method based on the installation choice from Step 2.

**Use the config file path from Step 1** (either the existing config you modified or the new `collector-config.yaml`).

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
  -v "<absolute_config_path>":/etc/otelcol-contrib/config.yaml \
  --env-file "<env_file>" \
  otel/opentelemetry-collector-contrib:<numeric_version> \
  validate --config /etc/otelcol-contrib/config.yaml
```

Use the `.env` file path chosen in Step 5.

**If validation fails:**
1. Review the error message carefully
2. Fix the issues in the config file
3. Run validation again
4. Repeat until validation passes

**Once validation passes**, ask the user if they're ready to run the collector:
- **Yes, run it now**: Proceed to Step 6 and start the collector
- **Not yet**: Wait. The user may want to review the config or prepare their environment first.

**Wait for the user's confirmation before proceeding to Step 6.**

## Step 6: Run the Collector

**Only reach this step after the user confirms they're ready to run the collector.**

**Give the user the run command but do not execute it automatically.** The user will run it themselves.

Provide the appropriate command based on the installation method chosen in Step 2.

**Use the actual paths chosen earlier:**
- **Config file**: From Step 1 (existing config or new `collector-config.yaml`)
- **Env file**: From Step 5 (the `.env` file the user selected)
- **Collector path**: From Step 2 (either `otelcol-contrib` if on PATH, or `./otelcol-contrib` if local)

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
  -v "<absolute_config_path>":/etc/otelcol-contrib/config.yaml \
  --env-file "<env_file>" \
  otel/opentelemetry-collector-contrib:<numeric_version>
```

Use the same numeric version (without `v` prefix) that was pulled in Step 2.

After providing the command, tell the user to run it when they're ready, then proceed to Step 7 for verification.

## Step 7: Verify Setup

1. Check collector logs for successful startup (no errors about invalid config or failed connections)
2. Look for log messages indicating connection to Sentry
3. Send test telemetry from an instrumented service and verify it appears in Sentry

**Success criteria:**
- Collector starts without errors
- Traces and/or logs appear in Sentry within 60 seconds of sending

If using Docker, check logs with `docker logs otel-collector`.

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| "failed to create project" | Missing Project:Write permission | Update Internal Integration permissions in Sentry |
| "no team found" | No teams in org | Create a team in Sentry before enabling auto-create |
| "invalid auth token" | Wrong token type or expired | Use Internal Integration token, not user auth token |
| "connection refused" on 4317/4318 | Collector not running or port conflict | Check collector logs and ensure ports are available |
| Validation fails with env var errors | .env file not loaded or placeholders not replaced | Ensure real credentials are in .env and the file is sourced |
| "container name already in use" | Previous container exists | Run `docker stop otel-collector && docker rm otel-collector` |
