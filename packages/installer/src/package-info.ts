import { readFileSync } from "node:fs";
import { join } from "node:path";

interface PackageInfo {
  version: string;
  description: string;
}

// Inlined by script/build-binary.mjs: a single executable has no package.json
// on disk to read.
declare const __INSTALLER_PACKAGE_INFO__: PackageInfo | undefined;

export const { version, description }: PackageInfo =
  typeof __INSTALLER_PACKAGE_INFO__ !== "undefined"
    ? __INSTALLER_PACKAGE_INFO__
    : JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf8"));
