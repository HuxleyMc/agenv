import { Command } from "commander";
import {
  existsSync,
  lstatSync,
  unlinkSync,
  symlinkSync,
  mkdirSync,
  readdirSync,
  copyFileSync,
  rmSync,
} from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import pc from "picocolors";
import { detectScope, agentsPath, symlinkTarget, kitPath } from "../lib/paths";
import { readConfig, writeConfig, addKit, setActive } from "../lib/config";

const KIT_NAME = "claude";

/**
 * Resolve which .claude/skills path to use.
 * Prefers a local .claude/ directory in cwd (project-level) over global ~/.claude/.
 */
function resolveClaudeSkillsPath(cwd: string): string {
  const localClaudeDir = path.join(cwd, ".claude");
  if (existsSync(localClaudeDir)) {
    return path.join(localClaudeDir, "skills");
  }
  return path.join(os.homedir(), ".claude", "skills");
}

export function registerClaude(program: Command): void {
  program
    .command("claude")
    .description("Wire up .claude/skills into a 'claude' kit")
    .action(() => {
      const cwd = process.cwd();

      // 1. Require initialized store
      const scope = detectScope(cwd);
      if (!scope) {
        console.error(pc.red("Not initialized. Run `agenv init` first."));
        process.exit(1);
      }
      const { store, local } = scope;

      // 2. Resolve skills path: local .claude/skills takes precedence over global
      const claudeSkillsPath = resolveClaudeSkillsPath(cwd);
      const isLocalSkills = claudeSkillsPath.startsWith(cwd);

      // 3. Create the claude kit dir if needed
      const kDir = kitPath(store, KIT_NAME);
      if (!existsSync(kDir)) {
        mkdirSync(kDir, { recursive: true });
      }

      // 4. Ensure <kit-dir>/skills/ exists as a real directory
      const kitSkillsDir = path.join(kDir, "skills");
      if (!existsSync(kitSkillsDir)) {
        mkdirSync(kitSkillsDir, { recursive: true });
      }

      // 5. Migrate existing skills if the path is a real directory
      const claudeStat = (() => {
        try { return lstatSync(claudeSkillsPath); } catch { return null; }
      })();

      if (claudeStat && !claudeStat.isSymbolicLink()) {
        if (!claudeStat.isDirectory()) {
          console.error(pc.red(`error: ${claudeSkillsPath} exists but is not a directory. Remove it manually and retry.`));
          process.exit(1);
        }
        let migratedCount = 0;
        for (const entry of readdirSync(claudeSkillsPath, { withFileTypes: true })) {
          if (entry.isFile()) {
            copyFileSync(
              path.join(claudeSkillsPath, entry.name),
              path.join(kitSkillsDir, entry.name)
            );
            migratedCount++;
          }
        }
        rmSync(claudeSkillsPath, { recursive: true });
        console.log(pc.dim(`  Migrated ${migratedCount} skill${migratedCount === 1 ? "" : "s"} from ${claudeSkillsPath}`));
      } else if (claudeStat?.isSymbolicLink()) {
        unlinkSync(claudeSkillsPath);
      }

      // 6. Register kit in config if new, set active, write
      let config = readConfig(store);
      if (!config.kits[KIT_NAME]) {
        config = addKit(config, KIT_NAME, { description: "Claude Code skills integration" });
      }
      config = setActive(config, KIT_NAME);
      writeConfig(store, config);

      // 7. Update .agents/ symlink
      const agents = agentsPath(cwd);
      const agentsStat = (() => {
        try { return lstatSync(agents); } catch { return null; }
      })();

      if (agentsStat) {
        if (!agentsStat.isSymbolicLink()) {
          console.error(pc.red("error: .agents exists but is not a symlink. Remove it manually and retry."));
          process.exit(1);
        }
        unlinkSync(agents);
      }
      symlinkSync(symlinkTarget(store, KIT_NAME, local), agents);

      // 8. Point .claude/skills → .agents/skills
      const agentsSkillsPath = path.join(agents, "skills");
      mkdirSync(path.dirname(claudeSkillsPath), { recursive: true });
      symlinkSync(agentsSkillsPath, claudeSkillsPath);

      // 9. Print summary
      const scopeLabel = isLocalSkills ? "(local)" : "(global)";
      console.log(pc.green("✓") + ` Kit ${pc.bold(pc.cyan(KIT_NAME))} active`);
      console.log(pc.dim(`  .claude/skills ${scopeLabel} → ${agentsSkillsPath}`));
    });
}
