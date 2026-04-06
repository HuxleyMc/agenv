import { test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { readlinkSync } from "node:fs";
import { makeTempDir, cleanupTempDir, agenvInDir } from "../fixtures/index";

let tempDir: string;

beforeEach(() => {
  tempDir = makeTempDir();
});

afterEach(() => {
  cleanupTempDir(tempDir);
});

test("switch changes the symlink after init + create", () => {
  agenvInDir(["init", "alpha"], tempDir);
  agenvInDir(["create", "beta"], tempDir);

  const result = agenvInDir(["switch", "beta"], tempDir);
  expect(result.exitCode).toBe(0);

  const agentsPath = join(tempDir, ".agents");
  const target = readlinkSync(agentsPath);
  expect(target).toContain("beta");
});

test("switch to nonexistent kit fails", () => {
  agenvInDir(["init"], tempDir);
  const result = agenvInDir(["switch", "nonexistent"], tempDir);
  expect(result.exitCode).toBe(1);
  expect(result.stderr).toMatch(/does not exist/i);
});

test("switch --create creates and switches to new kit", () => {
  agenvInDir(["init", "alpha"], tempDir);

  const result = agenvInDir(["switch", "--create", "newkit"], tempDir);
  expect(result.exitCode).toBe(0);

  const agentsPath = join(tempDir, ".agents");
  const target = readlinkSync(agentsPath);
  expect(target).toContain("newkit");
});

test("switch with no name and no kits prints helpful error", () => {
  // init creates a "default" kit, so we delete it to get a store with no kits
  agenvInDir(["init"], tempDir);
  agenvInDir(["delete", "--force", "-y", "default"], tempDir);

  const result = agenvInDir(["switch"], tempDir);
  expect(result.exitCode).toBe(1);
  expect(result.stderr).toMatch(/no kits found/i);
});
