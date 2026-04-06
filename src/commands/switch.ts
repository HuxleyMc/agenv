import { Command } from "commander";
import { lstatSync, unlinkSync, symlinkSync } from "node:fs";
import pc from "picocolors";
import { select, isCancel } from "@clack/prompts";
import { detectScope, agentsPath, symlinkTarget } from "../lib/paths";
import { readConfig, writeConfig, addKit, setActive } from "../lib/config";
import { createKitDir } from "../lib/kit";
import { KIT_NAME_RE } from "../lib/validation";

export function registerSwitch(program: Command): void {
  program
    .command("switch [name]")
    .description("Swap the active kit")
    .option("--create", "create the kit if it doesn't exist, then switch")
    .action(async (name: string | undefined, opts: { create?: boolean }) => {
      const cwd = process.cwd();

      // 1. Detect scope
      const scope = detectScope(cwd);
      if (!scope) {
        console.error(pc.red("Not initialized. Run `agenv init` first."));
        process.exit(1);
      }
      const { store, local } = scope;

      // 2. Read config
      const config = readConfig(store);

      // 3. If no name given, prompt interactively or error
      if (name === undefined) {
        const kitNames = Object.keys(config.kits);
        if (kitNames.length === 0) {
          console.error(pc.red("No kits found. Run `agenv create <name>` first."));
          process.exit(1);
        }
        const chosen = await select({
          message: "Switch to kit:",
          options: kitNames.map((k) => ({
            value: k,
            label: k,
            hint: config.active === k ? "active" : undefined,
          })),
          initialValue: config.active ?? kitNames[0],
        });
        if (isCancel(chosen)) {
          process.exit(0);
        }
        // isCancel guard above ensures chosen is not a symbol; cast is safe
        name = chosen as string;
      }

      // 4. Validate kit name
      if (!KIT_NAME_RE.test(name)) {
        console.error(
          pc.red(`Invalid kit name "${name}". Only [a-z0-9_-] characters are allowed.`)
        );
        process.exit(1);
      }

      // 5. Check if kit exists; if not and --create not set, error
      const kitExists = !!config.kits[name];
      if (!kitExists && !opts.create) {
        console.error(pc.red(`Kit "${name}" does not exist.`));
        process.exit(1);
      }

      // 6. If kit doesn't exist and --create is set, create it
      let updatedConfig = config;
      if (!kitExists && opts.create) {
        createKitDir(store, name);
        updatedConfig = addKit(config, name);
      }

      // 7. Set active and write config
      updatedConfig = setActive(updatedConfig, name);
      writeConfig(store, updatedConfig);

      // 8. Remove old symlink if present
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

      // 9. Create new .agents symlink
      try {
        symlinkSync(symlinkTarget(store, name, local), agentsPath(cwd));
      } catch (err) {
        console.error(pc.red(`error: failed to create .agents symlink: ${err}`));
        process.exit(1);
      }

      // 10. Print success
      const createdLabel = !kitExists ? pc.dim(" (created)") : "";
      console.log(
        pc.green("✓") +
          ` Switched to kit ${pc.bold(pc.cyan(name))}${createdLabel}`
      );
    });
}
