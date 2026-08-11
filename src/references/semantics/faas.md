# FaaS attributes

Function-as-a-service / serverless invocation attributes.

| Key | Type | Brief |
| --- | --- | --- |
| `faas.coldstart` | `boolean` | A boolean that is true if the serverless function is executed for the first time (aka cold-start). |
| `faas.cron` | `string` | A string containing the schedule period as Cron Expression. |
| `faas.duration_in_ms` | `integer` | The duration a function took to run, in milliseconds. |
| `faas.entry_point` | `string` | The code that’s run when the cloud provider invokes your function. |
| `faas.identity` | `string` | The Service Account (GCP), IAM Execution Role (AWS), or Managed Identity (Azure) used by the serverless function when interacting with other cloud services |
| `faas.invocation_id` | `string` | The invocation ID of the current function invocation. |
| `faas.invoked_name` | `string` | The name of the invoked function. |
| `faas.invoked_provider` | `string` | The cloud provider of the invoked function. |
| `faas.invoked_region` | `string` | The cloud region of the invoked function. |
| `faas.name` | `string` | The name of the serverless function |
| `faas.time` | `string` | A string containing the function invocation time in the ISO 8601 format expressed in UTC. |
| `faas.trigger` | `string` | Type of the trigger which caused this function invocation. |
| `faas.version` | `string` | The version of the function that was invoked |
