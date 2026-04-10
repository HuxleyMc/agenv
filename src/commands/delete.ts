import { Command } from "commander";
import { lstatSync, unlinkSync, symlinkSync } from "node:fs";
import { createInterface } from "node:readline";
import pc from "picocolors";
import { detectScope, agentsPath, symlinkTarget } from "../lib/paths";
import { readConfig, writeConfig, removeKit, setActive } from "../lib/config";
import { deleteKitDir } from "../lib/kit";

export function registerDelete(program: Command): void {
  program
    .command("delete <name>")
    .alias("rm")
    .description("Remove a kit permanently")
    .option("-y, --yes", "skip confirmation prompt")
    .action(async (name: string, opts: { yes?: boolean }) => {
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

      // 3. Check if kit exists
      if (!config.kits[name]) {
        console.error(pc.red(`Kit "${name}" does not exist.`));
        process.exit(1);
      }

      // 4. Check if kit is active
      const isActive = config.active === name;

      // 5. Confirmation prompt (unless -y/--yes)
      if (!opts.yes) {
        const rl = createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        await new Promise<void>((resolve) => {
          rl.question(`  Delete kit '${name}'? (y/N) `, (answer: string) => {
            rl.close();
            if (answer.toLowerCase() !== "y") {
              console.log(pc.dim("  cancelled"));
              process.exit(0);
            }
            resolve();
          });
        });
      }

      // 6. Delete kit directory
      deleteKitDir(store, name);

      // 7. Update config: remove kit
      let updatedConfig = removeKit(config, name);

      // 8. Determine final config (handle active kit case)
      if (isActive) {
        const remainingKits = Object.keys(updatedConfig.kits);
        if (remainingKits.length > 0) {
          // Auto-switch to first remaining kit
          const firstKit = remainingKits[0]!;
          updatedConfig = setActive(updatedConfig, firstKit);
        } else {
          // No kits remain: clear active
          updatedConfig = { ...updatedConfig, active: "" };
        }
      }

      // 9. Write config BEFORE touching symlinks (ensures consistency even if symlink ops fail)
      writeConfig(store, updatedConfig);

      // 10. Handle symlink operations (guarded, failures here won't corrupt config)
      if (isActive) {
        const remainingKits = Object.keys(updatedConfig.kits);
        if (remainingKits.length > 0) {
          // Auto-switched to first remaining kit: update symlink to point to new active kit
          const firstKit = remainingKits[0]!;
          try {
            const stat = lstatSync(agentsPath(cwd));
            if (stat.isSymbolicLink()) {
              unlinkSync(agentsPath(cwd));
            } else {
              console.error(
                pc.red("error: .agents exists but is not a symlink. Remove it manually and retry.")
              );
              process.exit(1);
            }
          } catch (err: unknown) {
            if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
              console.error(pc.red(`error: cannot access .agents: ${err}`));
              process.exit(1);
            }
          }

          try {
            symlinkSync(symlinkTarget(store, firstKit, local), agentsPath(cwd));
          } catch (err) {
            console.error(pc.red(`error: failed to create .agents symlink: ${err}`));
            process.exit(1);
          }
        } else {
          // No kits remain: unlink .agents symlink
          try {
            const stat = lstatSync(agentsPath(cwd));
            if (stat.isSymbolicLink()) {
              unlinkSync(agentsPath(cwd));
            }
          } catch (err: unknown) {
            if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
              console.error(pc.red(`error: cannot access .agents: ${err}`));
              process.exit(1);
            }
          }
        }
      }

      // 10. Print success
      if (isActive && Object.keys(updatedConfig.kits).length > 0) {
        const newActive = updatedConfig.active;
        console.log(
          pc.green("✓") +
            ` Deleted kit ${pc.bold(pc.cyan(name))}; switched to ${pc.bold(pc.cyan(newActive))}`
        );
      } else if (isActive) {
        console.log(
          pc.green("✓") + ` Deleted kit ${pc.bold(pc.cyan(name))}; no kits remaining`
        );
      } else {
        console.log(pc.green("✓") + ` Deleted kit ${pc.bold(pc.cyan(name))}`);
      }
    });
}
