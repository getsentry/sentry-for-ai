# OS attributes

Operating system name, version, and type attributes.

| Key | Type | Brief |
| --- | --- | --- |
| `os.build_id` | `string` | The build ID of the operating system. |
| `os.description` | `string` | Human readable (not intended to be parsed) OS version information, like e.g. reported by ver or lsb_release -a commands. |
| `os.kernel_version` | `string` | An independent kernel version string. Typically the entire output of the `uname` syscall. |
| `os.name` | `string` | Human readable operating system name. |
| `os.raw_description` | `string` | An unprocessed description string obtained by the operating system. For some well-known runtimes, Sentry will attempt to parse `name` and `version` from this string, if they are not explicitly given. |
| `os.rooted` | `boolean` | Whether the operating system has been jailbroken or rooted. |
| `os.theme` | `string` | Whether the OS runs in dark mode or light mode. |
| `os.type` | `string` | The operating system type. |
| `os.version` | `string` | The version of the operating system. |
