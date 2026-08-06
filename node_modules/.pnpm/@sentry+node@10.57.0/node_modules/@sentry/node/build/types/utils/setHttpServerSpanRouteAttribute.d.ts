/**
 * Set the `http.route` attribute on the root HTTP server span for the current trace.
 *
 * No-op when there is no active span, no root span, or the root span is not an
 * `http.server` span — so framework instrumentations can call this unconditionally
 * without risking attribute pollution on non-HTTP root spans.
 */
export declare function setHttpServerSpanRouteAttribute(route: string): void;
//# sourceMappingURL=setHttpServerSpanRouteAttribute.d.ts.map
