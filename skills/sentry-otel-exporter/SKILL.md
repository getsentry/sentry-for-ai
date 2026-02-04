---
name: sentry-otel-exporter
description: Configure the OpenTelemetry Collector with Sentry Exporter for multi-project routing. Use when setting up OTel with Sentry, configuring collector pipelines for traces/logs, or routing telemetry from multiple services to separate Sentry projects.
---

# Sentry OTel Exporter Setup

Configure the OpenTelemetry Collector to send traces and logs to Sentry using the native Sentry Exporter.

## Invoke This Skill When

- User asks to "set up OTel with Sentry" or "configure OpenTelemetry for Sentry"
- User wants to route telemetry from multiple services to different Sentry projects
- User asks about `otelcol-contrib`, collector config, or Sentry exporter
- User wants to replace DSN-based routing with org-level authentication

## When to Use `sentry` vs `otlphttp`

| Scenario                                    | Exporter                             |
| ------------------------------------------- | ------------------------------------ |
| Single project, all services share one DSN  | `otlphttp`                           |
| Multiple projects, per-service routing      | `sentry`                             |
| Dynamic environments with auto-provisioning | `sentry` with `auto_create_projects` |

## Prerequisites

- **otelcol-contrib** — The Sentry exporter is included in [otelcol-contrib](https://github.com/open-telemetry/opentelemetry-collector-releases/tree/main/distributions/otelcol-contrib)
- Sentry organization with admin access to create Custom Integrations

## Phase 1: Create Sentry Auth Token

Guide user to create Internal Integration:

1. Navigate to **Settings → Developer Settings → Custom Integrations**
2. Click **Create New Integration** → Choose **Internal Integration**
3. Set permissions:
   - **Project: Read** — required
   - **Project: Write** — required for `auto_create_projects`
   - **Team: Read** — required for auto-creation (finds team to assign projects)
4. Save, then **Create New Token** and copy it

Get org slug from: **Settings → General Settings** or URL `https://sentry.io/organizations/{org-slug}/`

## Phase 2: Configure Collector

### Configuration Options

| Parameter                              | Required | Default        | Description                                   |
| -------------------------------------- | -------- | -------------- | --------------------------------------------- |
| `url`                                  | Yes      | -              | Base URL (`https://sentry.io` or self-hosted) |
| `org_slug`                             | Yes      | -              | Organization slug                             |
| `auth_token`                           | Yes      | -              | Internal Integration token                    |
| `auto_create_projects`                 | No       | `false`        | Create missing projects automatically         |
| `routing.project_from_attribute`       | No       | `service.name` | Resource attribute for routing                |
| `routing.attribute_to_project_mapping` | No       | -              | Map attribute values to project slugs         |
| `timeout`                              | No       | `30s`          | Exporter timeout                              |

### Basic Config

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

exporters:
  sentry:
    url: https://sentry.io
    org_slug: ${env:SENTRY_ORG_SLUG}
    auth_token: ${env:SENTRY_AUTH_TOKEN}

processors:
  batch:

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [sentry]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [sentry]
```

### Environment Variables

```bash
export SENTRY_ORG_SLUG=YOUR_SLUG_HERE
export SENTRY_AUTH_TOKEN=YOUR_TOKEN_HERE
```

## Routing Options

### Automatic Project Creation

Enable when services spin up dynamically (Kubernetes, serverless):

```yaml
exporters:
  sentry:
    # ... required fields
    auto_create_projects: true
```

**Warning:** Project creation is asynchronous. First batch of data for a new project may be dropped while provisioning completes.

### Custom Project Mapping

Map service names to different project slugs:

```yaml
exporters:
  sentry:
    # ... required fields
    routing:
      attribute_to_project_mapping:
        orders-service: ecommerce-orders
        products-service: ecommerce-products
```

Services not in the mapping fall back to using `service.name` as project slug.

### Route by Different Attributes

Route by environment, team, or any resource attribute:

```yaml
exporters:
  sentry:
    # ... required fields
    routing:
      project_from_attribute: deployment.environment
      attribute_to_project_mapping:
        production: prod-monitoring
        staging: staging-monitoring
```

## Self-Hosted Sentry

For self-hosted installations:

```yaml
exporters:
  sentry:
    url: https://sentry.example.com
    org_slug: ${env:SENTRY_ORG_SLUG}
    auth_token: ${env:SENTRY_AUTH_TOKEN}
    http:
      tls:
        ca_file: /path/to/ca.crt # Your CA certificate
```

**Warning:** Avoid `insecure_skip_verify: true` in production — it disables TLS verification.

## Configure Apps

Apps must set the routing attribute (default: `service.name`). This becomes the Sentry project slug.

### Node.js

```javascript
const { Resource } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME } = require("@opentelemetry/semantic-conventions");

const resource = new Resource({
  [ATTR_SERVICE_NAME]: "api-gateway",
});
```

### Python

```python
from opentelemetry.sdk.resources import Resource

resource = Resource.create({"service.name": "api-gateway"})
```

### Environment Variable (Any Language)

```bash
OTEL_SERVICE_NAME=api-gateway
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

## Project Slug Requirements

| Requirement                         | Example             |
| ----------------------------------- | ------------------- |
| Lowercase letters, numbers, hyphens | `api-gateway` ✅    |
| No underscores                      | `orders_service` ❌ |
| No uppercase                        | `OrdersService` ❌  |
| Max 50 characters                   | -                   |

**Important:** If routing attribute is missing or empty, data is dropped with a warning.

## Verification

1. Start collector and services
2. Send test requests
3. Check Sentry for projects matching service names
4. Navigate to **Explore → Traces** to see distributed traces

## Troubleshooting

| Issue                     | Cause                              | Solution                                                   |
| ------------------------- | ---------------------------------- | ---------------------------------------------------------- |
| 403 errors                | Missing permissions                | Verify token has Project:Read, Project:Write, Team:Read    |
| Projects not created      | Invalid names or Team:Read missing | Use lowercase+hyphens, add Team:Read                       |
| First batch dropped       | Async project creation             | Pre-create projects or send warmup requests                |
| Data missing after delete | Collector cache                    | Restart collector to evict cache                           |
| Partial batch failures    | Multi-project routing              | Retries not possible; some projects may receive duplicates |

### Check Collector Logs

```bash
docker logs otelcol-contrib 2>&1 | grep -i sentry
```

## Rate Limiting

The exporter respects Sentry rate limits automatically:

- Parses `X-Sentry-Rate-Limits` headers
- Tracks per-project, per-category limits
- Returns throttle errors to queue for retry
- Falls back to 60s backoff on HTTP 429

## Limitations

| Limitation                                    | Workaround                                    |
| --------------------------------------------- | --------------------------------------------- |
| Missing routing attribute drops data          | Ensure `service.name` is set on all resources |
| First batch for new projects may drop         | Pre-create projects or send warmup requests   |
| Deleted projects cause 403 until cache evicts | Avoid deleting projects while collector runs  |
| Single org per exporter                       | Deploy multiple exporters for multi-org       |
| No metrics support                            | Use separate exporter for metrics             |
| Partial failures can't retry cleanly          | Some projects may receive duplicates on retry |

## Quick Reference

| Component                 | Value                         |
| ------------------------- | ----------------------------- |
| Exporter                  | `sentry` (in otelcol-contrib) |
| OTLP gRPC port            | `4317`                        |
| OTLP HTTP port            | `4318`                        |
| Default routing attribute | `service.name`                |
| Auto-create default       | `false`                       |
| Stability                 | Alpha (traces, logs)          |
