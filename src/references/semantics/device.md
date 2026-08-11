# Device attributes

Device hardware and form-factor attributes for mobile and desktop.

| Key | Type | Brief |
| --- | --- | --- |
| `device.archs` | `string[]` | The CPU architectures of the device. |
| `device.battery_level` | `double` | The battery level of the device as a percentage (0-100). |
| `device.battery_temperature` | `double` | The battery temperature of the device in Celsius. |
| `device.boot_time` | `string` | A formatted UTC timestamp when the system was booted. |
| `device.brand` | `string` | The brand of the device. |
| `device.charging` | `boolean` | Whether the device was charging or not. |
| `device.chipset` | `string` | The chipset of the device. |
| `device.class` | `string` | The classification of the device. For example, `low`, `medium`, or `high`. Typically inferred by Relay - SDKs generally do not need to set this directly. |
| `device.cpu_description` | `string` | A description of the CPU of the device. |
| `device.external_free_storage` | `integer` | External storage free size in bytes. |
| `device.external_storage_size` | `integer` | External storage total size in bytes. |
| `device.family` | `string` | The family of the device. |
| `device.free_memory` | `integer` | Free system memory in bytes. |
| `device.free_storage` | `integer` | Free device storage in bytes. |
| `device.id` | `string` | Unique device identifier. |
| `device.locale` | `string` | The locale of the device. |
| `device.low_memory` | `boolean` | Whether the device was low on memory. |
| `device.low_power_mode` | `boolean` | Whether the device is in Low Power Mode. |
| `device.manufacturer` | `string` | The manufacturer of the device. |
| `device.memory.estimated_capacity` | `integer` | The estimated total memory capacity of the device, only a rough estimation in gigabytes. Browsers report estimations in buckets of powers of 2, mostly capped at 8 GB |
| `device.memory_size` | `integer` | Total system memory available in bytes. |
| `device.model` | `string` | The model of the device. |
| `device.model_id` | `string` | An internal hardware revision to identify the device exactly. |
| `device.name` | `string` | The name of the device. On mobile, this is the user-assigned device name. On servers and desktops, this is typically the hostname. |
| `device.online` | `boolean` | Whether the device was online or not. |
| `device.orientation` | `string` | The orientation of the device, either “portrait” or “landscape”. |
| `device.processor_count` | `integer` | Number of “logical processors”. |
| `device.processor_frequency` | `double` | Processor frequency in MHz. |
| `device.screen_density` | `double` | The screen density of the device. |
| `device.screen_dpi` | `integer` | The screen density in dots-per-inch (DPI) of the device. |
| `device.screen_height_pixels` | `integer` | The height of the device screen in pixels. |
| `device.screen_width_pixels` | `integer` | The width of the device screen in pixels. |
| `device.simulator` | `boolean` | Whether the device is a simulator or an actual device. |
| `device.storage_size` | `integer` | Total device storage in bytes. |
| `device.thermal_state` | `string` | The thermal state of the device. Based on Apple’s `ProcessInfo.ThermalState` enum: `nominal`, `fair`, `serious`, or `critical`. |
| `device.timezone` | `string` | The timezone of the device. |
| `device.usable_memory` | `integer` | Memory usable for the app in bytes. |
