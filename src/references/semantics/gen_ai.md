# Gen AI attributes

LLM and agent attributes — model, tokens, cost, tools, and conversation id.

| Key | Type | Brief |
| --- | --- | --- |
| `gen_ai.agent.name` | `string` | The name of the agent being used. |
| `gen_ai.context.utilization` | `double` | The fraction of the model context window utilized by this generation. |
| `gen_ai.context.window_size` | `integer` | The maximum context window size supported by the model for this generation. |
| `gen_ai.conversation.id` | `string` | The unique identifier for a conversation (session, thread), used to store and correlate messages within this conversation. |
| `gen_ai.cost.cache_creation.input_tokens` | `double` | The cost of input tokens written to cache in USD. |
| `gen_ai.cost.cache_read.input_tokens` | `double` | The cost of cached input tokens in USD. |
| `gen_ai.cost.input_tokens` | `double` | The total cost of all input tokens in USD (includes cached and cache creation tokens). |
| `gen_ai.cost.output_tokens` | `double` | The total cost of all output tokens in USD (includes reasoning tokens). |
| `gen_ai.cost.reasoning.output_tokens` | `double` | The cost of reasoning output tokens in USD. |
| `gen_ai.cost.total_tokens` | `double` | The total cost for the tokens used. |
| `gen_ai.embeddings.input` | `string` | The input to the embeddings model. |
| `gen_ai.function_id` | `string` | Framework-specific tracing label for the execution of a function or other unit of execution in a generative AI system. |
| `gen_ai.input.messages` | `string` | The messages passed to the model. It has to be a stringified version of an array of objects. The `role` attribute of each object must be `"user"`, `"assistant"`, `"tool"`, or `"system"`. For messages of the role `"tool"`, the `content` can be a string or an arbitrary object with information about the tool call. For other messages the `content` can be either a string or a list of objects in the format `{type: "text", text:"..."}`. |
| `gen_ai.operation.name` | `string` | The name of the operation being performed. It has the following list of well-known values: ‘chat’, ‘create_agent’, ‘embeddings’, ‘execute_tool’, ‘generate_content’, ‘invoke_agent’, ‘text_completion’. If one of them applies, then that value MUST be used. Otherwise a custom value MAY be used. |
| `gen_ai.operation.type` | `string` | The type of AI operation. Must be one of ‘agent’ (invoke_agent and create_agent spans), ‘ai_client’ (any LLM call), ‘tool’ (execute_tool spans), ‘handoff’ (handoff spans), ‘other’ (input and output processors, skill loading, guardrails etc.) . Added during ingestion based on span.op and gen_ai.operation.type. Used to filter and aggregate data in the UI |
| `gen_ai.output.messages` | `string` | The model’s response messages. It has to be a stringified version of an array of message objects, which can include text responses and tool calls. |
| `gen_ai.pipeline.name` | `string` | Name of the AI pipeline or chain being executed. |
| `gen_ai.prompt.name` | `string` | The name of the prompt that uniquely identifies it. |
| `gen_ai.provider.name` | `string` | The Generative AI provider as identified by the client or server instrumentation. |
| `gen_ai.request.frequency_penalty` | `double` | Used to reduce repetitiveness of generated tokens. The higher the value, the stronger a penalty is applied to previously present tokens, proportional to how many times they have already appeared in the prompt or prior generation. |
| `gen_ai.request.max_tokens` | `integer` | The maximum number of tokens to generate in the response. |
| `gen_ai.request.model` | `string` | The model identifier being used for the request. |
| `gen_ai.request.presence_penalty` | `double` | Used to reduce repetitiveness of generated tokens. Similar to frequency_penalty, except that this penalty is applied equally to all tokens that have already appeared, regardless of their exact frequencies. |
| `gen_ai.request.reasoning.level` | `string` | The reasoning or thinking effort level requested for a GenAI model. |
| `gen_ai.request.seed` | `string` | The seed, ideally models given the same seed and same other parameters will produce the exact same output. |
| `gen_ai.request.stop_sequences` | `string[]` | List of sequences that the model will use to stop generating further tokens. |
| `gen_ai.request.temperature` | `double` | For an AI model call, the temperature parameter. Temperature essentially means how random the output will be. |
| `gen_ai.request.top_k` | `integer` | Limits the model to only consider the K most likely next tokens, where K is an integer (e.g., top_k=20 means only the 20 highest probability tokens are considered). |
| `gen_ai.request.top_p` | `double` | Limits the model to only consider tokens whose cumulative probability mass adds up to p, where p is a float between 0 and 1 (e.g., top_p=0.7 means only tokens that sum up to 70% of the probability mass are considered). |
| `gen_ai.response.finish_reasons` | `string` | The reason why the model stopped generating. |
| `gen_ai.response.id` | `string` | Unique identifier for the completion. |
| `gen_ai.response.model` | `string` | The vendor-specific ID of the model used. |
| `gen_ai.response.streaming` | `boolean` | Whether or not the AI model call’s response was streamed back asynchronously |
| `gen_ai.response.time_to_first_chunk` | `double` | Time in seconds when the first response content chunk arrived in streaming responses. |
| `gen_ai.response.tokens_per_second` | `double` | The total output tokens per seconds throughput |
| `gen_ai.system_instructions` | `string` | The system instructions passed to the model. |
| `gen_ai.tool.call.arguments` | `string` | The arguments of the tool call. It has to be a stringified version of the arguments to the tool. |
| `gen_ai.tool.call.result` | `string` | The result of the tool call. It has to be a stringified version of the result of the tool. |
| `gen_ai.tool.definitions` | `string` | The list of source system tool definitions available to the GenAI agent or model. |
| `gen_ai.tool.description` | `string` | The description of the tool being used. |
| `gen_ai.tool.name` | `string` | Name of the tool utilized by the agent. |
| `gen_ai.usage.cache_creation.input_tokens` | `integer` | The number of tokens written to the cache when processing the AI input (prompt). |
| `gen_ai.usage.cache_read.input_tokens` | `integer` | The number of cached tokens used to process the AI input (prompt). |
| `gen_ai.usage.input_tokens` | `integer` | The number of tokens used to process the AI input (prompt) including cached input tokens. |
| `gen_ai.usage.output_tokens` | `integer` | The number of tokens used for creating the AI output (including reasoning tokens). |
| `gen_ai.usage.reasoning.output_tokens` | `integer` | The number of tokens used for reasoning to create the AI output. |
| `gen_ai.usage.total_tokens` | `integer` | The total number of tokens used to process the prompt. (input tokens plus output todkens) |
