import { test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import {
  existsSync,
  mkdirSync,
  lstatSync,
  readlinkSync,
  writeFileSync,
  realpathSync,
} from "node:fs";
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

// --- global ~/.claude/skills ---

test("global: creates kit with skills/ dir and symlinks ~/.claude/skills to .agents/skills", () => {
  const fakeHome = join(tempDir, "home");
  mkdirSync(join(fakeHome, ".claude"), { recursive: true });

  const project = join(tempDir, "project");
  mkdirSync(project);

  agenvInDir(["init", "--local"], project, { home: fakeHome });
  const result = agenvInDir(["claude"], project, { home: fakeHome });

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain("(global)");

  const kitSkillsDir = join(project, ".agenv", "kits", "claude", "skills");
  expect(lstatSync(kitSkillsDir).isDirectory()).toBe(true);

  const claudeSkills = join(fakeHome, ".claude", "skills");
  expect(lstatSync(claudeSkills).isSymbolicLink()).toBe(true);
  expect(readlinkSync(claudeSkills)).toBe(join(realpathSync(project), ".agents", "skills"));
});

test("global: migrates files from ~/.claude/skills into kit", () => {
  const fakeHome = join(tempDir, "home");
  mkdirSync(join(fakeHome, ".claude", "skills"), { recursive: true });
  writeFileSync(join(fakeHome, ".claude", "skills", "skill.md"), "# Skill");

  const project = join(tempDir, "project");
  mkdirSync(project);

  agenvInDir(["init", "--local"], project, { home: fakeHome });
  const result = agenvInDir(["claude"], project, { home: fakeHome });

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain("Migrated 1 skill");

  const kitSkillsDir = join(project, ".agenv", "kits", "claude", "skills");
  expect(existsSync(join(kitSkillsDir, "skill.md"))).toBe(true);

  const claudeSkills = join(fakeHome, ".claude", "skills");
  expect(lstatSync(claudeSkills).isSymbolicLink()).toBe(true);
});

// --- local .claude/skills ---

test("local: prefers project .claude/skills over global when .claude/ dir exists", () => {
  const fakeHome = join(tempDir, "home");
  mkdirSync(join(fakeHome, ".claude"), { recursive: true });

  const project = join(tempDir, "project");
  mkdirSync(join(project, ".claude"), { recursive: true }); // local .claude/ present

  agenvInDir(["init", "--local"], project, { home: fakeHome });
  const result = agenvInDir(["claude"], project, { home: fakeHome });

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain("(local)");

  // local .claude/skills is the symlink, global is untouched
  const localSkills = join(project, ".claude", "skills");
  expect(lstatSync(localSkills).isSymbolicLink()).toBe(true);
  expect(readlinkSync(localSkills)).toBe(join(realpathSync(project), ".agents", "skills"));

  const globalSkills = join(fakeHome, ".claude", "skills");
  expect(existsSync(globalSkills)).toBe(false);
});

test("local: migrates files from project .claude/skills into kit", () => {
  const fakeHome = join(tempDir, "home");
  mkdirSync(join(fakeHome, ".claude"), { recursive: true });

  const project = join(tempDir, "project");
  mkdirSync(join(project, ".claude", "skills"), { recursive: true });
  writeFileSync(join(project, ".claude", "skills", "local-skill.md"), "# Local");
  writeFileSync(join(project, ".claude", "skills", "other.md"), "# Other");

  agenvInDir(["init", "--local"], project, { home: fakeHome });
  const result = agenvInDir(["claude"], project, { home: fakeHome });

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain("Migrated 2 skills");
  expect(result.stdout).toContain("(local)");

  const kitSkillsDir = join(project, ".agenv", "kits", "claude", "skills");
  expect(existsSync(join(kitSkillsDir, "local-skill.md"))).toBe(true);
  expect(existsSync(join(kitSkillsDir, "other.md"))).toBe(true);
});

// --- idempotency ---

test("idempotent on re-run", () => {
  const fakeHome = join(tempDir, "home");
  mkdirSync(join(fakeHome, ".claude", "skills"), { recursive: true });
  writeFileSync(join(fakeHome, ".claude", "skills", "skill.md"), "# Skill");

  const project = join(tempDir, "project");
  mkdirSync(project);

  agenvInDir(["init", "--local"], project, { home: fakeHome });
  agenvInDir(["claude"], project, { home: fakeHome });

  const result = agenvInDir(["claude"], project, { home: fakeHome });
  expect(result.exitCode).toBe(0);

  const kitSkillsDir = join(project, ".agenv", "kits", "claude", "skills");
  expect(existsSync(join(kitSkillsDir, "skill.md"))).toBe(true);
});
