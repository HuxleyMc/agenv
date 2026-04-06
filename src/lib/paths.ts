import * as path from "node:path";
import * as os from "node:os";
import { existsSync } from "node:fs";

/**
 * Resolves the store directory path.
 * - Global mode: ~/.agenv
 * - Local mode: <cwd>/.agenv
 */
export function resolveStore(opts: { local?: boolean; cwd?: string }): string {
  if (opts.local) {
    const cwd = opts.cwd || process.cwd();
    return path.join(cwd, ".agenv");
  }
  // Global mode
  return path.join(os.homedir(), ".agenv");
}

/**
 * Returns the kits directory path.
 */
export function kitsDir(store: string): string {
  return path.join(store, "kits");
}

/**
 * Returns the path to a specific kit directory.
 */
export function kitPath(store: string, name: string): string {
  return path.join(kitsDir(store), name);
}

/**
 * Returns the path to the config.toml file.
 */
export function configPath(store: string): string {
  return path.join(store, "config.toml");
}

/**
 * Returns the path to the .agents symlink in the given cwd.
 */
export function agentsPath(cwd?: string): string {
  const resolvedCwd = cwd || process.cwd();
  return path.join(resolvedCwd, ".agents");
}

/**
 * Returns the symlink target path.
 * - Global mode: absolute path to <store>/kits/<name>
 * - Local mode: relative path to .agenv/kits/<name>
 */
export function symlinkTarget(
  store: string,
  name: string,
  local: boolean
): string {
  if (local) {
    // Return relative path for local mode
    return path.join(".agenv", "kits", name);
  }
  // Return absolute path for global mode
  return kitPath(store, name);
}

/**
 * Detects the scope (store and mode) by checking for .agenv directory.
 * - Checks for local .agenv in cwd first
 * - Then checks for global ~/.agenv with config.toml
 * - Returns null if neither found
 */
export function detectScope(
  cwd?: string
): { store: string; local: boolean } | null {
  const resolvedCwd = cwd || process.cwd();

  // Check for local .agenv
  const localStore = path.join(resolvedCwd, ".agenv");
  if (existsSync(localStore)) {
    return { store: localStore, local: true };
  }

  // Check for global ~/.agenv
  const globalStore = path.join(os.homedir(), ".agenv");
  if (existsSync(globalStore)) {
    return { store: globalStore, local: false };
  }

  return null;
}

