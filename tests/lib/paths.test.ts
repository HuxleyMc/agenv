import { test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { makeTempDir, cleanupTempDir } from "../fixtures/index";
import { resolveStore, symlinkTarget, detectScope } from "../../src/lib/paths";

let tempDir: string;

beforeEach(() => {
  tempDir = makeTempDir();
});

afterEach(() => {
  cleanupTempDir(tempDir);
});

test("resolveStore returns ~/.agenv for global", () => {
  // HOME is set to tempDir in tests, but resolveStore reads os.homedir()
  // We test the path construction: it should end with .agenv
  const store = resolveStore({ local: false });
  expect(store).toMatch(/\.agenv$/);
});

test("resolveStore returns <cwd>/.agenv for local", () => {
  const store = resolveStore({ local: true, cwd: tempDir });
  expect(store).toBe(join(tempDir, ".agenv"));
});

test("symlinkTarget returns absolute path for global", () => {
  const store = resolveStore({ local: false, cwd: tempDir });
  const target = symlinkTarget(store, "mykit", false);
  expect(target).toBe(join(store, "kits", "mykit"));
  // Should be absolute
  expect(target.startsWith("/")).toBe(true);
});

test("symlinkTarget returns relative .agenv/kits/<name> for local", () => {
  const store = resolveStore({ local: true, cwd: tempDir });
  const target = symlinkTarget(store, "mykit", true);
  expect(target).toBe(join(".agenv", "kits", "mykit"));
  // Should be relative
  expect(target.startsWith("/")).toBe(false);
});

test("detectScope returns null when nothing initialized", () => {
  const scope = detectScope(tempDir);
  expect(scope).toBeNull();
});

test("detectScope returns local when .agenv exists in cwd", () => {
  const localStore = join(tempDir, ".agenv");
  mkdirSync(localStore, { recursive: true });
  const scope = detectScope(tempDir);
  expect(scope).not.toBeNull();
  expect(scope!.local).toBe(true);
  expect(scope!.store).toBe(localStore);
});
