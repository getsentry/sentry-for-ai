Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const path = require('path');

class InstrumentationNodeModuleFile {
  constructor(name, supportedVersions, patch, unpatch) {
    this.name = path.normalize(name);
    this.supportedVersions = supportedVersions;
    this.patch = patch;
    this.unpatch = unpatch;
  }
}

exports.InstrumentationNodeModuleFile = InstrumentationNodeModuleFile;
//# sourceMappingURL=InstrumentationNodeModuleFile.js.map
