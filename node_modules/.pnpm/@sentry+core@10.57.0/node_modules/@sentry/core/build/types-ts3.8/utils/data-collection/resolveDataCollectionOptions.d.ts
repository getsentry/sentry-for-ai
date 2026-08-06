import { DataCollection, ResolvedDataCollection } from '../../types/datacollection';
/**
 * Resolves the effective `DataCollection` configuration from client options.
 *
 * Precedence:
 * 1. Fields explicitly set in `dataCollection`
 * 2. If `sendDefaultPii` is set and `dataCollection` is absent, bridge via `defaultPiiToCollectionOptions`
 * 3. Spec defaults
 *
 * TODO(v11): Remove `sendDefaultPii` support and always fall through to DEFAULTS so that `userInfo: true`
 * NOTE: In v10, DEFAULTS only apply when `dataCollection` is explicitly provided.
 * When `dataCollection` is absent, the legacy `sendDefaultPii` bridge is used, which defaults to
 * `userInfo: false` to preserve backward compatibility.
 */
export declare function resolveDataCollectionOptions(options: {
    dataCollection?: DataCollection;
    sendDefaultPii?: boolean;
}): ResolvedDataCollection;
//# sourceMappingURL=resolveDataCollectionOptions.d.ts.map
