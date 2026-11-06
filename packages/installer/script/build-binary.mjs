#!/usr/bin/env node
// Builds the installer as standalone executables (Node SEA) via fossilize,
// the same toolchain getsentry/cli uses for its binaries.
//
//   node script/build-binary.mjs                      # every target
//   node script/build-binary.mjs --single             # the host platform only
//   node script/build-binary.mjs --target darwin-x64  # one target (cross-compiles)
//
// Output, one per target, named for the release assets:
//
//   dist-bin/sentry-agent-plugin-{darwin,linux}-{arm64,x64}
//   dist-bin/sentry-agent-plugin-windows-{arm64,x64}.exe
//
// RELEASE_BUILD=1 also writes a gzipped copy of each binary next to it.
//
// Two steps: rolldown bundles src/bin.ts and every dependency except node-pty
// into one CJS file, then fossilize injects it into a Node binary per target.
// node-pty ships a native addon (and, on macOS, a spawn-helper executable) that
// cannot live inside the bundle, so its JS and the target's prebuilds are
// embedded as SEA assets and extracted at runtime by src/sea.ts.
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { cp, mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, posix, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { gzip } from "node:zlib";
import { build } from "rolldown";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);

const OUTPUT_NAME = "sentry-agent-plugin";
const BUILD_DIR = "dist-build";
const OUT_DIR = "dist-bin";
const BUNDLE = join(BUILD_DIR, "bin.cjs");
// Must match NODE_PTY_ASSET_PREFIX and NODE_PTY_MANIFEST_KEY in src/sea.ts.
const NODE_PTY_ASSET_PREFIX = "node-pty";
const NODE_PTY_MANIFEST_KEY = "node-pty.json";
// "lts" resolves to the newest LTS release; override to pin a version.
const NODE_VERSION = process.env.FOSSILIZE_NODE_VERSION || "lts";

// Release naming (and node-pty's prebuild dirs) say win32/windows; fossilize
// uses Node's archive naming, "win".
const TARGETS = [
  "darwin-arm64",
  "darwin-x64",
  "linux-arm64",
  "linux-x64",
  "windows-arm64",
  "windows-x64",
];

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const require = createRequire(import.meta.url);

function parseTargets(argv) {
  const index = argv.indexOf("--target");
  if (index !== -1) {
    const target = argv[index + 1];
    if (!TARGETS.includes(target)) {
      throw new Error(`Unknown target "${target}". Valid: ${TARGETS.join(", ")}`);
    }
    return [target];
  }
  if (argv.includes("--single")) {
    const os = process.platform === "win32" ? "windows" : process.platform;
    const host = `${os}-${process.arch}`;
    if (!TARGETS.includes(host)) {
      throw new Error(`Unsupported host platform: ${host}`);
    }
    return [host];
  }
  return TARGETS;
}

function targetInfo(target) {
  const [os, arch] = target.split("-");
  return {
    fossilizePlatform: `${os === "windows" ? "win" : os}-${arch}`,
    prebuild: `${os === "windows" ? "win32" : os}-${arch}`,
    file: `${OUTPUT_NAME}-${target}${os === "windows" ? ".exe" : ""}`,
  };
}

async function bundle() {
  console.log(`Bundling ${BUNDLE}...`);
  await build({
    input: "src/bin.ts",
    platform: "node",
    resolve: { conditionNames: ["node", "require"] },
    // Loaded from the extracted SEA assets instead; see src/sea.ts.
    external: ["node-pty"],
    transform: {
      define: {
        __INSTALLER_PACKAGE_INFO__: JSON.stringify({
          version: pkg.version,
          description: pkg.description,
        }),
        // consola's env lookup falls back to import.meta.env when process.env
        // is missing, which never happens under Node; CJS has no import.meta.
        "import.meta.env": "undefined",
      },
    },
    output: {
      file: BUNDLE,
      format: "cjs",
      codeSplitting: false,
      minify: true,
    },
  });
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(path);
    } else if (entry.isFile()) {
      yield path;
    }
  }
}

// Stages the subset of node-pty a target needs to run: package.json, lib/
// (without tests or sourcemaps), and that target's prebuilds. Returns the
// fossilize --assets specs that embed it.
async function stageNodePty(target, prebuild) {
  const source = dirname(require.resolve("node-pty/package.json"));
  const stage = join(BUILD_DIR, target, NODE_PTY_ASSET_PREFIX);
  await rm(stage, { recursive: true, force: true });
  await mkdir(stage, { recursive: true });

  const prebuildDir = join(source, "prebuilds", prebuild);
  try {
    statSync(prebuildDir);
  } catch {
    throw new Error(`node-pty ships no prebuild for ${prebuild} (looked in ${prebuildDir})`);
  }

  await cp(join(source, "package.json"), join(stage, "package.json"));
  await cp(join(source, "lib"), join(stage, "lib"), {
    recursive: true,
    filter: (path) => !path.endsWith(".map") && !/\.test\.js$/.test(path),
  });
  await cp(prebuildDir, join(stage, "prebuilds", prebuild), {
    recursive: true,
    // Debug symbols are only useful to node-pty's own developers.
    filter: (path) => !path.endsWith(".pdb"),
  });

  const files = [];
  for await (const path of walk(stage)) {
    const key = posix.join(NODE_PTY_ASSET_PREFIX, relative(stage, path).split(sep).join("/"));
    // Windows has no exec bit to read; nothing there needs one anyway.
    files.push({ key, executable: (statSync(path).mode & 0o111) !== 0 });
  }
  files.sort((a, b) => (a.key < b.key ? -1 : 1));

  const manifest = join(BUILD_DIR, target, NODE_PTY_MANIFEST_KEY);
  await writeFile(manifest, JSON.stringify({ files }));

  return [`${stage}=${NODE_PTY_ASSET_PREFIX}`, `${manifest}=${NODE_PTY_MANIFEST_KEY}`];
}

async function compile(target) {
  const { fossilizePlatform, prebuild, file } = targetInfo(target);
  const assets = await stageNodePty(target, prebuild);

  console.log(`\nCompiling ${file}...`);
  // A scratch out dir per target: fossilize writes its intermediate blob there,
  // and names its output after the platform rather than our release name.
  const scratch = join(BUILD_DIR, target, "out");
  await rm(scratch, { recursive: true, force: true });
  execFileSync(
    "pnpm",
    [
      "exec",
      "fossilize",
      "--no-bundle",
      // Drop non-English ICU data: the installer only prints English.
      "--hole-punch",
      // Ignore NODE_OPTIONS so user V8 flags can't invalidate the code cache.
      "--ignore-node-options",
      "--node-version",
      NODE_VERSION,
      "--platforms",
      fossilizePlatform,
      "--output-name",
      OUTPUT_NAME,
      "--out-dir",
      scratch,
      ...assets.flatMap((spec) => ["--assets", spec]),
      BUNDLE,
    ],
    { stdio: "inherit", shell: process.platform === "win32" },
  );

  const [built] = (await readdir(scratch)).filter((name) => name.startsWith(OUTPUT_NAME));
  if (!built) {
    throw new Error(`fossilize produced no binary for ${target}`);
  }
  const outfile = join(OUT_DIR, file);
  await rename(join(scratch, built), outfile);
  console.log(`  -> ${outfile}`);

  if (process.env.RELEASE_BUILD) {
    const compressed = await promisify(gzip)(readFileSync(outfile), { level: 9 });
    await writeFile(`${outfile}.gz`, compressed);
    console.log(`  -> ${outfile}.gz`);
  }
}

const targets = parseTargets(process.argv.slice(2));
console.log(`${OUTPUT_NAME} ${pkg.version}: ${targets.join(", ")}`);

await rm(BUILD_DIR, { recursive: true, force: true });
await mkdir(OUT_DIR, { recursive: true });
await bundle();
for (const target of targets) {
  await compile(target);
}
