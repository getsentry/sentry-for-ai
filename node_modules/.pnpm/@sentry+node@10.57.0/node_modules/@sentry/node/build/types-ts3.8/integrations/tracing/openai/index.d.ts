import { OpenAiOptions } from '@sentry/core';
export declare const instrumentOpenAi: ((options?: OpenAiOptions | undefined) => import("@opentelemetry/instrumentation").Instrumentation<import("@opentelemetry/instrumentation").InstrumentationConfig>) & {
    id: string;
};
/**
 * Adds Sentry tracing instrumentation for the OpenAI SDK.
 *
 * This integration is enabled by default.
 *
 * When configured, this integration automatically instruments OpenAI SDK client instances
 * to capture telemetry data following OpenTelemetry Semantic Conventions for Generative AI.
 *
 * @example
 * ```javascript
 * import * as Sentry from '@sentry/node';
 *
 * Sentry.init({
 *   integrations: [Sentry.openAIIntegration()],
 * });
 * ```
 *
 * ## Options
 *
 * - `recordInputs`: Whether to record input messages/prompts (default: follows `dataCollection.genAI.inputs`, or the deprecated `sendDefaultPii` option)
 * - `recordOutputs`: Whether to record response text (default: follows `dataCollection.genAI.outputs`, or the deprecated `sendDefaultPii` option)
 *
 * ### Default Behavior
 *
 * By default, the integration will:
 * - Record inputs and outputs based on `dataCollection.genAI` in your Sentry client options
 *   (or the deprecated `sendDefaultPii` option, for backwards compatibility)
 * - Integration-level `recordInputs`/`recordOutputs` options take precedence over global config
 *
 * @example
 * ```javascript
 * // Always record inputs and outputs regardless of global dataCollection config
 * Sentry.init({
 *   integrations: [
 *     Sentry.openAIIntegration({
 *       recordInputs: true,
 *       recordOutputs: true
 *     })
 *   ],
 * });
 *
 * // Never record inputs/outputs regardless of global dataCollection config
 * Sentry.init({
 *   dataCollection: { genAI: { inputs: true, outputs: true } },
 *   integrations: [
 *     Sentry.openAIIntegration({
 *       recordInputs: false,
 *       recordOutputs: false
 *     })
 *   ],
 * });
 * ```
 *
 */
export declare const openAIIntegration: (options?: OpenAiOptions | undefined) => import("@sentry/core").Integration;
//# sourceMappingURL=index.d.ts.map
