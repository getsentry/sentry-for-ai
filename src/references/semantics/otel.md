# OpenTelemetry attributes

OpenTelemetry bridge attributes carried into Sentry.

| Key | Type | Brief |
| --- | --- | --- |
| `otel.scope.name` | `string` | The name of the instrumentation scope - (InstrumentationScope.Name in OTLP). |
| `otel.scope.version` | `string` | The version of the instrumentation scope - (InstrumentationScope.Version in OTLP). |
| `otel.status_code` | `string` | Name of the code, either “OK” or “ERROR”. MUST NOT be set if the status code is UNSET. |
| `otel.status_description` | `string` | Description of the Status if it has a value, otherwise not set. |
