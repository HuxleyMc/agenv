import { Command } from "commander";
import { lstatSync, unlinkSync, symlinkSync } from "node:fs";
import pc from "picocolors";
import { detectScope, agentsPath, symlinkTarget } from "../lib/paths";
import { readConfig, writeConfig, addKit, setActive } from "../lib/config";
import { createKitDir } from "../lib/kit";
import { KIT_NAME_RE } from "../lib/validation";

export function registerSwitch(program: Command): void {
  program
    .command("switch <name>")
    .description("Swap the active kit")
    .option("--create", "create the kit if it doesn't exist, then switch")
    .action((name: string, opts: { create?: boolean }) => {
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

      // 3. Read config
      const config = readConfig(store);

      // 4. Check if kit exists; if not and --create not set, error
      const kitExists = !!config.kits[name];
      if (!kitExists && !opts.create) {
        console.error(pc.red(`Kit "${name}" does not exist.`));
        process.exit(1);
      }

      // 5. If kit doesn't exist and --create is set, create it
      let updatedConfig = config;
      if (!kitExists && opts.create) {
        createKitDir(store, name);
        updatedConfig = addKit(config, name);
      }

      // 6. Set active and write config
      updatedConfig = setActive(updatedConfig, name);
      writeConfig(store, updatedConfig);

      // 7. Remove old symlink if present
      try {
        const stat = lstatSync(agentsPath(cwd));
        if (stat.isSymbolicLink()) {
          unlinkSync(agentsPath(cwd));
        } else {
          console.error(pc.red("error: .agents exists but is not a symlink. Remove it manually and retry."));
          process.exit(1);
        }
      } catch (err: unknown) {
        // If file doesn't exist, proceed to create symlink
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
          console.error(pc.red(`error: cannot access .agents: ${err}`));
          process.exit(1);
        }
      }

      // 8. Create new .agents symlink
      try {
        symlinkSync(symlinkTarget(store, name, local), agentsPath(cwd));
      } catch (err) {
        console.error(pc.red(`error: failed to create .agents symlink: ${err}`));
        process.exit(1);
      }

      // 9. Print success
      const createdLabel = !kitExists ? pc.dim(" (created)") : "";
      console.log(
        pc.green("✓") +
          ` Switched to kit ${pc.bold(pc.cyan(name))}${createdLabel}`
      );
    });
}
