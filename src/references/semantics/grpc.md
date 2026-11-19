# gRPC attributes

gRPC method, status, and service attributes.

| Key | Type | Brief |
| --- | --- | --- |
| `grpc.error.bad_request.field_violations` | `string[]` | The individual field violations from a google.rpc.BadRequest error detail. Each entry is a JSON-encoded object with field, description, reason, and (optional) localized_message keys, mirroring google.rpc.BadRequest.FieldViolation. |
| `grpc.error.debug_info.detail` | `string` | Additional debugging information, such as a server-side stack trace, from a google.rpc.DebugInfo error detail. SDKs should only send this attribute when sendDefaultPii is enabled or dataCollection is configured accordingly. |
| `grpc.error.debug_info.stack_entries` | `string[]` | The server-side stack trace entries from a google.rpc.DebugInfo error detail. SDKs should only send this attribute when sendDefaultPii is enabled or dataCollection is configured accordingly. |
| `grpc.error.error_info.domain` | `string` | The logical grouping to which the gRPC error reason belongs, from the google.rpc.ErrorInfo error detail. |
| `grpc.error.error_info.metadata.<key>` | `string` | Additional structured metadata attached to a google.rpc.ErrorInfo error detail, with <key> being the metadata key name. SDKs should only send this attribute when sendDefaultPii is enabled or dataCollection is configured accordingly. |
| `grpc.error.error_info.reason` | `string` | The reason for the gRPC error, as defined by the service that generated it, from the google.rpc.ErrorInfo error detail. |
| `grpc.error.precondition_failure.violations` | `string[]` | The individual precondition violations from a google.rpc.PreconditionFailure error detail. Each entry is a JSON-encoded object with type, subject, and description keys. SDKs should only send this attribute when sendDefaultPii is enabled or dataCollection is configured accordingly, since violation subjects may identify specific resources or users. |
| `grpc.error.quota_failure.violations` | `string[]` | The individual quota violations from a google.rpc.QuotaFailure error detail. Each entry is a JSON-encoded object with subject, description, api_service, quota_metric, quota_id, quota_dimensions, quota_value, and (optional) future_quota_value keys, mirroring google.rpc.QuotaFailure.Violation. SDKs should only send this attribute when sendDefaultPii is enabled or dataCollection is configured accordingly, since violation subjects may identify specific resources or users. |
| `grpc.error.resource_info.description` | `string` | A description of the error that occurred while accessing the resource, from a google.rpc.ResourceInfo error detail. |
| `grpc.error.resource_info.owner` | `string` | The owner of the resource being accessed (e.g. project or account owning it), from a google.rpc.ResourceInfo error detail. SDKs should only send this attribute when sendDefaultPii is enabled or dataCollection is configured accordingly. |
| `grpc.error.resource_info.resource_name` | `string` | The name of the resource being accessed, from a google.rpc.ResourceInfo error detail. SDKs should only send this attribute when sendDefaultPii is enabled or dataCollection is configured accordingly. |
| `grpc.error.resource_info.resource_type` | `string` | The type of resource being accessed, from a google.rpc.ResourceInfo error detail. |
| `grpc.error.retry_info.retry_delay_ms` | `integer` | How long the client should wait before retrying the gRPC call, in milliseconds, from the google.rpc.RetryInfo error detail. |
