# User attributes

End-user identity attributes (id, email, username, geo).

| Key | Type | Brief |
| --- | --- | --- |
| `user.email` | `string` | User email address. |
| `user.full_name` | `string` | User’s full name. |
| `user.geo.city` | `string` | Human readable city name. |
| `user.geo.country_code` | `string` | Two-letter country code (ISO 3166-1 alpha-2). |
| `user.geo.region` | `string` | Human readable region name or code. |
| `user.geo.subdivision` | `string` | Human readable subdivision name. |
| `user.hash` | `string` | Unique user hash to correlate information for a user in anonymized form. |
| `user.id` | `string` | Unique identifier of the user. |
| `user.ip_address` | `string` | The IP address of the user. |
| `user.name` | `string` | Short name or login/username of the user. |
| `user.roles` | `string[]` | Array of user roles at the time of the event. |
