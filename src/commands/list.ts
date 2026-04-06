import { Command } from "commander";
import pc from "picocolors";
import { detectScope } from "../lib/paths";
import { readConfig } from "../lib/config";
import { listKits, countKitFiles } from "../lib/kit";

interface KitInfo {
  name: string;
  active: boolean;
  created: string | null;
  description: string | null;
  fileCount: number;
  hasDir: boolean;
  fileCountLabel: string;
}

export function registerList(program: Command): void {
  program
    .command("list")
    .alias("ls")
    .description("List all kits")
    .option("-v, --verbose", "show file counts, descriptions, and dates")
    .option("--json", "machine-readable JSON output")
    .action((opts: { verbose?: boolean; json?: boolean }) => {
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

      // 3. List kits from filesystem
      const fsKits = new Set(listKits(store));

      // 4. Build union of kit names: from config + from filesystem
      const configKitNames = Object.keys(config.kits);
      const allKitNames = Array.from(
        new Set([...configKitNames, ...fsKits])
      );

      // 5. Build kit info list
      const kits: KitInfo[] = allKitNames.map((name) => {
        const meta = config.kits[name];
        const hasDir = fsKits.has(name);
        const fileCount = hasDir ? countKitFiles(store, name) : 0;
        return {
          name,
          active: config.active === name ? true : false,
          created: meta?.created ?? null,
          description: meta?.description ?? null,
          fileCount,
          hasDir,
          fileCountLabel: fileCountLabel(fileCount),
        };
      });

      // 6. JSON output
      if (opts.json) {
        const output = {
          store,
          local,
          active: config.active || null,
          kits: kits.map(({ name, active, created, description, fileCount }) => ({
            name,
            active,
            created,
            description,
            fileCount,
          })),
        };
        console.log(JSON.stringify(output, null, 2));
        return;
      }

      // 7. Determine header scope label
      const scopeLabel = local ? "local" : "global";

      console.log();
      console.log(`  ${pc.dim("kits · " + scopeLabel)}`);
      console.log();

      if (kits.length === 0) {
        console.log(pc.dim("    (no kits)"));
        console.log();
        return;
      }

      if (opts.verbose) {
        // Compute column widths for alignment
        const maxNameLen = Math.max(...kits.map((k) => k.name.length));
        const maxFileCountLen = Math.max(
          ...kits.map((k) => k.fileCountLabel.length)
        );

        for (const kit of kits) {
          const marker = kit.active ? pc.cyan("▶") : " ";
          const nameStr = kit.name.padEnd(maxNameLen);
          const fileStr = kit.hasDir
            ? kit.fileCountLabel.padEnd(maxFileCountLen)
            : pc.dim("(missing dir)".padEnd(maxFileCountLen));
          const dateStr = kit.created ?? pc.dim("no date");
          const descStr = kit.description ? `  ${pc.dim(kit.description)}` : "";

          const parts = [
            `  ${marker} `,
            nameStr,
            "   ",
            fileStr,
            "  ",
            dateStr,
            descStr,
          ];

          console.log(parts.join(""));
        }
      } else {
        // Default: just names
        for (const kit of kits) {
          const marker = kit.active ? pc.cyan("▶") : " ";
          console.log(`  ${marker} ${kit.name}`);
        }
      }

      console.log();
    });
}

function fileCountLabel(count: number): string {
  return count === 1 ? "1 file" : `${count} files`;
}
