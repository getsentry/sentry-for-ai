import type { SystemDeps } from "../system";

export async function detectOnPath(system: SystemDeps, binary: string): Promise<boolean> {
  const locator = system.platform === "win32" ? "where" : "which";
  return (await system.run(`${locator} ${binary}`)).ok;
}

export async function runInstallCommand(system: SystemDeps, command: string): Promise<void> {
  const result = await system.run(command);

  if (result.ok) {
    return;
  }

  throw new Error(result.stderr || result.message || `Command failed: ${command}`);
}

// True when `command` succeeds and its output contains `needle` (case-insensitive).
// Used to probe plugin/marketplace listings for an already-present entry.
export async function outputIncludes(
  system: SystemDeps,
  command: string,
  needle: string,
): Promise<boolean> {
  const result = await system.run(command);
  return result.ok && (result.stdout?.toLowerCase().includes(needle) ?? false);
}
