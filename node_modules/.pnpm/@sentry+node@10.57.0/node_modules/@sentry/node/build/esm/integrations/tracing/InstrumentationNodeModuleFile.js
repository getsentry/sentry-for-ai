import { normalize } from 'path';

class InstrumentationNodeModuleFile {
  constructor(name, supportedVersions, patch, unpatch) {
    this.name = normalize(name);
    this.supportedVersions = supportedVersions;
    this.patch = patch;
    this.unpatch = unpatch;
  }
}

export { InstrumentationNodeModuleFile };
//# sourceMappingURL=InstrumentationNodeModuleFile.js.map
