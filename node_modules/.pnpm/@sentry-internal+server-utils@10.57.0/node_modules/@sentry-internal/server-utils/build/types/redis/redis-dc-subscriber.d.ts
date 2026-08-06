import type { Span } from '@sentry/core';
export declare const REDIS_DC_CHANNEL_COMMAND = "node-redis:command";
export declare const REDIS_DC_CHANNEL_BATCH = "node-redis:batch";
export declare const REDIS_DC_CHANNEL_CONNECT = "node-redis:connect";
export declare const IOREDIS_DC_CHANNEL_COMMAND = "ioredis:command";
export declare const IOREDIS_DC_CHANNEL_CONNECT = "ioredis:connect";
/**
 * Shape of the `node-redis:command` channel payload published by node-redis.
 *
 * Both `command` and `args` are already redacted by node-redis itself (see
 * `sanitizeArgs` in @redis/client) using the OTel `redis-common` rules. The
 * arg array is `[<command>, <safe arg>, ..., '?', ...]` — `?` replaces any
 * value the library considers sensitive. Subscribers can emit `args` directly
 * as `db.statement` without further serialization.
 */
export interface RedisCommandData {
    command: string;
    /** First arg is the command name itself; consumers should slice it off. */
    args: string[];
    database?: number;
    serverAddress?: string;
    serverPort?: number;
    result?: unknown;
    error?: Error;
}
/**
 * Shape of the `ioredis:command` channel payload published by ioredis >= 5.11.0.
 *
 * As with node-redis, args are already sanitized by ioredis (`sanitizeArgs` in
 * `lib/tracing.ts`) before publishing. Unlike node-redis, the command name is
 * NOT prepended to `args`.
 */
export interface IORedisCommandData {
    command: string;
    args: string[];
    batchMode?: 'MULTI';
    batchSize?: number;
    database?: number;
    serverAddress?: string;
    serverPort?: number;
    result?: unknown;
    error?: Error;
}
/** Shape of the `node-redis:batch` channel payload published by node-redis. */
export interface RedisBatchData {
    batchMode?: 'MULTI' | 'PIPELINE';
    batchSize?: number;
    database?: number;
    clientId?: string | number;
    serverAddress?: string;
    serverPort?: number;
    result?: unknown[];
    error?: Error;
}
/** Shape of the `*:connect` channel payload published by node-redis and ioredis. */
export interface RedisConnectData {
    serverAddress?: string;
    serverPort?: number;
    url?: string;
    error?: Error;
}
/**
 * Optional callback invoked once the redis command response arrives. Useful
 * for attaching response-derived attributes (e.g. cache hit/miss, payload size).
 *
 * Mirrors `@opentelemetry/instrumentation-ioredis`' response hook so existing
 * Sentry node code (`cacheResponseHook`) can be reused unchanged.
 */
export type RedisDiagnosticChannelResponseHook = (span: Span, cmdName: string, cmdArgs: string[], result: unknown) => void;
/**
 * Payload type observed by tracing-channel subscribers — the channel payload
 * with `_sentrySpan` stamped on it by the start handler so async/error
 * handlers downstream can read it back.
 */
export type RedisTracingChannelContextWithSpan<T> = T & {
    _sentrySpan?: Span;
};
/** Subscriber object accepted by {@link RedisTracingChannel.subscribe}. */
export interface RedisTracingChannelSubscribers<T> {
    start: (data: RedisTracingChannelContextWithSpan<T>) => void;
    asyncStart: (data: RedisTracingChannelContextWithSpan<T>) => void;
    asyncEnd: (data: RedisTracingChannelContextWithSpan<T>) => void;
    end: (data: RedisTracingChannelContextWithSpan<T>) => void;
    error: (data: RedisTracingChannelContextWithSpan<T>) => void;
}
/** Minimal tracing-channel surface the subscriber depends on. */
export interface RedisTracingChannel<T extends object> {
    subscribe(subs: Partial<RedisTracingChannelSubscribers<T>>): void;
}
/**
 * Platform-provided factory that returns a tracing channel for the given
 * channel name. Implementations are responsible for ensuring that, when the
 * channel's `start` event fires, the span returned by `transformStart(data)`
 * ends up stored on `data._sentrySpan` so the subscriber's `asyncEnd`/`error`
 * handlers can read it.
 *
 * - Node passes `@sentry/opentelemetry/tracing-channel` which uses
 *   `bindStore` to also propagate the span as the active OTel context.
 * - Deno (and other non-OTel runtimes) pass a portable wrapper around
 *   `node:diagnostics_channel.tracingChannel` that just stamps
 *   `data._sentrySpan` in `start` without `bindStore`.
 */
export type RedisTracingChannelFactory = <T extends object>(name: string, transformStart: (data: T) => Span) => RedisTracingChannel<T>;
/**
 * Subscribe Sentry span handlers to node-redis and ioredis diagnostics-channel
 * events: `node-redis:command`/`:batch`/`:connect` (published by node-redis
 * >= 5.12.0) and `ioredis:command`/`:connect` (published by ioredis >= 5.11.0).
 *
 * On older client versions the channels are never published to, so subscribers
 * are inert — there is no double-instrumentation against any IITM-based
 * patcher gated to those older versions.
 *
 * Idempotent: subsequent calls update the response hook but do not
 * re-subscribe.
 */
export declare function subscribeRedisDiagnosticChannels(tracingChannel: RedisTracingChannelFactory, responseHook?: RedisDiagnosticChannelResponseHook): void;
/** Test-only: reset module-local subscribe state. */
export declare function _resetRedisDiagnosticChannelsForTesting(): void;
//# sourceMappingURL=redis-dc-subscriber.d.ts.map