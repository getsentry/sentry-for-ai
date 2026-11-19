# Exception attributes

Exception type, message, and stack details on error spans.

| Key | Type | Brief |
| --- | --- | --- |
| `exception.escaped` | `boolean` | SHOULD be set to true if the exception event is recorded at a point where it is known that the exception is escaping the scope of the span. |
| `exception.message` | `string` | The error message. |
| `exception.stacktrace` | `string` | A stacktrace as a string in the natural representation for the language runtime. The representation is to be determined and documented by each language SIG. |
| `exception.type` | `string` | The type of the exception (its fully-qualified class name, if applicable). The dynamic type of the exception should be preferred over the static type in languages that support it. |
