# Create or select a Sentry project (and get its DSN)

Provision a destination for events: select an existing Sentry project or create a new
one, then read its **DSN** — the key wired into `Sentry.init()`. Driven entirely through
the Sentry MCP, so there is no manual dashboard trip.

## Prerequisites

- The Sentry MCP server connected and authenticated.
  If it is not, use your knowledge of the harness you’re running in to suggest the
  appropriate way to authenticate the Sentry MCP, then retry.
- If the MCP cannot authenticate at all, it may mean the user has **no Sentry account
  yet**. In that case hand off to `https://sentry.io/signup` (there is no agent flow for
  account creation), then have them come back and connect the MCP.

`find_dsns`, `create_project`, `find_teams`, and `create_team` are catalog tools — reach
them via `search_sentry_tools` / `execute_sentry_tool`. `find_organizations` and
`find_projects` are exposed directly.

## Steps

### 1. Find the org, projects, and teams

- `find_organizations` — confirm auth and get the organization slug.
  Users often belong to several; ask rather than guessing.
- `find_projects` — lists the org’s projects, **slugs only**. It can’t tell you a
  project’s platform, so judge fit by name or check with the user.
- `find_teams` — `create_project` requires a team slug, so get one now.

### 2. Select or create

**A fitting project already exists** → pick it and read its DSN:

- `find_dsns` (the client-keys lookup) — takes the org **and** project slug, returns the
  DSN(s).

**No project, or none that fits** → create one.
This is a mutating action, so **propose it and create only on a yes — never silently**:

- `create_project` — mints the project and its DSN. Requires `organizationSlug`,
  `teamSlug`, and `name`; `slug`, `platform`, and `repository` are optional.
  If the org has no team yet, `create_team` first.
- If the DSN comes back as `unavailable`, the project was still created — call
  `create_dsn` for it.
- Members can hit `403 … disabled this feature for members`. If so, have the user create
  the project in the UI, then come back to `find_dsns`.

## Result

You now hold a DSN for the chosen project.
Use it as the `dsn` value when initializing the SDK (a placeholder like `___DSN___` is
fine in reference text; substitute the real value in the project’s config).
