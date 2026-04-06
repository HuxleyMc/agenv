import { Command } from "commander";
import { readlinkSync } from "node:fs";
import pc from "picocolors";
import { detectScope, agentsPath } from "../lib/paths";
import { readConfig } from "../lib/config";

export function registerStatus(program: Command): void {
  program
    .command("status")
    .description("Show the active kit and symlink details")
    .option("--porcelain", "print only the kit name, exit 1 if not initialized")
    .option("--json", "machine-readable JSON output")
    .action((opts: { porcelain?: boolean; json?: boolean }) => {
      const cwd = process.cwd();

      // 1. Detect scope
      const scope = detectScope(cwd);
      if (!scope) {
        if (opts.porcelain) {
          process.exit(1);
          return;
        }
        console.error(pc.red("error: not initialized. Run `agenv init` first."));
        process.exit(1);
      }
      const { store, local } = scope;

      // 2. Read config
      const config = readConfig(store);

      // 3. Handle porcelain mode
      if (opts.porcelain) {
        if (!config.active) {
          process.exit(1);
        }
        console.log(config.active);
        return;
      }

      // 4. Get symlink target
      let symlinkTarget: string | null = null;
      try {
        symlinkTarget = readlinkSync(agentsPath(cwd));
      } catch {
        // If readlink fails (no symlink, or other error), target is null
        symlinkTarget = null;
      }

      // 5. JSON output
      if (opts.json) {
        const output = {
          active: config.active || null,
          store,
          local,
          symlink: agentsPath(cwd),
          target: symlinkTarget,
        };
        console.log(JSON.stringify(output, null, 2));
        return;
      }

      // 6. Default human-readable output
      const scopeLabel = local ? "local" : "global";
      const symlinkStr = symlinkTarget
        ? `${agentsPath(cwd)} → ${symlinkTarget}`
        : agentsPath(cwd);

      console.log();
      console.log(`  active kit  ${pc.cyan(config.active || pc.dim("(none)"))}`);
      console.log(`  store       ${store}  ${pc.dim(`(${scopeLabel})`)}`);
      console.log(`  .agents     ${symlinkStr}`);
      console.log();
    });
}
