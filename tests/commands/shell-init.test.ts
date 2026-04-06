import { test, expect, beforeEach, afterEach } from "bun:test";
import { makeTempDir, cleanupTempDir, agenvInDir } from "../fixtures/index";

let tempDir: string;

beforeEach(() => {
  tempDir = makeTempDir();
});

afterEach(() => {
  cleanupTempDir(tempDir);
});

test("shell-init bash emits snippet with status --porcelain", () => {
  const result = agenvInDir(["shell-init", "bash"], tempDir);
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain("status --porcelain");
  // Should contain bash-style function definition
  expect(result.stdout).toContain("_agenv_prompt");
});

test("shell-init zsh emits zsh snippet", () => {
  const result = agenvInDir(["shell-init", "zsh"], tempDir);
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain("status --porcelain");
  // Should contain zsh-specific hook
  expect(result.stdout).toContain("add-zsh-hook");
});

test("shell-init fish emits fish snippet", () => {
  const result = agenvInDir(["shell-init", "fish"], tempDir);
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain("status --porcelain");
  expect(result.stdout).toContain("function");
});

test("shell-init invalid shell exits 1", () => {
  const result = agenvInDir(["shell-init", "ksh"], tempDir);
  expect(result.exitCode).toBe(1);
  expect(result.stderr).toMatch(/unsupported shell/i);
});
