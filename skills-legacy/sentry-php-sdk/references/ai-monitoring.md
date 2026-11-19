# AI Monitoring — Sentry PHP / Laravel SDK

> Laravel AI support requires `sentry/sentry-laravel` >= 4.27.0, Laravel 12.x or later, and `laravel/ai`.

Sentry's Laravel AI integration automatically instruments Laravel AI agents, model calls, tools, embeddings, token usage, model/provider metadata, and conversation IDs. Use this reference when a Laravel app has `laravel/ai` installed or the user asks to monitor Laravel AI agents.

For non-Laravel PHP AI libraries, use manual `gen_ai.*` spans following the conventions in `sentry-setup-ai-monitoring`.

---

## Detect

```bash
# Confirm Laravel
ls artisan 2>/dev/null && echo "Laravel detected"
grep -E '"laravel/framework"' composer.json 2>/dev/null

# Confirm Sentry and Laravel AI
grep -E '"sentry/sentry-laravel"|"laravel/ai"' composer.json composer.lock 2>/dev/null

# Check tracing and PII settings
grep -E 'SENTRY_TRACES_SAMPLE_RATE|SENTRY_SEND_DEFAULT_PII' .env config/sentry.php 2>/dev/null
```

**Interpretation:**

- If `laravel/ai` is present, use automatic Laravel AI instrumentation.
- If `sentry/sentry-laravel` is below 4.27.0, upgrade before expecting AI spans.
- If `SENTRY_TRACES_SAMPLE_RATE` is missing or `0`, AI spans will not be sent.
- If `SENTRY_SEND_DEFAULT_PII` is false or missing, prompts, tool arguments, responses, and embeddings input are redacted.

---

## Install

Install or upgrade Sentry Laravel:

```bash
composer require sentry/sentry-laravel "^4.27.0"
```

Install and configure Laravel AI:

```bash
composer require laravel/ai
php artisan vendor:publish --provider="Laravel\Ai\AiServiceProvider"
php artisan migrate
```

Add provider keys to `.env` as needed:

```ini
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key
```

Make sure Sentry is installed normally for Laravel. For Laravel 11+, `bootstrap/app.php` must register the exception handler:

```php
use Sentry\Laravel\Integration;

return Application::configure(basePath: dirname(__DIR__))
    ->withExceptions(function (Exceptions $exceptions) {
        Integration::handles($exceptions);
    })->create();
```

Publish Sentry config if it has not been published yet:

```bash
php artisan sentry:publish --dsn=YOUR_DSN
```

---

## Configure

Laravel AI instrumentation is enabled automatically when all of these are true:

- `sentry/sentry-laravel` >= 4.27.0 is installed
- `laravel/ai` is installed
- Sentry tracing is enabled

Enable tracing in `.env`:

```ini
SENTRY_TRACES_SAMPLE_RATE=1.0
```

Use `1.0` in development. For production, either use a lower global rate or configure sampling so AI routes, queue jobs, and CLI commands that run agents are sampled at 100%.

### Prompt and Response Capture

Sentry considers LLM prompts, tool arguments, tool results, responses, and embeddings input to be PII. Do not enable capture unless the user confirms the application's privacy policy and data retention settings allow it.

After explicit confirmation, enable PII capture:

```ini
SENTRY_SEND_DEFAULT_PII=true
```

Without this setting, Laravel AI spans still appear, but input/output attributes are omitted and Conversations may not have message content.

---

## Verify

Create an agent and a tool:

```bash
php artisan make:agent TimeAgent
php artisan make:tool GetCurrentTime
```

Update the tool to return the current time:

```php
<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class GetCurrentTime implements Tool
{
    public function description(): Stringable|string
    {
        return 'Get the current date and time.';
    }

    public function handle(Request $request): Stringable|string
    {
        return now()->toDateTimeString();
    }

    public function schema(JsonSchema $schema): array
    {
        return [];
    }
}
```

Register the tool on the agent:

```php
<?php

namespace App\Ai\Agents;

use App\Ai\Tools\GetCurrentTime;
use Laravel\Ai\Concerns\RemembersConversations;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\Conversational;
use Laravel\Ai\Contracts\HasTools;
use Laravel\Ai\Promptable;
use Stringable;

class TimeAgent implements Agent, Conversational, HasTools
{
    use Promptable, RemembersConversations;

    public function instructions(): Stringable|string
    {
        return 'You are a helpful assistant. Use your tools when asked about the time.';
    }

    public function messages(): iterable
    {
        return [];
    }

    public function tools(): iterable
    {
        return [new GetCurrentTime];
    }
}
```

Trigger the agent from a route or command. Example route:

```php
use App\Ai\Agents\TimeAgent;
use Illuminate\Support\Facades\Route;

Route::get('/debug-ai', function () {
    $response = (new TimeAgent)->prompt('What time is it?');

    return $response->text;
});
```

Visit `/debug-ai`, then check Sentry Traces and the AI Agents dashboard. It can take a few moments for data to appear.

For CLI commands and other non-HTTP entry points, make sure there is a Sentry transaction around the agent call so child AI spans are captured.

---

## Captured Data

Laravel AI instrumentation captures:

| Span op | Captures |
|---------|----------|
| `gen_ai.invoke_agent` | Agent prompt lifecycle, agent name, model, provider, available tools, conversation ID |
| `gen_ai.chat` | AI provider chat request, model/provider, finish reason, token usage |
| `gen_ai.execute_tool` | Tool name, description, arguments, result |
| `gen_ai.embeddings` | Embedding model/provider, token usage, input when PII capture is enabled |

Common attributes include:

| Attribute | Notes |
|-----------|-------|
| `gen_ai.operation.name` | `invoke_agent`, `chat`, `execute_tool`, or `embeddings` |
| `gen_ai.agent.name` | Agent class/name where available |
| `gen_ai.request.model` | Requested model |
| `gen_ai.response.model` | Actual response model |
| `gen_ai.provider.name` | Provider name, such as `openai` or `anthropic` |
| `gen_ai.conversation.id` | Used by Explore > Conversations |
| `gen_ai.usage.input_tokens` | Total input tokens, including cached tokens |
| `gen_ai.usage.output_tokens` | Total output tokens, including reasoning tokens |
| `gen_ai.usage.total_tokens` | Input + output tokens |
| `gen_ai.input.messages` | Prompt messages, only with `SENTRY_SEND_DEFAULT_PII=true` |
| `gen_ai.output.messages` | Response messages, only with `SENTRY_SEND_DEFAULT_PII=true` |
| `gen_ai.tool.call.arguments` | Tool arguments, only with `SENTRY_SEND_DEFAULT_PII=true` |
| `gen_ai.tool.call.result` | Tool result, only with `SENTRY_SEND_DEFAULT_PII=true` |

Streaming agent responses are supported for both `prompt()` and `stream()` calls.

---

## Conversations

Sentry Conversations groups related AI spans by `gen_ai.conversation.id`.

In Laravel AI, this is automatic when the agent implements `Conversational` and uses `RemembersConversations`. The integration reads Laravel AI's `conversationId` and attaches it to AI spans.

To continue a conversation, pass the previous conversation ID back into Laravel AI:

```php
use App\Ai\Agents\TimeAgent;
use App\Models\User;

$user = User::firstOrFail();
$conversationId = null;

foreach (['Hello', 'What did I just ask you?'] as $message) {
    $agent = $conversationId
        ? (new TimeAgent)->continue($conversationId, as: $user)
        : (new TimeAgent)->forUser($user);

    $response = $agent->prompt($message);
    $conversationId = $response->conversationId;
}
```

Both prompts appear under the same conversation in **Explore > Conversations**.

---

## Feature Flags

You can disable Laravel AI span types in `config/sentry.php` under `tracing.features`:

```php
'features' => [
    // Master switch for all AI spans (requires laravel/ai)
    'gen_ai' => env('SENTRY_TRACE_GEN_AI_ENABLED', true),

    // Individual span types
    'gen_ai_invoke_agent' => env('SENTRY_TRACE_GEN_AI_INVOKE_AGENT_ENABLED', true),
    'gen_ai_chat' => env('SENTRY_TRACE_GEN_AI_CHAT_ENABLED', true),
    'gen_ai_execute_tool' => env('SENTRY_TRACE_GEN_AI_EXECUTE_TOOL_ENABLED', true),
    'gen_ai_embeddings' => env('SENTRY_TRACE_GEN_AI_EMBEDDINGS_ENABLED', true),
],
```

Set `gen_ai` to `false` to disable all Laravel AI tracing. Use the individual switches to disable only one span type.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No AI spans | Verify `sentry/sentry-laravel >=4.27.0`, `laravel/ai` is installed, and `SENTRY_TRACES_SAMPLE_RATE > 0` |
| Agent spans appear but prompts are missing | Confirm the user approved prompt/output capture and set `SENTRY_SEND_DEFAULT_PII=true` |
| Conversations are not grouped | Implement `Conversational`, use `RemembersConversations`, and pass the previous `$response->conversationId` to `continue()` |
| CLI agent calls have no spans | Wrap the CLI operation in a Sentry transaction or run the agent inside a traced queue/job/request |
| Tool spans are missing | Confirm the agent implements `HasTools` and tool tracing is not disabled by `SENTRY_TRACE_GEN_AI_EXECUTE_TOOL_ENABLED=false` |
