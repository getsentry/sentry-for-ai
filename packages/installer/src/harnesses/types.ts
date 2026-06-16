export type InstallOutcome =
  | { kind: "done"; command: string; note?: string }
  | { kind: "manual"; instructions: string };

export type InstallReadiness = { ok: true } | { ok: false; reason: string };

export interface Harness {
  readonly id: string;
  readonly name: string;
  detect(): Promise<boolean>;
  isInstalled(): Promise<boolean>;
  canInstall(): Promise<InstallReadiness>;
  install(): Promise<InstallOutcome>;
}
