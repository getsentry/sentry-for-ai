Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const api = require('@opentelemetry/api');
const instrumentation = require('@opentelemetry/instrumentation');
const core = require('@sentry/core');

const PACKAGE_NAME = "@sentry/instrumentation-lru-memoizer";
class LruMemoizerInstrumentation extends instrumentation.InstrumentationBase {
  constructor() {
    super(PACKAGE_NAME, core.SDK_VERSION, {});
  }
  init() {
    return [
      new instrumentation.InstrumentationNodeModuleDefinition(
        "lru-memoizer",
        [">=1.3 <4"],
        (moduleExports) => {
          const asyncMemoizer = function(...args) {
            const origMemoizer = moduleExports.apply(this, args);
            return function(...memoizerArgs) {
              const origCallback = memoizerArgs.pop();
              const callbackWithContext = typeof origCallback === "function" ? api.context.bind(api.context.active(), origCallback) : origCallback;
              return origMemoizer.apply(this, [...memoizerArgs, callbackWithContext]);
            };
          };
          return Object.assign(asyncMemoizer, { sync: moduleExports.sync });
        },
        void 0
        // no need to disable as this instrumentation does not create any spans
      )
    ];
  }
}

exports.LruMemoizerInstrumentation = LruMemoizerInstrumentation;
//# sourceMappingURL=instrumentation.js.map
