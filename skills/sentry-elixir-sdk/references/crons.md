# Crons — Sentry Elixir SDK

> Minimum SDK: `sentry` v10.2.0+

Sentry Cron Monitoring detects when scheduled jobs fail silently — they don't error, but they stop running or take too long. The SDK provides three integration paths: manual check-ins (any scheduler), Oban (job queue), and Quantum (cron scheduler).

## Manual Check-Ins

Use `Sentry.capture_check_in/1` with any periodic task — `GenServer`, `Task`, or custom scheduler.

### Basic pattern: start → work → complete/error

```elixir
defmodule MyApp.ReportWorker do
  use GenServer

  def handle_info(:run, state) do
    # 1. Signal job started
    {:ok, check_in_id} = Sentry.capture_check_in(
      status: :in_progress,
      monitor_slug: "daily-report"
    )

    # 2. Do the work
    result = MyApp.Reports.generate_daily_report()

    # 3. Signal completion or failure
    case result do
      {:ok, _report} ->
        Sentry.capture_check_in(
          check_in_id: check_in_id,
          status: :ok,
          monitor_slug: "daily-report"
        )

      {:error, reason} ->
        Sentry.capture_check_in(
          check_in_id: check_in_id,
          status: :error,
          monitor_slug: "daily-report"
        )
        Logger.error("Report generation failed: #{inspect(reason)}")
    end

    {:noreply, state}
  end
end
```

### With monitor configuration (upsert)

Providing `monitor_config` creates or updates the monitor definition in Sentry on first check-in. This eliminates the need to create monitors in the Sentry UI manually:

```elixir
Sentry.capture_check_in(
  status: :in_progress,
  monitor_slug: "hourly-sync",
  monitor_config: [
    schedule: [type: :crontab, value: "0 * * * *"],   # runs every hour at :00
    timezone: "America/New_York",
    checkin_margin: 5,         # minutes before Sentry considers the check-in missed
    max_runtime: 30,           # minutes before Sentry considers the job failed
    failure_issue_threshold: 2,
    recovery_threshold: 2,
    owner: "platform-team"     # since v10.10.0
  ]
)
```

### Interval schedule

For jobs that run every N minutes/hours rather than on a crontab:

```elixir
Sentry.capture_check_in(
  status: :in_progress,
  monitor_slug: "health-probe",
  monitor_config: [
    schedule: [type: :interval, value: 15, unit: :minute],
    # unit options: :year | :month | :week | :day | :hour | :minute
    checkin_margin: 3,
    max_runtime: 5
  ]
)
```

### `capture_check_in/1` options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `:status` | `:in_progress \| :ok \| :error` | Yes | Current job status |
| `:monitor_slug` | `string` | Yes | Unique identifier for the monitor (slug format) |
| `:check_in_id` | `string` | On completion | ID from the initial `:in_progress` call |
| `:duration` | `number` | No | Job duration in seconds (auto-calculated when using check_in_id) |
| `:monitor_config` | `keyword` | No | Monitor definition; upserted on each call |
| `:environment` | `string` | No | Override default environment for this check-in |

`capture_check_in/1` returns:
- `{:ok, check_in_id}` — check-in ID string; pass it to subsequent calls
- `:ignored` — not sent (no DSN, wrong environment, etc.)
- `{:error, ClientError.t()}` — HTTP error

### Helper wrapper pattern

For clean code, wrap the check-in lifecycle in a helper:

```elixir
defmodule MyApp.Crons do
  @doc """
  Runs a function as a Sentry-monitored cron job.
  Returns {:ok, result} or {:error, exception}.
  """
  def monitor(slug, fun, monitor_config \\ []) do
    {:ok, check_in_id} = Sentry.capture_check_in(
      status: :in_progress,
      monitor_slug: slug,
      monitor_config: monitor_config
    )

    try do
      result = fun.()

      Sentry.capture_check_in(
        check_in_id: check_in_id,
        status: :ok,
        monitor_slug: slug
      )

      {:ok, result}
    rescue
      exception ->
        Sentry.capture_check_in(
          check_in_id: check_in_id,
          status: :error,
          monitor_slug: slug
        )

        Sentry.capture_exception(exception, stacktrace: __STACKTRACE__)
        {:error, exception}
    end
  end
end

# Usage
MyApp.Crons.monitor("nightly-cleanup", fn ->
  MyApp.Cleanup.run()
end, schedule: [type: :crontab, value: "0 3 * * *"])
```

---

## Oban Integration

Requires: Oban v2.17.6+ or Oban Pro v0.14+

### Error capture (since v10.9.0)

Report failed Oban job errors to Sentry automatically:

```elixir
# config/config.exs
config :sentry,
  integrations: [
    oban: [
      capture_errors: true
    ]
  ]
```

Errors from all Oban workers are captured with job context included.

### Cron monitoring (since v10.2.0)

Monitor scheduled Oban jobs automatically. The integration reads cron metadata set by Oban Pro (or manually via job meta):

```elixir
# config/config.exs
config :sentry,
  integrations: [
    oban: [
      capture_errors: true,
      cron: [
        enabled: true
      ]
    ]
  ]
```

Jobs are only monitored if their meta contains `"cron" => true`. Oban Pro sets this automatically. For standard Oban, add it manually:

```elixir
# Scheduling a cron job with Oban (standard, not Pro)
Oban.insert(%Oban.Job{
  worker: MyApp.DailyReportWorker,
  meta: %{"cron" => true, "cron_expr" => "0 8 * * *"}
})
```

### Per-worker monitor configuration (since v10.9.0)

Override monitor settings per worker using the `Sentry.Integrations.Oban.Cron` callback:

```elixir
defmodule MyApp.DailyReportWorker do
  use Oban.Worker, queue: :reports

  @behaviour Sentry.Integrations.Oban.Cron   # optional callback

  @impl Sentry.Integrations.Oban.Cron
  def sentry_check_in_configuration(_job) do
    [
      monitor_config: [
        timezone: "America/New_York",
        checkin_margin: 10,
        max_runtime: 60
      ]
    ]
  end

  @impl Oban.Worker
  def perform(%Oban.Job{} = job) do
    # ... job logic
    :ok
  end
end
```

### Custom error reporting filter (since v12.0.0)

Suppress reporting for specific noisy workers:

```elixir
config :sentry,
  integrations: [
    oban: [
      capture_errors: true,
      should_report_error_callback: fn worker, _job ->
        worker not in [MyApp.NoisyWorker, MyApp.ExpectedFailureWorker]
      end
    ]
  ]
```

### Custom monitor slug generator

```elixir
defmodule MyApp.ObanSlugger do
  def generate_slug(%Oban.Job{worker: worker}) do
    worker
    |> Module.split()
    |> Enum.map(&Macro.underscore/1)
    |> Enum.join("-")
  end
end

config :sentry,
  integrations: [
    oban: [
      cron: [
        enabled: true,
        monitor_slug_generator: {MyApp.ObanSlugger, :generate_slug}
      ]
    ]
  ]
```

---

## Quantum Integration

Requires: Quantum v3.0+

### Enable cron monitoring

```elixir
# mix.exs
{:quantum, "~> 3.0"}
```

```elixir
# config/config.exs
config :sentry,
  integrations: [
    quantum: [
      cron: [
        enabled: true
      ]
    ]
  ]
```

The Quantum integration automatically reads cron expressions from your Quantum scheduler configuration and creates monitors for each job. The monitor slug is derived from the job name.

```elixir
# lib/my_app/scheduler.ex
defmodule MyApp.Scheduler do
  use Quantum, otp_app: :my_app
end

# config/config.exs
config :my_app, MyApp.Scheduler,
  jobs: [
    {"0 * * * *", {MyApp.HourlyTask, :run, []}},    # monitored as "hourly_task"
    {"@daily",    {MyApp.DailyReport, :run, []}},    # monitored as "daily_report"
  ]
```

> **Note:** Quantum jobs using `@reboot` are not monitored (no equivalent schedule type in Sentry Crons).

---

## Monitor Configuration Reference

| Option | Type | Description |
|--------|------|-------------|
| `schedule.type` | `:crontab \| :interval` | Schedule type |
| `schedule.value` | `string` (crontab) or `integer` (interval) | Crontab expression or interval count |
| `schedule.unit` | `:minute \| :hour \| :day \| :week \| :month \| :year` | Interval unit (`:interval` type only) |
| `timezone` | `string` | IANA timezone (e.g., `"America/New_York"`) |
| `checkin_margin` | `integer` | Minutes after expected start before marking missed |
| `max_runtime` | `integer` | Minutes from start before marking timed out |
| `failure_issue_threshold` | `integer` | Consecutive failures before opening an issue |
| `recovery_threshold` | `integer` | Consecutive successes before closing the issue |
| `owner` | `string` | Team or user slug (since v10.10.0) |

## Best Practices

- Always call `Sentry.capture_check_in/1` with `:in_progress` before starting work and `:ok` or `:error` on completion — sending only `:ok` at the end still works but loses duration tracking
- Wrap job logic in a try/rescue so failures also send the `:error` status (see helper wrapper pattern above)
- Use `monitor_config` on the first check-in of a new job to create the monitor automatically — no need to set it on every subsequent check-in
- Set `checkin_margin` to a reasonable buffer (e.g., 5 minutes for hourly jobs) to avoid false alarms from minor scheduling jitter
- For Oban, prefer the built-in integration over manual check-ins — it handles the check-in lifecycle and job context enrichment automatically

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Monitor not appearing in Sentry | Send at least one `:in_progress` check-in with `monitor_config` to create the monitor |
| Oban integration not monitoring crons | Requires Oban v2.17.6+ or Oban Pro; job meta must contain `"cron" => true` |
| `capture_check_in/1` returns `:ignored` | DSN is not set or `:environment_name` is excluded in your Sentry alert filters |
| Quantum `@reboot` jobs not monitored | Expected — `@reboot` has no crontab/interval equivalent; use manual check-ins for one-time startup jobs |
| Missed check-ins on deploy | If the app restarts during a cron window, the check-in is missed; increase `checkin_margin` to account for deploy time |
