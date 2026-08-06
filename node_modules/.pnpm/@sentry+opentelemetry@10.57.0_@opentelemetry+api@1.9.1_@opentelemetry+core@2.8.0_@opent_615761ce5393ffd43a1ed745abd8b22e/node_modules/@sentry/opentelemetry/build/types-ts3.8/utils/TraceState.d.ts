import { TraceState as TraceStateInterface } from '@opentelemetry/api';
/**
 * Minimal implementation of the W3C `tracestate` field as a `@opentelemetry/api`
 * `TraceState`. New entries are inserted at the front of the list, and updating
 * an existing key moves it to the front.
 *
 * See https://www.w3.org/TR/trace-context/#tracestate-field for the field spec.
 */
export declare class TraceState implements TraceStateInterface {
    private _internalState;
    /** @inheritDoc */
    set(key: string, value: string): TraceState;
    /** @inheritDoc */
    unset(key: string): TraceState;
    /** @inheritDoc */
    get(key: string): string | undefined;
    /** @inheritDoc */
    serialize(): string;
    private _clone;
}
//# sourceMappingURL=TraceState.d.ts.map
