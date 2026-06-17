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

// Run a command expected to emit JSON and return the parsed value. Returns null
// when the command fails or its output is not valid JSON, so a missing or broken
// listing reads as "nothing installed" rather than crashing the installer.
export async function runJson<T>(system: SystemDeps, command: string): Promise<T | null> {
  const result = await system.run(command);

  if (!result.ok || !result.stdout) {
    return null;
  }

  try {
    return JSON.parse(result.stdout) as T;
  } catch {
    return null;
  }
}
