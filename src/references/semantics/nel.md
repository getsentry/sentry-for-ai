# NEL attributes

Network Error Logging (NEL) report attributes.

| Key | Type | Brief |
| --- | --- | --- |
| `nel.elapsed_time` | `integer` | The elapsed number of milliseconds between the start of the resource fetch and when it was completed or aborted by the user agent. |
| `nel.phase` | `string` | If request failed, the phase of its network error. If request succeeded, “application”. |
| `nel.referrer` | `string` | request’s referrer, as determined by the referrer policy associated with its client. |
| `nel.sampling_function` | `double` | The sampling function used to determine if the request should be sampled. |
| `nel.type` | `string` | If request failed, the type of its network error. If request succeeded, “ok”. |
