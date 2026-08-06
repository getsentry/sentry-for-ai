import type { ResolvedDataCollection } from '../../types/datacollection';
/**
 * Helper function that maps the `sendDefaultPii` boolean flag to the corresponding `DataCollection` configuration.
 * Used as a backward-compatibility bridge when `dataCollection` is not set by the user.
 *
 * TODO(v11): Remove this function along with `sendDefaultPii`. Once `dataCollection` is the only API,
 * the DEFAULTS in `resolveDataCollectionOptions` (including `userInfo: true`) will always apply.
 */
export declare function defaultPiiToCollectionOptions(sendDefaultPii?: boolean): ResolvedDataCollection;
//# sourceMappingURL=defaultPiiToCollectionOptions.d.ts.map