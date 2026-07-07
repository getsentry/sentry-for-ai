# Create or select a Sentry project (and get its DSN)

Provision a destination for events: select an existing Sentry project or create a new one, then read
its **DSN** — the key wired into `Sentry.init()`. Driven entirely through the Sentry MCP, so
there is no manual dashboard trip.

## Prerequisites

- The Sentry MCP server connected and authenticated. If it is not, use your knowledge of the harness
  you're running in to suggest the appropriate way to authenticate the Sentry MCP, then retry.
- If the MCP cannot authenticate at all, it may mean the user has **no Sentry account yet**. In that
  case hand off to `https://sentry.io/signup` (there is no agent flow for account creation), then
  have them come back and connect the MCP.

Most of the tools below are catalog tools — reach them via `search_sentry_tools` /
`execute_sentry_tool` if they are not directly exposed.

## Steps

### 1. Find the org and existing projects

- `find_organizations` — confirm auth and get the organization slug.
- `find_projects` — list the org's existing projects.

### 2. Select or create

**A fitting project already exists** → pick it and read its DSN:

- `find_dsns` (the client-keys lookup) — returns the project's DSN(s).

**No project, or none that fits** → create one. This is a mutating action, so **propose it and
create only on a yes — never silently**:

- `create_project` — mints the project **and** a DSN in a single call. You'll need the org slug, a
  team, a project name/slug, and the platform. The response includes the DSN — capture it.

## Result

You now hold a DSN for the chosen project. Use it as the `dsn` value when initializing the
SDK (a placeholder like `___DSN___` is fine in reference text; substitute the real value in the
project's config).
