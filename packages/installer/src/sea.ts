// Runtime support for the standalone (Node SEA) build of the installer.
//
// The npm package resolves node-pty from node_modules like any other
// dependency. A single executable has no node_modules, and node-pty cannot be
// bundled: it loads a native addon by relative path and, on macOS, execs a
// `spawn-helper` binary next to it. `script/build-binary.mjs` therefore embeds
// node-pty's JS plus the target platform's prebuilds as SEA assets, and this
// module writes them back to disk the first time a PTY is needed.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import type * as NodePty from "node-pty";

// Must match the keys written by script/build-binary.mjs.
export const NODE_PTY_ASSET_PREFIX = "node-pty/";
export const NODE_PTY_MANIFEST_KEY = "node-pty.json";

interface NodePtyManifest {
  files: { key: string; executable: boolean }[];
}

type SeaModule = typeof import("node:sea");

let seaModule: SeaModule | null | undefined;

// node:sea only exists on Node >= 20; the npm package also runs on Node
// versions where requiring it would throw, so probe lazily.
function sea(): SeaModule | null {
  if (seaModule === undefined) {
    try {
      seaModule = require("node:sea") as SeaModule;
    } catch {
      seaModule = null;
    }
  }
  return seaModule;
}

export function isSea(): boolean {
  return sea()?.isSea() ?? false;
}

// Per-user cache, never a shared temp dir: the extracted addon is loaded with
// dlopen, so its location must not be writable by other users.
function cacheRoot(): string {
  if (process.platform === "win32") {
    return process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local");
  }
  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Caches");
  }
  return process.env.XDG_CACHE_HOME || join(homedir(), ".cache");
}

function readAsset(key: string): Buffer {
  return Buffer.from(sea()!.getRawAsset(key) as ArrayBuffer);
}

// Writes the embedded node-pty tree to a content-addressed cache directory and
// returns its path. Extraction goes to a scratch directory that is renamed into
// place, so a concurrent or interrupted run never leaves a half-written tree.
export function extractNodePty(): string {
  const manifestRaw = readAsset(NODE_PTY_MANIFEST_KEY);
  const manifest = JSON.parse(manifestRaw.toString("utf8")) as NodePtyManifest;
  const hash = createHash("sha256").update(manifestRaw);
  const files = manifest.files.map((file) => {
    const data = readAsset(file.key);
    hash.update(data);
    return { ...file, data };
  });

  const target = join(
    cacheRoot(),
    "sentry-agent-plugin",
    `node-pty-${hash.digest("hex").slice(0, 16)}`,
  );
  if (existsSync(join(target, "package.json"))) {
    return target;
  }

  const scratch = `${target}.${process.pid}.tmp`;
  rmSync(scratch, { recursive: true, force: true });
  for (const file of files) {
    const path = join(scratch, file.key.slice(NODE_PTY_ASSET_PREFIX.length));
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, file.data, { mode: file.executable ? 0o755 : 0o644 });
  }

  try {
    renameSync(scratch, target);
  } catch (err) {
    rmSync(scratch, { recursive: true, force: true });
    // Another process won the race; its copy is identical.
    if (!existsSync(join(target, "package.json"))) {
      throw err;
    }
  }
  return target;
}

export async function loadNodePty(): Promise<typeof NodePty> {
  if (!isSea()) {
    return import("node-pty");
  }
  const dir = extractNodePty();
  return createRequire(join(dir, "package.json"))("./lib/index.js") as typeof NodePty;
}

// node-pty's Windows backend forks one of its own scripts with
// child_process.fork, which re-executes this binary rather than `node`. Detect
// that invocation and run the requested script instead of the installer.
//
// In a SEA, argv is [binary, binary, ...args], so a fork arrives as
// [binary, binary, script, ...scriptArgs].
export function runForkedNodePtyScript(argv: string[] = process.argv): boolean {
  const script = argv[2];
  if (!script || !isSea()) {
    return false;
  }

  const root = resolve(cacheRoot(), "sentry-agent-plugin");
  const path = resolve(script);
  const rel = relative(root, path);
  if (rel.startsWith("..") || !rel.split(sep)[0]?.startsWith("node-pty-")) {
    return false;
  }

  // Present the script with the argv it would have seen under `node`.
  argv.splice(1, 1);
  createRequire(path)(path);
  return true;
}
