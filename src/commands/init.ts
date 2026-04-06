import { Command } from "commander";
import * as fs from "node:fs";
import * as path from "node:path";
import pc from "picocolors";
import { resolveStore, agentsPath, symlinkTarget } from "../lib/paths";
import { readConfig, writeConfig, addKit, setActive } from "../lib/config";
import { createKitDir } from "../lib/kit";
import { KIT_NAME_RE } from "../lib/validation";

export function registerInit(program: Command): void {
  program
    .command("init [name]")
    .description("Bootstrap agenv in the current project")
    .option("--local", "use .agenv/ in cwd instead of ~/.agenv/")
    .option("--no-migrate", "don't absorb existing .agents/ contents")
    .action((name: string | undefined, opts: { local?: boolean; migrate: boolean }) => {
      const kitName = name ?? "default";
      const local = opts.local ?? false;
      const migrate = opts.migrate; // commander sets this to false when --no-migrate is passed

      // Validate kit name
      if (!KIT_NAME_RE.test(kitName)) {
        console.error(
          pc.red(`Invalid kit name "${kitName}". Only [a-z0-9_-] characters are allowed.`)
        );
        process.exit(1);
      }

      const cwd = process.cwd();
      const agents = agentsPath(cwd);

      // Refuse if already initialized (symlink exists)
      if (fs.existsSync(agents)) {
        try {
          const stat = fs.lstatSync(agents);
          if (stat.isSymbolicLink()) {
            console.error(
              pc.red("Already initialized: .agents is already a symlink.")
            );
            process.exit(1);
          }
        } catch {
          // lstatSync threw — not a symlink, continue
        }
      }

      const store = resolveStore({ local, cwd });

      // Migrate existing .agents/ directory if it exists and is a real directory
      let migratedFiles = 0;
      if (fs.existsSync(agents)) {
        let isRealDir = false;
        try {
          const stat = fs.lstatSync(agents);
          isRealDir = stat.isDirectory() && !stat.isSymbolicLink();
        } catch {
          // ignore
        }

        if (isRealDir && !migrate) {
          console.error(pc.red("error: .agents/ already exists as a directory."));
          console.error(pc.dim("  Run without --no-migrate to absorb it, or remove it manually."));
          process.exit(1);
        }

        if (isRealDir && migrate) {
          // Create the kit dir first so we can copy into it
          // We need store/kits/<name> to exist before copying
          // createKitDir is called below, but we need it now for migration
          const kitDirPath = path.join(store, "kits", kitName);
          fs.mkdirSync(kitDirPath, { recursive: true });

          // Copy files from .agents/ into the kit dir
          const entries = fs.readdirSync(agents, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isFile()) {
              fs.copyFileSync(
                path.join(agents, entry.name),
                path.join(kitDirPath, entry.name)
              );
              migratedFiles++;
            }
          }

          // Remove the original .agents/ directory
          fs.rmSync(agents, { recursive: true, force: false });
        }
      }

      // Create store + kits dir structure (createKitDir handles recursive mkdir)
      // Only call createKitDir if the kit dir doesn't already exist (it may have been created during migration)
      const kitDirPath = path.join(store, "kits", kitName);
      if (!fs.existsSync(kitDirPath)) {
        createKitDir(store, kitName);
      }

      // Write config.toml with the new kit as active
      const existingConfig = readConfig(store);
      let updatedConfig;
      try {
        updatedConfig = setActive(addKit(existingConfig, kitName), kitName);
      } catch (e) {
        // Kit already exists in shared store — just make it active
        updatedConfig = setActive(existingConfig, kitName);
      }
      writeConfig(store, updatedConfig);

      // Create .agents/ symlink
      const target = symlinkTarget(store, kitName, local);
      fs.symlinkSync(target, agents);

      // Print success message
      const storeLabel = local ? pc.cyan(".agenv/") : pc.cyan("~/.agenv/");
      console.log(
        pc.green("✓") +
          ` Initialized kit ${pc.bold(pc.cyan(kitName))} in ${storeLabel}`
      );
      if (migratedFiles > 0) {
        console.log(
          pc.dim(`  Migrated ${migratedFiles} file${migratedFiles === 1 ? "" : "s"} from existing .agents/`)
        );
      }
      console.log(pc.dim(`  .agents → ${target}`));
    });
}
