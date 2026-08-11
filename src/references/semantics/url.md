# Url attributes

URL components — full, path, query, fragment, template.

| Key | Type | Brief |
| --- | --- | --- |
| `url.domain` | `string` | Server domain name if available without reverse DNS lookup; otherwise, IP address or Unix domain socket name. |
| `url.fragment` | `string` | The fragments present in the URI. Note that this does not contain the leading # character, while the `http.fragment` attribute does. |
| `url.full` | `string` | The URL of the resource that was fetched. |
| `url.path` | `string` | The URI path component. |
| `url.path.parameter.<key>` | `string` | Decoded parameters extracted from a URL path. Usually added by client-side routing frameworks like vue-router. |
| `url.port` | `integer` | Server port number. |
| `url.query` | `string` | The query string present in the URL. Note that this does not contain the leading ? character, while the `http.query` attribute does. |
| `url.scheme` | `string` | The URI scheme component identifying the used protocol. |
| `url.template` | `string` | The low-cardinality template of an absolute URL path reference. |
