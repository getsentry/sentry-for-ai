import type { DynamicSamplingContext } from '@sentry/core';
import { TraceState } from './TraceState';
/**
 * Generate a TraceState for the given data.
 */
export declare function makeTraceState({ dsc, sampled, }: {
    dsc?: Partial<DynamicSamplingContext>;
    sampled?: boolean;
}): TraceState;
//# sourceMappingURL=makeTraceState.d.ts.map