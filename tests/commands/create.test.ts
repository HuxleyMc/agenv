import { test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { existsSync, writeFileSync, readlinkSync } from "node:fs";
import { makeTempDir, cleanupTempDir, agenvInDir } from "../fixtures/index";

let tempDir: string;

beforeEach(() => {
  tempDir = makeTempDir();
});

afterEach(() => {
  cleanupTempDir(tempDir);
});

test("create creates a new kit", () => {
  agenvInDir(["init"], tempDir);
  const result = agenvInDir(["create", "newkit"], tempDir);
  expect(result.exitCode).toBe(0);

  const kitDir = join(tempDir, ".agenv", "kits", "newkit");
  expect(existsSync(kitDir)).toBe(true);
});

test("create --from clones contents", () => {
  agenvInDir(["init", "source"], tempDir);

  // Add a file to the source kit
  const sourceKitDir = join(tempDir, ".agenv", "kits", "source");
  writeFileSync(join(sourceKitDir, "agent.md"), "# Agent config");

  const result = agenvInDir(["create", "--from", "source", "dest"], tempDir);
  expect(result.exitCode).toBe(0);

  // dest kit should have the file
  const destKitDir = join(tempDir, ".agenv", "kits", "dest");
  expect(existsSync(join(destKitDir, "agent.md"))).toBe(true);
});

test("create --switch activates new kit", () => {
  agenvInDir(["init", "alpha"], tempDir);
  const result = agenvInDir(["create", "--switch", "beta"], tempDir);
  expect(result.exitCode).toBe(0);

  // symlink should point to beta
  const agentsPath = join(tempDir, ".agents");
  const target = readlinkSync(agentsPath);
  expect(target).toContain("beta");

  // status --porcelain should show beta
  const statusResult = agenvInDir(["status", "--porcelain"], tempDir);
  expect(statusResult.stdout.trim()).toBe("beta");
});

test("create fails on duplicate name", () => {
  agenvInDir(["init", "alpha"], tempDir);
  const result = agenvInDir(["create", "alpha"], tempDir);
  expect(result.exitCode).toBe(1);
  expect(result.stderr).toMatch(/already exists/i);
});
