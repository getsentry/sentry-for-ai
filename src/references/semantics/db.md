# Database attributes

Database query attributes — system, operation, statement summary, and collection.

| Key | Type | Brief |
| --- | --- | --- |
| `db.collection.name` | `string` | The name of a collection (table, container) within the database. |
| `db.driver.name` | `string` | The name of the driver used for the database connection. |
| `db.namespace` | `string` | The name of the database being accessed. |
| `db.operation.batch.size` | `integer` | The number of queries included in a batch operation. Operations are only considered batches when they contain two or more operations, and so db.operation.batch.size SHOULD never be 1. |
| `db.operation.name` | `string` | The name of the operation being executed. |
| `db.query.parameter.<key>` | `string` | A query parameter used in db.query.text, with <key> being the parameter name, and the attribute value being a string representation of the parameter value. |
| `db.query.summary` | `string` | A shortened representation of operation(s) in the full query. This attribute must be low-cardinality and should only contain the operation table names. |
| `db.query.text` | `string` | The database parameterized query being executed. Any parameter values (filters, insertion values, etc) should be replaced with parameter placeholders. If applicable, use `db.query.parameter.<key>` to add the parameter value. |
| `db.redis.connection` | `string` | The redis connection name. |
| `db.redis.key` | `string` | The key the Redis command is operating on. |
| `db.redis.parameters` | `string[]` | The array of command parameters given to a redis command. |
| `db.response.status_code` | `string` | Database response status code. The status code returned by the database. Usually it represents an error code, but may also represent partial success, warning, or differentiate between various types of successful outcomes. |
| `db.stored_procedure.name` | `string` | The name of a stored procedure being called. |
| `db.system.name` | `string` | An identifier for the database management system (DBMS) product being used. See [OpenTelemetry docs](https://github.com/open-telemetry/semantic-conventions/blob/main/docs/database/database-spans.md#notes-and-well-known-identifiers-for-dbsystem) for a list of well-known identifiers. |
| `db.user` | `string` | The database user. |
