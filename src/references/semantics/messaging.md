# Messaging attributes

Message queue / pubsub attributes — destination, operation, and message id.

| Key | Type | Brief |
| --- | --- | --- |
| `messaging.batch.message_count` | `integer` | The number of messages sent, received, or processed in the scope of the batching operation. |
| `messaging.destination.connection` | `string` | The message destination connection. |
| `messaging.destination.name` | `string` | The message destination name. |
| `messaging.destination.partition.id` | `string` | The identifier of the partition messages are sent to or received from, unique within the messaging.destination.name. |
| `messaging.kafka.message.key` | `string` | Message keys in Kafka are used for grouping alike messages to ensure they’re processed on the same partition. They differ from messaging.message.id in that they’re not unique. If the key is null, the attribute MUST NOT be set. |
| `messaging.kafka.message.tombstone` | `boolean` | A boolean that is true if the message is a tombstone. |
| `messaging.kafka.offset` | `integer` | The offset of a record in the corresponding Kafka partition. |
| `messaging.message.body.size` | `integer` | The size of the message body in bytes. |
| `messaging.message.conversation_id` | `string` | The conversation ID identifying the conversation to which the message belongs, represented as a string. Sometimes called “Correlation ID”. |
| `messaging.message.envelope.size` | `integer` | The size of the message body and metadata in bytes. |
| `messaging.message.id` | `string` | A value used by the messaging system as an identifier for the message, represented as a string. |
| `messaging.message.receive.latency` | `integer` | The latency between when the message was published and received. |
| `messaging.message.retry.count` | `integer` | The amount of attempts to send the message. |
| `messaging.operation.name` | `string` | The name of the messaging operation being performed |
| `messaging.operation.type` | `string` | A string identifying the type of the messaging operation |
| `messaging.rabbitmq.destination.routing_key` | `string` | RabbitMQ message routing key. |
| `messaging.system` | `string` | The messaging system as identified by the client instrumentation. |
