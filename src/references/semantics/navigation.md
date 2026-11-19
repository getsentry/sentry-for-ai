# Navigation attributes

Client-side navigation and route-change attributes.

| Key | Type | Brief |
| --- | --- | --- |
| `navigation.origin` | `string` | The origin of the navigation (usually client side router navigations). Should preferrably parameterized template (like url.template) or a URL path otherwise. |
| `navigation.route.id` | `string` | The identifier of the matched client-side route, as assigned by the routing framework (e.g., vue-router name, react-router id). |
| `navigation.type` | `string` | The type of navigation done by a client-side router. |
