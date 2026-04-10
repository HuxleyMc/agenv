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

const CLAUDE_SKILLS_PATH = path.join(os.homedir(), ".claude", "skills");
const KIT_NAME = "claude";

export function registerClaude(program: Command): void {
  program
    .command("claude")
    .description("Wire up ~/.claude/skills into a 'claude' kit")
    .action(() => {
      const cwd = process.cwd();

      // 1. Require initialized store
      const scope = detectScope(cwd);
      if (!scope) {
        console.error(pc.red("Not initialized. Run `agenv init` first."));
        process.exit(1);
      }
      const { store, local } = scope;

      // 2. Create the claude kit dir if needed
      const kDir = kitPath(store, KIT_NAME);
      if (!existsSync(kDir)) {
        mkdirSync(kDir, { recursive: true });
      }

      // 3. Ensure <kit-dir>/skills/ exists as a real directory
      const kitSkillsDir = path.join(kDir, "skills");
      if (!existsSync(kitSkillsDir)) {
        mkdirSync(kitSkillsDir, { recursive: true });
      }

      // 4. Migrate ~/.claude/skills if it's a real directory
      const claudeStat = (() => {
        try { return lstatSync(CLAUDE_SKILLS_PATH); } catch { return null; }
      })();

      if (claudeStat && !claudeStat.isSymbolicLink()) {
        if (!claudeStat.isDirectory()) {
          console.error(pc.red(`error: ${CLAUDE_SKILLS_PATH} exists but is not a directory. Remove it manually and retry.`));
          process.exit(1);
        }
        let migratedCount = 0;
        for (const entry of readdirSync(CLAUDE_SKILLS_PATH, { withFileTypes: true })) {
          if (entry.isFile()) {
            copyFileSync(
              path.join(CLAUDE_SKILLS_PATH, entry.name),
              path.join(kitSkillsDir, entry.name)
            );
            migratedCount++;
          }
        }
        rmSync(CLAUDE_SKILLS_PATH, { recursive: true });
        console.log(pc.dim(`  Migrated ${migratedCount} skill${migratedCount === 1 ? "" : "s"} from ${CLAUDE_SKILLS_PATH}`));
      } else if (claudeStat?.isSymbolicLink()) {
        unlinkSync(CLAUDE_SKILLS_PATH);
      }

      // 5. Register kit in config if new, set active, write
      let config = readConfig(store);
      if (!config.kits[KIT_NAME]) {
        config = addKit(config, KIT_NAME, { description: "Claude Code skills integration" });
      }
      config = setActive(config, KIT_NAME);
      writeConfig(store, config);

      // 6. Update .agents/ symlink (same logic as switch)
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

      // 7. Point ~/.claude/skills → .agents/skills
      //    Uses the .agents path so it tracks whatever kit is active
      const agentsSkillsPath = path.join(agents, "skills");
      mkdirSync(path.dirname(CLAUDE_SKILLS_PATH), { recursive: true });
      symlinkSync(agentsSkillsPath, CLAUDE_SKILLS_PATH);

      // 8. Print summary
      console.log(pc.green("✓") + ` Kit ${pc.bold(pc.cyan(KIT_NAME))} active`);
      console.log(pc.dim(`  ~/.claude/skills → ${agentsSkillsPath}`));
    });
}
