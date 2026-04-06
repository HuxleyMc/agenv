import {
  mkdirSync,
  rmSync,
  readdirSync,
  copyFileSync,
  existsSync,
} from "node:fs";
import * as path from "node:path";
import { kitPath, kitsDir } from "./paths";

/**
 * Create a kit directory at <store>/kits/<name>/.
 * Creates the directory recursively.
 * Throws if the directory already exists.
 */
export function createKitDir(store: string, name: string): void {
  const path = kitPath(store, name);

  if (existsSync(path)) {
    throw new Error(`Kit directory already exists: ${path}`);
  }

  mkdirSync(path, { recursive: true });
}

/**
 * Delete a kit directory at <store>/kits/<name>/ and all its contents.
 * Throws if the directory doesn't exist.
 */
export function deleteKitDir(store: string, name: string): void {
  const path = kitPath(store, name);

  if (!existsSync(path)) {
    throw new Error(`Kit directory not found: ${path}`);
  }

  rmSync(path, { recursive: true, force: false });
}

/**
 * Copy all regular files (non-recursively) from <store>/kits/<src>/ into <store>/kits/<dest>/.
 * The dest directory must already exist.
 * Throws if src directory doesn't exist.
 */
export function copyKitDir(store: string, src: string, dest: string): void {
  const srcPath = kitPath(store, src);
  const destPath = kitPath(store, dest);

  if (!existsSync(srcPath)) {
    throw new Error(`Source kit directory not found: ${srcPath}`);
  }

  if (!existsSync(destPath)) {
    throw new Error(`Destination kit directory not found: ${destPath}`);
  }

  // Read all entries in source directory
  const entries = readdirSync(srcPath, { withFileTypes: true });

  // Copy only regular files (not subdirectories)
  for (const entry of entries) {
    if (entry.isFile()) {
      const srcFile = path.join(srcPath, entry.name);
      const destFile = path.join(destPath, entry.name);
      copyFileSync(srcFile, destFile);
    }
  }
}

/**
 * Count regular files (non-recursively) in <store>/kits/<name>/.
 * Returns 0 if the directory doesn't exist.
 */
export function countKitFiles(store: string, name: string): number {
  const dirPath = kitPath(store, name);

  if (!existsSync(dirPath)) {
    return 0;
  }

  const entries = readdirSync(dirPath, { withFileTypes: true });
  let count = 0;

  for (const entry of entries) {
    if (entry.isFile()) {
      count++;
    }
  }

  return count;
}

/**
 * List all subdirectories in <store>/kits/ and return their names as an array.
 * Returns an empty array if the kits directory doesn't exist.
 */
export function listKits(store: string): string[] {
  const kitsPath = kitsDir(store);

  if (!existsSync(kitsPath)) {
    return [];
  }

  const entries = readdirSync(kitsPath, { withFileTypes: true });
  const result: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      result.push(entry.name);
    }
  }

  return result;
}
