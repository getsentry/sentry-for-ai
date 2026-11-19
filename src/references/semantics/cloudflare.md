# Cloudflare attributes

Cloudflare Workers, bindings, and edge platform attributes.

| Key | Type | Brief |
| --- | --- | --- |
| `cloudflare.d1.duration` | `integer` | The duration of a Cloudflare D1 operation. |
| `cloudflare.d1.rows_read` | `integer` | The number of rows read in a Cloudflare D1 operation. |
| `cloudflare.d1.rows_written` | `integer` | The number of rows written in a Cloudflare D1 operation. |
| `cloudflare.durable_object.query.bindings` | `integer` | The number of bound parameters passed to the SQL exec call. |
| `cloudflare.durable_object.response.rows_read` | `integer` | The number of rows read by a Cloudflare Durable Object SQL operation. |
| `cloudflare.durable_object.response.rows_written` | `integer` | The number of rows written by a Cloudflare Durable Object SQL operation. |
| `cloudflare.r2.bucket` | `string` | The name of the Cloudflare R2 bucket binding |
| `cloudflare.r2.operation` | `string` | The R2 API operation being performed |
| `cloudflare.r2.request.delimiter` | `string` | The delimiter used to group objects in an R2 list operation |
| `cloudflare.r2.request.key` | `string` | The object key used in the R2 operation |
| `cloudflare.r2.request.part_number` | `integer` | The part number in a multipart upload operation |
| `cloudflare.r2.request.prefix` | `string` | The prefix used to filter objects in an R2 list operation |
| `cloudflare.workflow.attempt` | `integer` | The current attempt number for a Cloudflare Workflow step |
| `cloudflare.workflow.retries.backoff` | `string` | The backoff strategy for Cloudflare Workflow step retries |
| `cloudflare.workflow.retries.delay` | `string` | The delay between Cloudflare Workflow step retries |
| `cloudflare.workflow.retries.limit` | `integer` | The maximum number of retries for a Cloudflare Workflow step |
| `cloudflare.workflow.timeout` | `string` | The timeout duration for a Cloudflare Workflow step |
