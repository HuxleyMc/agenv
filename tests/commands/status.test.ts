import { test, expect, beforeEach, afterEach } from "bun:test";
import { makeTempDir, cleanupTempDir, agenvInDir } from "../fixtures/index";

let tempDir: string;

beforeEach(() => {
  tempDir = makeTempDir();
});

afterEach(() => {
  cleanupTempDir(tempDir);
});

test("status --porcelain prints kit name", () => {
  agenvInDir(["init", "mykit"], tempDir);
  const result = agenvInDir(["status", "--porcelain"], tempDir);
  expect(result.exitCode).toBe(0);
  expect(result.stdout.trim()).toBe("mykit");
});

test("status --porcelain exits 1 when not initialized", () => {
  const result = agenvInDir(["status", "--porcelain"], tempDir);
  expect(result.exitCode).toBe(1);
  // Silent — no stdout output
  expect(result.stdout.trim()).toBe("");
});

test("status --json outputs valid JSON with expected fields", () => {
  agenvInDir(["init", "mykit"], tempDir);
  const result = agenvInDir(["status", "--json"], tempDir);
  expect(result.exitCode).toBe(0);

  const parsed = JSON.parse(result.stdout);
  expect(parsed).toHaveProperty("active");
  expect(parsed).toHaveProperty("store");
  expect(parsed).toHaveProperty("local");
  expect(parsed).toHaveProperty("symlink");
  expect(parsed).toHaveProperty("target");
  expect(parsed.active).toBe("mykit");
});
