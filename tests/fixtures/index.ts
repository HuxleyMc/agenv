import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

export function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "agenv-test-"));
}

export function cleanupTempDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

// Run the CLI from a specific working directory
export function agenvInDir(
  args: string[],
  cwd: string,
  opts?: { home?: string }
): { stdout: string; stderr: string; exitCode: number } {
  const home = opts?.home ?? cwd;
  const result = Bun.spawnSync(["bun", new URL("../../src/index.ts", import.meta.url).pathname, ...args], {
    cwd,
    env: { ...process.env, HOME: home },
  });
  return {
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
    exitCode: result.exitCode ?? 0,
  };
}
