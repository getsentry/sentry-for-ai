# general attributes

Stable Sentry semantic convention attributes for `general`.
Generated — do not edit by hand. Re-run `scripts/gen-semantics.py`.

| Key | Type | Brief |
| --- | --- | --- |
| `blocked_main_thread` | `boolean` | Whether the main thread was blocked by the span. |
| `channel` | `string` | The channel name that is being used. |
| `id` | `string` | A unique identifier for the span. |
| `previous_route` | `string` | Also used by mobile SDKs to indicate the previous route in the application. |
| `type` | `string` | More granular type of the operation happening. |
