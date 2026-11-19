# UI attributes

UI component and rendering attributes for client interfaces.

| Key | Type | Brief |
| --- | --- | --- |
| `ui.component_name` | `string` | The name of the associated component. |
| `ui.contributes_to_ttfd` | `boolean` | Whether the span execution contributed to the TTFD (time to fully drawn) metric. |
| `ui.contributes_to_ttid` | `boolean` | Whether the span execution contributed to the TTID (time to initial display) metric. |
| `ui.element.height` | `integer` | The height of the UI element (for Html in pixels) |
| `ui.element.id` | `string` | The id of the UI element |
| `ui.element.identifier` | `string` | The identifier used to measure the UI element timing |
| `ui.element.load_time` | `double` | The loading time of a UI element (from time origin to finished loading) |
| `ui.element.paint_type` | `string` | The type of element paint. Can either be ‘image-paint’ or ‘text-paint’ |
| `ui.element.render_time` | `double` | The rendering time of the UI element (from time origin to finished rendering) |
| `ui.element.type` | `string` | type of the UI element |
| `ui.element.url` | `string` | The URL of the UI element (e.g. an img src) |
| `ui.element.width` | `integer` | The width of the UI element (for HTML in pixels) |
