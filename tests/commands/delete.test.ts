import { test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { makeTempDir, cleanupTempDir, agenvInDir } from "../fixtures/index";

let tempDir: string;

beforeEach(() => {
  tempDir = makeTempDir();
});

afterEach(() => {
  cleanupTempDir(tempDir);
});

test("delete removes a non-active kit", () => {
  agenvInDir(["init", "alpha"], tempDir);
  agenvInDir(["create", "beta"], tempDir);

  const result = agenvInDir(["delete", "--yes", "beta"], tempDir);
  expect(result.exitCode).toBe(0);

  // The kit directory should no longer exist
  const betaDir = join(tempDir, ".agenv", "kits", "beta");
  expect(existsSync(betaDir)).toBe(false);
});

test("delete refuses to delete active kit without --force", () => {
  agenvInDir(["init", "alpha"], tempDir);

  const result = agenvInDir(["delete", "--yes", "alpha"], tempDir);
  expect(result.exitCode).toBe(1);
  expect(result.stderr).toMatch(/currently active/i);
});

test("delete --force deletes active kit and auto-switches", () => {
  agenvInDir(["init", "alpha"], tempDir);
  agenvInDir(["create", "beta"], tempDir);

  const result = agenvInDir(["delete", "--yes", "--force", "alpha"], tempDir);
  expect(result.exitCode).toBe(0);

  // Check that alpha kit dir is gone
  const alphaDir = join(tempDir, ".agenv", "kits", "alpha");
  expect(existsSync(alphaDir)).toBe(false);

  // Check that the active kit is now beta
  const statusResult = agenvInDir(["status", "--porcelain"], tempDir);
  expect(statusResult.stdout.trim()).toBe("beta");
});
