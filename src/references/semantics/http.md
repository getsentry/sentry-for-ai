# HTTP attributes

HTTP client and server attributes — method, route, status, timing, and headers.

| Key | Type | Brief |
| --- | --- | --- |
| `http.decoded_response_content_length` | `integer` | The decoded body size of the response (in bytes). |
| `http.fragment` | `string` | The fragments present in the URI. Note that this contains the leading # character, while the `url.fragment` attribute does not. |
| `http.query` | `string` | The query string present in the URL. Note that this contains the leading ? character, while the `url.query` attribute does not. |
| `http.request.body.data` | `string` | HTTP request body data. Can be given as string or structural data of any format. |
| `http.request.connect_start` | `double` | The UNIX timestamp representing the time immediately before the user agent starts establishing the connection to the server to retrieve the resource. |
| `http.request.connection_end` | `double` | The UNIX timestamp representing the time immediately after the browser finishes establishing the connection to the server to retrieve the resource. The timestamp value includes the time interval to establish the transport connection, as well as other time intervals such as TLS handshake and SOCKS authentication. |
| `http.request.domain_lookup_end` | `double` | The UNIX timestamp representing the time immediately after the browser finishes the domain-name lookup for the resource. |
| `http.request.domain_lookup_start` | `double` | The UNIX timestamp representing the time immediately before the browser starts the domain name lookup for the resource. |
| `http.request.fetch_start` | `double` | The UNIX timestamp representing the time immediately before the browser starts to fetch the resource. |
| `http.request.header.<key>` | `string[]` | HTTP request headers, <key> being the normalized HTTP Header name (lowercase), the value being the header values. |
| `http.request.method` | `string` | The HTTP method used. |
| `http.request.redirect_end` | `double` | The UNIX timestamp representing the timestamp immediately after receiving the last byte of the response of the last redirect |
| `http.request.redirect_start` | `double` | The UNIX timestamp representing the start time of the fetch which that initiates the redirect. |
| `http.request.request_start` | `double` | The UNIX timestamp representing the time immediately before the browser starts requesting the resource from the server, cache, or local resource. If the transport connection fails and the browser retires the request, the value returned will be the start of the retry request. |
| `http.request.resend_count` | `integer` | The ordinal number of request resending attempt (for any reason, including redirects). |
| `http.request.response_end` | `double` | The UNIX timestamp representing the time immediately after the browser receives the last byte of the resource or immediately before the transport connection is closed, whichever comes first. |
| `http.request.response_start` | `double` | The UNIX timestamp representing the time immediately before the browser starts requesting the resource from the server, cache, or local resource. If the transport connection fails and the browser retires the request, the value returned will be the start of the retry request. |
| `http.request.same_origin` | `boolean` | Indicates that a URL has the same origin as the current page’s origin in the browser. |
| `http.request.secure_connection_start` | `double` | The UNIX timestamp representing the time immediately before the browser starts the handshake process to secure the current connection. If a secure connection is not used, the property returns zero. |
| `http.request.time_to_first_byte` | `double` | The time in seconds from the browser’s timeorigin to when the first byte of the request’s response was received. See https://web.dev/articles/ttfb#measure-resource-requests |
| `http.request.worker_start` | `double` | The UNIX timestamp representing the timestamp immediately before dispatching the FetchEvent if a Service Worker thread is already running, or immediately before starting the Service Worker thread if it is not already running. |
| `http.response.body.size` | `integer` | The encoded body size of the response (in bytes). |
| `http.response.header.<key>` | `string[]` | HTTP response headers, <key> being the normalized HTTP Header name (lowercase), the value being the header values. |
| `http.response.header.content-length` | `string` | The size of the message body sent to the recipient (in bytes) |
| `http.response.size` | `integer` | The transfer size of the response (in bytes). |
| `http.response.status_code` | `integer` | The status code of the HTTP response. |
| `http.route` | `string` | The matched route, that is, the path template in the format used by the respective server framework. |
| `http.server.request.time_in_queue` | `double` | The time in milliseconds the request spent in the server queue before processing began. Measured from the X-Request-Start header set by reverse proxies (e.g., Nginx, HAProxy, Heroku) to when the application started handling the request. |
