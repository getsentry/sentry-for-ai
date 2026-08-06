import { context } from '@opentelemetry/api';
import { InstrumentationBase, InstrumentationNodeModuleDefinition } from '@opentelemetry/instrumentation';
import { SDK_VERSION } from '@sentry/core';

const PACKAGE_NAME = "@sentry/instrumentation-lru-memoizer";
class LruMemoizerInstrumentation extends InstrumentationBase {
  constructor() {
    super(PACKAGE_NAME, SDK_VERSION, {});
  }
  init() {
    return [
      new InstrumentationNodeModuleDefinition(
        "lru-memoizer",
        [">=1.3 <4"],
        (moduleExports) => {
          const asyncMemoizer = function(...args) {
            const origMemoizer = moduleExports.apply(this, args);
            return function(...memoizerArgs) {
              const origCallback = memoizerArgs.pop();
              const callbackWithContext = typeof origCallback === "function" ? context.bind(context.active(), origCallback) : origCallback;
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

export { LruMemoizerInstrumentation };
//# sourceMappingURL=instrumentation.js.map
