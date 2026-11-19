# GCP attributes

Google Cloud Platform service and resource attributes.

| Key | Type | Brief |
| --- | --- | --- |
| `gcp.function.context.event_id` | `string` | The event ID from the legacy GCP Cloud Function context (1st gen) |
| `gcp.function.context.event_type` | `string` | The type of the GCP Cloud Function event |
| `gcp.function.context.id` | `string` | The unique event ID from the GCP CloudEvents context (2nd gen Cloud Functions) |
| `gcp.function.context.resource` | `string` | The resource that triggered the GCP Cloud Function event |
| `gcp.function.context.source` | `string` | The source of the GCP Cloud Function event |
| `gcp.function.context.specversion` | `string` | The CloudEvents specification version of the GCP Cloud Function event |
| `gcp.function.context.time` | `string` | The timestamp of the GCP Cloud Function event |
| `gcp.function.context.timestamp` | `string` | The legacy timestamp of the GCP Cloud Function event |
| `gcp.function.context.type` | `string` | The type of the GCP Cloud Function event context |
| `gcp.project.id` | `string` | The ID of the project in GCP that this resource is associated with |
