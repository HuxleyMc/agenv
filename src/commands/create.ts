import { Command } from "commander";
import { existsSync, lstatSync, unlinkSync, symlinkSync } from "node:fs";
import pc from "picocolors";
import { detectScope, agentsPath, symlinkTarget } from "../lib/paths";
import { readConfig, writeConfig, addKit, setActive } from "../lib/config";
import { createKitDir, copyKitDir } from "../lib/kit";
import { KIT_NAME_RE } from "../lib/validation";

export function registerCreate(program: Command): void {
  program
    .command("create <name>")
    .description("Scaffold a new kit")
    .option("--from <kit>", "copy an existing kit as the starting point")
    .option("--switch", "immediately activate after creating")
    .option("-d, --description <text>", "short description stored in config.toml")
    .action((name: string, opts: { from?: string; switch?: boolean; description?: string }) => {
      const cwd = process.cwd();

      // 1. Detect scope
      const scope = detectScope(cwd);
      if (!scope) {
        console.error(pc.red("Not initialized. Run `agenv init` first."));
        process.exit(1);
      }
      const { store, local } = scope;

      // 2. Validate kit name
      if (!KIT_NAME_RE.test(name)) {
        console.error(
          pc.red(`Invalid kit name "${name}". Only [a-z0-9_-] characters are allowed.`)
        );
        process.exit(1);
      }

      // 3. Read config early (used in multiple checks below)
      const config = readConfig(store);

      // 4. If --from given, verify source kit exists using config
      if (opts.from) {
        if (!config.kits[opts.from]) {
          console.error(pc.red(`Source kit "${opts.from}" does not exist.`));
          process.exit(1);
        }
      }

      // 5. Check if kit name already exists
      if (config.kits[name]) {
        console.error(pc.red(`Kit already exists: "${name}".`));
        process.exit(1);
      }

      // 6. Create kit dir
      createKitDir(store, name);

      // 7. If --from, copy source kit into new kit dir
      if (opts.from) {
        copyKitDir(store, opts.from, name);
      }

      // 8. Update config and handle --switch flag
      let finalConfig = addKit(config, name, { description: opts.description });
      if (opts.switch) {
        finalConfig = setActive(finalConfig, name);
      }

      // 9. Always write config once at the end
      writeConfig(store, finalConfig);

      // 10. If --switch, handle symlink
      if (opts.switch) {
        const agents = agentsPath(cwd);
        try {
          const stat = lstatSync(agents);
          if (stat.isSymbolicLink()) {
            unlinkSync(agents);
          } else {
            console.error(pc.red("error: .agents exists but is not a symlink. Cannot switch."));
            process.exit(1);
          }
        } catch {
          // .agents doesn't exist — that's fine, create fresh
        }
        symlinkSync(symlinkTarget(store, name, local), agents);
      }

      // 11. Print success
      const fromLabel = opts.from ? pc.dim(` (copied from ${opts.from})`) : "";
      const switchLabel = opts.switch ? pc.dim(" [active]") : "";
      console.log(
        pc.green("✓") +
          ` Created kit ${pc.bold(pc.cyan(name))}${fromLabel}${switchLabel}`
      );
      if (opts.description) {
        console.log(pc.dim(`  Description: ${opts.description}`));
      }
    });
}
