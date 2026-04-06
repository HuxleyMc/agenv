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

test("shell-init bash prints instructions to stderr", () => {
  const result = agenvInDir(["shell-init", "bash"], tempDir);
  expect(result.stderr).toContain("~/.bashrc");
  expect(result.stderr).toContain('eval "$(agenv shell-init bash)"');
});

test("shell-init zsh prints instructions to stderr", () => {
  const result = agenvInDir(["shell-init", "zsh"], tempDir);
  expect(result.stderr).toContain("~/.zshrc");
  expect(result.stderr).toContain('eval "$(agenv shell-init zsh)"');
});

test("shell-init fish prints instructions to stderr", () => {
  const result = agenvInDir(["shell-init", "fish"], tempDir);
  expect(result.stderr).toContain("~/.config/fish/config.fish");
  expect(result.stderr).toContain('eval "$(agenv shell-init fish)"');
});

test("shell-init starship prints paste instructions to stderr", () => {
  const result = agenvInDir(["shell-init", "starship"], tempDir);
  expect(result.stderr).toContain("~/.config/starship.toml");
  expect(result.stderr).not.toContain("eval");
});

test("shell-init pwsh prints paste instructions to stderr", () => {
  const result = agenvInDir(["shell-init", "pwsh"], tempDir);
  expect(result.stderr).toContain("$PROFILE");
  expect(result.stderr).not.toContain("eval");
});

test("shell-init instructions do not appear in stdout", () => {
  const result = agenvInDir(["shell-init", "zsh"], tempDir);
  expect(result.stdout).not.toContain("~/.zshrc");
  expect(result.stdout).not.toContain("eval");
});

test("shell-init --bin custom is reflected in eval instruction", () => {
  const result = agenvInDir(["shell-init", "zsh", "--bin", "/usr/local/bin/agenv"], tempDir);
  expect(result.stderr).toContain('eval "$(/usr/local/bin/agenv shell-init zsh)"');
});
