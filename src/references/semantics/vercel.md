# Vercel attributes

Vercel platform and deployment attributes.

| Key | Type | Brief |
| --- | --- | --- |
| `vercel.branch` | `string` | Git branch name for Vercel project |
| `vercel.build_id` | `string` | Identifier for the Vercel build (only present on build logs) |
| `vercel.deployment_id` | `string` | Identifier for the Vercel deployment |
| `vercel.destination` | `string` | Origin of the external content in Vercel (only on external logs) |
| `vercel.edge_type` | `string` | Type of edge runtime in Vercel |
| `vercel.entrypoint` | `string` | Entrypoint for the request in Vercel |
| `vercel.execution_region` | `string` | Region where the request is executed |
| `vercel.id` | `string` | Unique identifier for the log entry in Vercel |
| `vercel.ja3_digest` | `string` | JA3 fingerprint digest of Vercel request |
| `vercel.ja4_digest` | `string` | JA4 fingerprint digest |
| `vercel.log_type` | `string` | Vercel log output type |
| `vercel.path` | `string` | Function or dynamic path of the request in Vercel. |
| `vercel.project_id` | `string` | Identifier for the Vercel project |
| `vercel.project_name` | `string` | Name of the Vercel project |
| `vercel.proxy.cache_id` | `string` | Original request ID when request is served from cache |
| `vercel.proxy.client_ip` | `string` | Client IP address |
| `vercel.proxy.host` | `string` | Hostname of the request |
| `vercel.proxy.lambda_region` | `string` | Region where lambda function executed |
| `vercel.proxy.method` | `string` | HTTP method of the request |
| `vercel.proxy.path` | `string` | Request path with query parameters |
| `vercel.proxy.path_type` | `string` | How the request was served based on its path and project configuration |
| `vercel.proxy.path_type_variant` | `string` | Variant of the path type |
| `vercel.proxy.referer` | `string` | Referer of the request |
| `vercel.proxy.region` | `string` | Region where the request is processed |
| `vercel.proxy.response_byte_size` | `integer` | Size of the response in bytes |
| `vercel.proxy.scheme` | `string` | Protocol of the request |
| `vercel.proxy.status_code` | `integer` | HTTP status code of the proxy request |
| `vercel.proxy.timestamp` | `integer` | Unix timestamp when the proxy request was made |
| `vercel.proxy.user_agent` | `string[]` | User agent strings of the request |
| `vercel.proxy.vercel_cache` | `string` | Cache status sent to the browser |
| `vercel.proxy.vercel_id` | `string` | Vercel-specific identifier |
| `vercel.proxy.waf_action` | `string` | Action taken by firewall rules |
| `vercel.proxy.waf_rule_id` | `string` | ID of the firewall rule that matched |
| `vercel.request_id` | `string` | Identifier of the Vercel request |
| `vercel.source` | `string` | Origin of the Vercel log (build, edge, lambda, static, external, or firewall) |
| `vercel.status_code` | `integer` | HTTP status code of the request (-1 means no response returned and the lambda crashed) |
