# AWS attributes

AWS service, region, and request attributes for cloud instrumentation.

| Key | Type | Brief |
| --- | --- | --- |
| `aws.cloudwatch.logs.log_group` | `string` | The name of the CloudWatch Logs log group |
| `aws.cloudwatch.logs.log_stream` | `string` | The name of the CloudWatch Logs log stream |
| `aws.cloudwatch.logs.url` | `string` | The URL to the CloudWatch Logs log group |
| `aws.dynamodb.attribute_definitions` | `string[]` | The JSON-serialized value of each item in the `AttributeDefinitions` request field. |
| `aws.dynamodb.consistent_read` | `boolean` | The value of the `ConsistentRead` request parameter. |
| `aws.dynamodb.consumed_capacity` | `string[]` | The JSON-serialized value of each item in the `ConsumedCapacity` response field. |
| `aws.dynamodb.count` | `integer` | The value of the `Count` response parameter. |
| `aws.dynamodb.exclusive_start_table` | `string` | The value of the `ExclusiveStartTableName` request parameter. |
| `aws.dynamodb.global_secondary_index_updates` | `string[]` | The JSON-serialized value of each item in the `GlobalSecondaryIndexUpdates` request field. |
| `aws.dynamodb.global_secondary_indexes` | `string[]` | The JSON-serialized value of each item of the `GlobalSecondaryIndexes` request field. |
| `aws.dynamodb.index_name` | `string` | The value of the `IndexName` request parameter. |
| `aws.dynamodb.item_collection_metrics` | `string` | The JSON-serialized value of the `ItemCollectionMetrics` response field. |
| `aws.dynamodb.limit` | `integer` | The value of the `Limit` request parameter. |
| `aws.dynamodb.local_secondary_indexes` | `string[]` | The JSON-serialized value of each item of the `LocalSecondaryIndexes` request field. |
| `aws.dynamodb.projection` | `string` | The value of the `ProjectionExpression` request parameter. |
| `aws.dynamodb.provisioned_read_capacity` | `double` | The value of the `ProvisionedThroughput.ReadCapacityUnits` request parameter. |
| `aws.dynamodb.provisioned_write_capacity` | `double` | The value of the `ProvisionedThroughput.WriteCapacityUnits` request parameter. |
| `aws.dynamodb.scan_forward` | `boolean` | The value of the `ScanIndexForward` request parameter. |
| `aws.dynamodb.scanned_count` | `integer` | The value of the `ScannedCount` response parameter. |
| `aws.dynamodb.segment` | `integer` | The value of the `Segment` request parameter. |
| `aws.dynamodb.select` | `string` | The value of the `Select` request parameter. |
| `aws.dynamodb.table_count` | `integer` | The number of items in the `TableNames` response parameter. |
| `aws.dynamodb.table_names` | `string[]` | The keys in the `RequestItems` object field. |
| `aws.dynamodb.total_segments` | `integer` | The value of the `TotalSegments` request parameter. |
| `aws.extended_request_id` | `string` | The AWS extended request ID as returned in the response headers. |
| `aws.kinesis.stream_name` | `string` | The name of the AWS Kinesis stream the request refers to. |
| `aws.lambda.execution_duration_in_millis` | `double` | The execution duration of the Lambda function invocation in milliseconds |
| `aws.lambda.invoked_arn` | `string` | The full ARN of the Lambda function that was invoked |
| `aws.lambda.remaining_time_in_millis` | `double` | The remaining time in milliseconds before the Lambda function times out |
| `aws.log.group.names` | `string[]` | The name(s) of the AWS log group(s) an application is writing to. |
| `aws.log.stream.names` | `string[]` | The name(s) of the AWS log stream(s) an application is writing to. |
| `aws.request_id` | `string` | The AWS request ID as returned in the response headers. |
| `aws.s3.bucket` | `string` | The S3 bucket name the request refers to. |
| `aws.secretsmanager.secret.arn` | `string` | The ARN of the Secret stored in Secrets Manager. |
| `aws.sns.topic.arn` | `string` | The ARN of the AWS SNS Topic. An Amazon SNS topic is a logical access point that acts as a communication channel. |
| `aws.step_functions.activity.arn` | `string` | The ARN of the AWS Step Functions Activity. |
| `aws.step_functions.state_machine.arn` | `string` | The ARN of the AWS Step Functions State Machine. |
