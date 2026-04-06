import * as TOML from "smol-toml";
import { configPath } from "./paths";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";

/**
 * Metadata for a kit in the configuration.
 */
export interface KitMeta {
  created: string; // ISO date string "YYYY-MM-DD"
  description?: string;
}

/**
 * The main configuration object.
 */
export interface Config {
  active: string;
  kits: Record<string, KitMeta>;
}

/**
 * Get today's date as ISO date string (YYYY-MM-DD).
 */
function getTodayDate(): string {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  return date || "";
}

/**
 * Reads and parses the config.toml file from the store directory.
 * If the file doesn't exist, returns an empty config.
 */
export function readConfig(store: string): Config {
  const filePath = configPath(store);

  try {
    if (!existsSync(filePath)) {
      return { active: "", kits: {} };
    }

    const text = readFileSync(filePath, "utf8");
    if (!text.trim()) {
      return { active: "", kits: {} };
    }

    const parsed = TOML.parse(text) as Record<string, unknown>;

    // Extract active and kits
    const active = typeof parsed.active === "string" ? parsed.active : "";
    const kitsRaw = parsed.kits as Record<string, unknown> | undefined;

    // Parse kits with type safety
    const kits: Record<string, KitMeta> = {};
    if (kitsRaw && typeof kitsRaw === "object") {
      for (const [name, kitData] of Object.entries(kitsRaw)) {
        if (typeof kitData === "object" && kitData !== null) {
          const kitObj = kitData as Record<string, unknown>;
          const created = typeof kitObj.created === "string" ? kitObj.created : "";
          const description = typeof kitObj.description === "string" ? kitObj.description : undefined;

          if (created) {
            kits[name] = {
              created,
              ...(description && { description }),
            };
          }
        }
      }
    }

    return { active, kits };
  } catch (err) {
    throw new Error(`Failed to read config at ${filePath}: ${err}`);
  }
}

/**
 * Serializes and writes the Config to <store>/config.toml.
 * Ensures the store directory exists before writing.
 */
export function writeConfig(store: string, config: Config): void {
  // Ensure store directory exists
  mkdirSync(store, { recursive: true });

  const filePath = configPath(store);

  // Strip undefined values from kits before serializing
  const cleanKits: Record<string, object> = {};
  for (const [name, meta] of Object.entries(config.kits)) {
    const entry: Record<string, string> = { created: meta.created };
    if (meta.description !== undefined) entry.description = meta.description;
    cleanKits[name] = entry;
  }
  const serializable = { active: config.active, kits: cleanKits };

  // Serialize the config to TOML
  const tomlString = TOML.stringify(serializable as unknown as Record<string, unknown>);

  // Write to file
  writeFileSync(filePath, tomlString, "utf8");
}

/**
 * Returns a new config with a kit added.
 * Does not mutate the input config.
 */
export function addKit(
  config: Config,
  name: string,
  opts?: { description?: string }
): Config {
  if (config.kits[name]) throw new Error(`Kit "${name}" already exists`);

  return {
    ...config,
    kits: {
      ...config.kits,
      [name]: {
        created: getTodayDate(),
        ...(opts?.description && { description: opts.description }),
      },
    },
  };
}

/**
 * Returns a new config with the active kit set.
 * Does not mutate the input config.
 */
export function setActive(config: Config, name: string): Config {
  return {
    ...config,
    active: name,
  };
}

/**
 * Returns a new config with a kit removed from kits.
 * Does not mutate the input config.
 */
export function removeKit(config: Config, name: string): Config {
  const { [name]: _, ...remainingKits } = config.kits;

  return {
    ...config,
    kits: remainingKits,
  };
}
