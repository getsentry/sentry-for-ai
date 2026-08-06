import { InstrumentationModuleFile } from '@opentelemetry/instrumentation';
export declare class InstrumentationNodeModuleFile implements InstrumentationModuleFile {
    name: string;
    supportedVersions: string[];
    patch: (moduleExports: any, moduleVersion?: string) => any;
    unpatch: (moduleExports?: any, moduleVersion?: string) => void;
    constructor(name: string, supportedVersions: string[], patch: (moduleExports: any, moduleVersion?: string) => any, unpatch: (moduleExports?: any, moduleVersion?: string) => void);
}
//# sourceMappingURL=InstrumentationNodeModuleFile.d.ts.map
