import { test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { existsSync, mkdirSync, lstatSync, readlinkSync, writeFileSync, realpathSync } from "node:fs";
import { makeTempDir, cleanupTempDir, agenvInDir } from "../fixtures/index";

let tempDir: string;

beforeEach(() => {
  tempDir = makeTempDir();
});

afterEach(() => {
  cleanupTempDir(tempDir);
});

test("claude fails if not initialized", () => {
  const result = agenvInDir(["claude"], tempDir, { home: tempDir });
  expect(result.exitCode).not.toBe(0);
  expect(result.stderr).toContain("Not initialized");
});

test("claude creates kit with skills/ dir and symlinks ~/.claude/skills to .agents/skills", () => {
  const fakeHome = join(tempDir, "home");
  mkdirSync(join(fakeHome, ".claude"), { recursive: true });

  const project = join(tempDir, "project");
  mkdirSync(project);

  agenvInDir(["init", "--local"], project, { home: fakeHome });
  const result = agenvInDir(["claude"], project, { home: fakeHome });

  expect(result.exitCode).toBe(0);

  // <kit-dir>/skills is a real directory
  const kitSkillsDir = join(project, ".agenv", "kits", "claude", "skills");
  expect(existsSync(kitSkillsDir)).toBe(true);
  expect(lstatSync(kitSkillsDir).isDirectory()).toBe(true);

  // ~/.claude/skills → .agents/skills
  const claudeSkills = join(fakeHome, ".claude", "skills");
  expect(lstatSync(claudeSkills).isSymbolicLink()).toBe(true);
  expect(readlinkSync(claudeSkills)).toBe(join(realpathSync(project), ".agents", "skills"));
});

test("claude migrates files from existing ~/.claude/skills into kit", () => {
  const fakeHome = join(tempDir, "home");
  const claudeSkillsDir = join(fakeHome, ".claude", "skills");
  mkdirSync(claudeSkillsDir, { recursive: true });
  writeFileSync(join(claudeSkillsDir, "my-skill.md"), "# My Skill");
  writeFileSync(join(claudeSkillsDir, "other.md"), "# Other");

  const project = join(tempDir, "project");
  mkdirSync(project);

  agenvInDir(["init", "--local"], project, { home: fakeHome });
  const result = agenvInDir(["claude"], project, { home: fakeHome });

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain("Migrated 2 skills");

  const kitSkillsDir = join(project, ".agenv", "kits", "claude", "skills");
  expect(existsSync(join(kitSkillsDir, "my-skill.md"))).toBe(true);
  expect(existsSync(join(kitSkillsDir, "other.md"))).toBe(true);

  // ~/.claude/skills → .agents/skills
  const claudeSkills = join(fakeHome, ".claude", "skills");
  expect(lstatSync(claudeSkills).isSymbolicLink()).toBe(true);
  expect(readlinkSync(claudeSkills)).toBe(join(realpathSync(project), ".agents", "skills"));
});

test("claude is idempotent", () => {
  const fakeHome = join(tempDir, "home");
  const claudeSkillsDir = join(fakeHome, ".claude", "skills");
  mkdirSync(claudeSkillsDir, { recursive: true });
  writeFileSync(join(claudeSkillsDir, "skill.md"), "# Skill");

  const project = join(tempDir, "project");
  mkdirSync(project);

  agenvInDir(["init", "--local"], project, { home: fakeHome });
  agenvInDir(["claude"], project, { home: fakeHome });

  const result = agenvInDir(["claude"], project, { home: fakeHome });
  expect(result.exitCode).toBe(0);

  const kitSkillsDir = join(project, ".agenv", "kits", "claude", "skills");
  expect(existsSync(join(kitSkillsDir, "skill.md"))).toBe(true);
});

test("claude switches .agents symlink to claude kit", () => {
  const fakeHome = join(tempDir, "home");
  mkdirSync(join(fakeHome, ".claude"), { recursive: true });

  const project = join(tempDir, "project");
  mkdirSync(project);

  agenvInDir(["init", "--local"], project, { home: fakeHome });
  agenvInDir(["claude"], project, { home: fakeHome });

  const agents = join(project, ".agents");
  expect(lstatSync(agents).isSymbolicLink()).toBe(true);
  expect(readlinkSync(agents)).toContain("claude");
});
