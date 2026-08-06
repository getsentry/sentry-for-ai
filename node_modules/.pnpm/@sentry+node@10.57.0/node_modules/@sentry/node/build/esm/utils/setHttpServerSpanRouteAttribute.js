import { getActiveSpan, getRootSpan, spanToJSON, SEMANTIC_ATTRIBUTE_SENTRY_OP } from '@sentry/core';

function setHttpServerSpanRouteAttribute(route) {
  const activeSpan = getActiveSpan();
  if (!activeSpan) {
    return;
  }
  const rootSpan = getRootSpan(activeSpan);
  if (!rootSpan) {
    return;
  }
  if (spanToJSON(rootSpan).data[SEMANTIC_ATTRIBUTE_SENTRY_OP] !== "http.server") {
    return;
  }
  rootSpan.setAttribute("http.route", route);
}

export { setHttpServerSpanRouteAttribute };
//# sourceMappingURL=setHttpServerSpanRouteAttribute.js.map
