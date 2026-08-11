# Cache attributes

Cache read/write attributes — key, hit/miss, item size.

| Key | Type | Brief |
| --- | --- | --- |
| `cache.hit` | `boolean` | If the cache was hit during this span. |
| `cache.item_size` | `integer` | The size of the requested item in the cache. In bytes. |
| `cache.key` | `string[]` | The key of the cache accessed. |
| `cache.operation` | `string` | The operation being performed on the cache. |
| `cache.ttl` | `integer` | The ttl of the cache in seconds |
| `cache.write` | `boolean` | If the cache operation resulted in a write to the cache. |
