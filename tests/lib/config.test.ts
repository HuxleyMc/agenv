import { test, expect, beforeEach, afterEach } from "bun:test";
import { makeTempDir, cleanupTempDir } from "../fixtures/index";
import { readConfig, writeConfig, addKit, removeKit, setActive, type KitMeta } from "../../src/lib/config";

let tempDir: string;

beforeEach(() => {
  tempDir = makeTempDir();
});

afterEach(() => {
  cleanupTempDir(tempDir);
});

test("readConfig returns empty config when file missing", () => {
  const config = readConfig(tempDir);
  expect(config.active).toBe("");
  expect(config.kits).toEqual({});
});

test("addKit adds kit with today's date", () => {
  const config = readConfig(tempDir);
  const updated = addKit(config, "mykit");
  expect(updated.kits["mykit"]).toBeDefined();
  const today = new Date().toISOString().split("T")[0];
  const kitCreated = updated.kits["mykit"]?.created;
  expect(kitCreated).toBe(today);
});

test("addKit throws if kit exists", () => {
  let config = readConfig(tempDir);
  config = addKit(config, "mykit");
  expect(() => addKit(config, "mykit")).toThrow('Kit "mykit" already exists');
});

test("removeKit removes kit", () => {
  let config = readConfig(tempDir);
  config = addKit(config, "mykit");
  const updated = removeKit(config, "mykit");
  expect(updated.kits["mykit"]).toBeUndefined();
});

test("setActive sets active kit", () => {
  let config = readConfig(tempDir);
  config = addKit(config, "alpha");
  const updated = setActive(config, "alpha");
  expect(updated.active).toBe("alpha");
});

test("round-trip: writeConfig then readConfig returns same data", () => {
  let config = readConfig(tempDir);
  config = addKit(config, "kit1");
  config = addKit(config, "kit2", { description: "second kit" });
  config = setActive(config, "kit1");
  writeConfig(tempDir, config);

  const loaded = readConfig(tempDir);
  expect(loaded.active).toBe("kit1");
  expect(loaded.kits["kit1"]).toBeDefined();
  expect(loaded.kits["kit2"]).toBeDefined();
  expect(loaded.kits["kit2"]!.description).toBe("second kit");
});
