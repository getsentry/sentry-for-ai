# SDK documentation

Per-platform install, `init`, signal code, and build-tool configuration come from the
Sentry docs, not from this library.
Every docs page is also served as Markdown: append `.md` to its path.

The complete catalog is the [platform list](https://docs.sentry.io/platforms.md): every
SDK, and under each one its framework guides (ASP.NET Core, Spring Boot, Sidekiq, …).
The table below is a shortcut for the common platforms, with the files that identify
them.

## Find the platform

Identify the platform from project files, **tell the user what you found and confirm** —
don’t assume from files alone — then fetch that platform’s page from the table or the
platform list.

When more than one row matches, prefer the most specific framework (Next.js over React
or Node.js, NestJS over Node.js, Cloudflare over Node.js, React Native over React).
If nothing matches, or a framework guide fits better than the row you found (an ASP.NET
Core app on .NET, say), pick it from the
[platform list](https://docs.sentry.io/platforms.md).

| Platform | Detect from | Docs | Default products |
| --- | --- | --- | --- |
| Android | `build.gradle` with the Android plugin | [Android](https://docs.sentry.io/platforms/android.md) |  |
| Apple (iOS, macOS, tvOS, watchOS, visionOS) | `Package.swift`, `Podfile`, `*.xcodeproj` | [Apple](https://docs.sentry.io/platforms/apple.md) |  |
| Browser JavaScript | Plain JS, jQuery, static sites, CDN script | [JavaScript](https://docs.sentry.io/platforms/javascript.md) |  |
| Bun | `bun.lock`, `bunfig.toml` | [Bun](https://docs.sentry.io/platforms/javascript/guides/bun.md) |  |
| Cloudflare Workers and Pages | `wrangler.toml`, `wrangler.jsonc` | [Cloudflare](https://docs.sentry.io/platforms/javascript/guides/cloudflare.md) |  |
| Dart | `pubspec.yaml` without Flutter | [Dart](https://docs.sentry.io/platforms/dart.md) |  |
| Deno | `deno.json`, `deno.jsonc` | [Deno](https://docs.sentry.io/platforms/javascript/guides/deno.md) |  |
| .NET | `*.csproj`, `*.sln`, `*.slnx` | [.NET](https://docs.sentry.io/platforms/dotnet.md) |  |
| Elixir | `mix.exs` | [Elixir](https://docs.sentry.io/platforms/elixir.md) |  |
| Flutter | `pubspec.yaml` with a `flutter` dependency | [Flutter](https://docs.sentry.io/platforms/dart/guides/flutter.md) |  |
| Go | `go.mod` | [Go](https://docs.sentry.io/platforms/go.md) |  |
| Laravel | `laravel/framework` in `composer.json` | [Laravel](https://docs.sentry.io/platforms/php/guides/laravel.md) |  |
| NestJS | `@nestjs/core` | [NestJS](https://docs.sentry.io/platforms/javascript/guides/nestjs.md) |  |
| Next.js | `next` | [Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs.md) | Errors, Tracing, Session Replay |
| Node.js | `package.json` without a more specific framework | [Node.js](https://docs.sentry.io/platforms/javascript/guides/node.md) |  |
| PHP | `composer.json` | [PHP](https://docs.sentry.io/platforms/php.md) |  |
| Python | `requirements.txt`, `pyproject.toml`, `Pipfile`, `uv.lock` | [Python](https://docs.sentry.io/platforms/python.md) |  |
| Rails | `rails` in `Gemfile` | [Rails](https://docs.sentry.io/platforms/ruby/guides/rails.md) |  |
| React | `react` without a more specific framework | [React](https://docs.sentry.io/platforms/javascript/guides/react.md) |  |
| React Native and Expo | `react-native`, `expo` | [React Native](https://docs.sentry.io/platforms/react-native.md) |  |
| React Router Framework | `@react-router/dev`, `@sentry/react-router` | [React Router](https://docs.sentry.io/platforms/javascript/guides/react-router.md) |  |
| Ruby | `Gemfile` | [Ruby](https://docs.sentry.io/platforms/ruby.md) |  |
| Svelte | `svelte` | [Svelte](https://docs.sentry.io/platforms/javascript/guides/svelte.md) |  |
| SvelteKit | `@sveltejs/kit` | [SvelteKit](https://docs.sentry.io/platforms/javascript/guides/sveltekit.md) |  |
| Symfony | `symfony/framework-bundle` in `composer.json` | [Symfony](https://docs.sentry.io/platforms/php/guides/symfony.md) |  |
| TanStack Start React | `@tanstack/react-start` | [TanStack Start](https://docs.sentry.io/platforms/javascript/guides/tanstackstart-react.md) |  |

**Default products** are what a new project on that platform gets.
The `.md` page has no product picker: it keeps the code for every optional product
inline, between `___PRODUCT_OPTION_START___ <product>` and
`___PRODUCT_OPTION_END___ <product>` comments (`performance` is Tracing).
When the row lists default products, set up every one of them: keep the code for those
and leave out the blocks for every other product.
An empty cell means take the page’s default `init` as written.

## Go deeper from the platform page

The platform page covers install and a recommended default `init`. Take that default as
written for a new project rather than paring it back, adjusted to the table’s **Default
products** when the row lists them.

Everything else hangs off the same path — follow the platform page’s links rather than
guessing a URL:

- **Signals** — `tracing`, `logs`, `metrics`, `profiling`, `session-replay`,
  `user-feedback`, `crons`, and `agent-tracing` (AI monitoring) sit under the platform
  path. A signal the platform page never links is one the SDK doesn’t support.
- **Integrations** — for popular libraries, some of them will be automatically enabled
  when using a certain SDK, while others have to be explicitly enabled in the project’s
  init config.
- **Build-tool configuration** — live on the platform’s source-map, debug-file, or
  configuration pages.
- **Release options** — `release`, `environment`, and `dist` are on the platform’s
  `configuration/options` page.

A path that doesn’t exist still answers with HTTP 200 and a page titled “Page Not
Found”, so check the title rather than the status before trusting what came back.
