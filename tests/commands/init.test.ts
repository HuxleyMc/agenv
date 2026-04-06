import { test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { existsSync, lstatSync, readlinkSync } from "node:fs";
import { makeTempDir, cleanupTempDir, agenvInDir } from "../fixtures/index";

let tempDir: string;

beforeEach(() => {
  tempDir = makeTempDir();
});

afterEach(() => {
  cleanupTempDir(tempDir);
});

test("agenv init creates .agents symlink and ~/.agenv/kits/default/", () => {
  const result = agenvInDir(["init"], tempDir);
  expect(result.exitCode).toBe(0);

  // .agents symlink should exist
  const agentsPath = join(tempDir, ".agents");
  expect(existsSync(agentsPath)).toBe(true);
  const stat = lstatSync(agentsPath);
  expect(stat.isSymbolicLink()).toBe(true);

  // ~/.agenv/kits/default should exist (HOME is set to tempDir)
  const defaultKitDir = join(tempDir, ".agenv", "kits", "default");
  expect(existsSync(defaultKitDir)).toBe(true);
});

test("agenv init research creates kit named 'research'", () => {
  const result = agenvInDir(["init", "research"], tempDir);
  expect(result.exitCode).toBe(0);

  const researchKitDir = join(tempDir, ".agenv", "kits", "research");
  expect(existsSync(researchKitDir)).toBe(true);
});

test("agenv init --local creates .agenv/ in cwd and relative symlink", () => {
  const result = agenvInDir(["init", "--local"], tempDir);
  expect(result.exitCode).toBe(0);

  // .agenv/ directory should exist in cwd
  const localStore = join(tempDir, ".agenv");
  expect(existsSync(localStore)).toBe(true);

  // .agents symlink should point to a relative path
  const agentsPath = join(tempDir, ".agents");
  const target = readlinkSync(agentsPath);
  expect(target.startsWith("/")).toBe(false);
  expect(target).toContain(".agenv");
});

test("running init twice fails with error", () => {
  agenvInDir(["init"], tempDir);
  const result = agenvInDir(["init"], tempDir);
  expect(result.exitCode).toBe(1);
  expect(result.stderr).toMatch(/already initialized/i);
});

test("invalid kit name fails", () => {
  const result = agenvInDir(["init", "My Kit!"], tempDir);
  expect(result.exitCode).toBe(1);
  expect(result.stderr).toMatch(/invalid kit name/i);
});
