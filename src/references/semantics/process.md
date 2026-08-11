# Process attributes

Process identity and runtime attributes (pid, executable, command).

| Key | Type | Brief |
| --- | --- | --- |
| `process.command_args` | `string[]` | All the command arguments (including the command/executable itself) as received by the process. |
| `process.executable.name` | `string` | The name of the executable that started the process. |
| `process.pid` | `integer` | The process ID of the running process. |
| `process.runtime.description` | `string` | An additional description about the runtime of the process, for example a specific vendor customization of the runtime environment. Equivalent to `raw_description` in the Sentry runtime context. |
| `process.runtime.engine.name` | `string` | The name of the runtime engine. |
| `process.runtime.engine.version` | `string` | The version of the runtime engine. |
| `process.runtime.name` | `string` | The name of the runtime. Equivalent to `name` in the Sentry runtime context. |
| `process.runtime.version` | `string` | The version of the runtime of this process, as returned by the runtime without modification. Equivalent to `version` in the Sentry runtime context. |
