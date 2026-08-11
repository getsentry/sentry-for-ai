# Network attributes

Network transport attributes — protocol, connection type, carrier.

| Key | Type | Brief |
| --- | --- | --- |
| `network.connection.effective_type` | `string` | Specifies the effective type of the current connection (e.g. slow-2g, 2g, 3g, 4g). |
| `network.connection.rtt` | `integer` | Specifies the estimated effective round-trip time of the current connection, in milliseconds. |
| `network.connection.type` | `string` | Specifies the type of the current connection (e.g. wifi, ethernet, cellular , etc). |
| `network.local.address` | `string` | Local address of the network connection - IP address or Unix domain socket name. |
| `network.local.port` | `integer` | Local port number of the network connection. |
| `network.peer.address` | `string` | Peer address of the network connection - IP address or Unix domain socket name. |
| `network.peer.port` | `integer` | Peer port number of the network connection. |
| `network.protocol.name` | `string` | OSI application layer or non-OSI equivalent. |
| `network.protocol.version` | `string` | The actual version of the protocol used for network communication. |
| `network.transport` | `string` | OSI transport layer or inter-process communication method. |
| `network.type` | `string` | OSI network layer or non-OSI equivalent. |
