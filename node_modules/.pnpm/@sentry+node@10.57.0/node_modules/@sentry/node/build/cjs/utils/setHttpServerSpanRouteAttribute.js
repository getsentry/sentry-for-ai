Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');

function setHttpServerSpanRouteAttribute(route) {
  const activeSpan = core.getActiveSpan();
  if (!activeSpan) {
    return;
  }
  const rootSpan = core.getRootSpan(activeSpan);
  if (!rootSpan) {
    return;
  }
  if (core.spanToJSON(rootSpan).data[core.SEMANTIC_ATTRIBUTE_SENTRY_OP] !== "http.server") {
    return;
  }
  rootSpan.setAttribute("http.route", route);
}

exports.setHttpServerSpanRouteAttribute = setHttpServerSpanRouteAttribute;
//# sourceMappingURL=setHttpServerSpanRouteAttribute.js.map
