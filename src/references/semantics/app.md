# App attributes

Application identity and lifecycle attributes for mobile and desktop apps.

| Key | Type | Brief |
| --- | --- | --- |
| `app.build` | `string` | Internal build identifier, as it appears on the platform. |
| `app.identifier` | `string` | Version-independent application identifier, often a dotted bundle ID. |
| `app.in_foreground` | `boolean` | Whether the application is currently in the foreground. |
| `app.name` | `string` | Human readable application name, as it appears on the platform. |
| `app.start_time` | `string` | Formatted UTC timestamp when the user started the application. |
| `app.version` | `string` | Human readable application version, as it appears on the platform. |
| `app.vitals.frames.delay.value` | `integer` | The sum of all delayed frame durations in seconds during the lifetime of the span. For more information see [frames delay](https://develop.sentry.dev/sdk/performance/frames-delay/). |
| `app.vitals.frames.frozen.count` | `integer` | The number of frozen frames rendered during the lifetime of the span. |
| `app.vitals.frames.frozen.rate` | `double` | The fraction of rendered frames that were frozen, calculated as `app.vitals.frames.frozen.count` divided by `app.vitals.frames.total.count`. This is computed by Relay. |
| `app.vitals.frames.slow.count` | `integer` | The number of slow frames rendered during the lifetime of the span. |
| `app.vitals.frames.slow.rate` | `double` | The fraction of rendered frames that were slow, calculated as `app.vitals.frames.slow.count` divided by `app.vitals.frames.total.count`. This is computed by Relay. |
| `app.vitals.frames.total.count` | `integer` | The number of total frames rendered during the lifetime of the span. |
| `app.vitals.stall.duration` | `double` | The combined duration of all stalls in milliseconds. Only applies to React Native. This is computed by Relay. |
| `app.vitals.stall.percentage` | `double` | The fraction of transaction duration during which the app was stalled, between 0.0 and 1.0. For example, 0.8 represents 80%. Only applies to React Native. This is computed by Relay. |
| `app.vitals.start.cold.value` | `double` | The duration of a cold app start in milliseconds |
| `app.vitals.start.prewarmed` | `boolean` | Whether the app start was prewarmed. |
| `app.vitals.start.reason` | `string` | The reason that triggered the app start. |
| `app.vitals.start.screen` | `string` | The screen that is rendered when the app start is complete. This is the screen the user first sees and can interact with after launch. The absence of this attribute on the app start span indicates a background app start where no UI was rendered. |
| `app.vitals.start.type` | `string` | The type of app start, for example `cold` or `warm` |
| `app.vitals.start.warm.value` | `double` | The duration of a warm app start in milliseconds |
| `app.vitals.ttfd.value` | `double` | The duration of time to full display in milliseconds |
| `app.vitals.ttid.value` | `double` | The duration of time to initial display in milliseconds |
