# ART attributes

Android Runtime (ART) profiling and runtime attributes.

| Key | Type | Brief |
| --- | --- | --- |
| `art.gc.blocking_count` | `integer` | Total number of blocking (stop-the-world) garbage collections performed by the Android Runtime |
| `art.gc.blocking_time` | `double` | Total time spent in blocking (stop-the-world) garbage collections by the Android Runtime, in milliseconds |
| `art.gc.pre_oome_count` | `integer` | Total number of garbage collections triggered as a last resort before an OutOfMemoryError by the Android Runtime |
| `art.gc.total_count` | `integer` | Total number of garbage collections performed by the Android Runtime |
| `art.gc.total_time` | `double` | Total time spent in garbage collection by the Android Runtime, in milliseconds |
| `art.gc.waiting_time` | `double` | Total time threads spent waiting for garbage collection to complete in the Android Runtime, in milliseconds |
| `art.memory.free` | `integer` | Free memory available to the process as reported by the Android Runtime, in bytes |
| `art.memory.free_until_gc` | `integer` | Free memory available before a garbage collection would be triggered by the Android Runtime, in bytes |
| `art.memory.free_until_oome` | `integer` | Free memory available before an OutOfMemoryError would be thrown by the Android Runtime, in bytes |
| `art.memory.max` | `integer` | Maximum memory the process is allowed to use as reported by the Android Runtime, in bytes |
| `art.memory.total` | `integer` | Total memory currently allocated to the process by the Android Runtime, in bytes |
