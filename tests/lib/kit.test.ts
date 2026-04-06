import { test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";
import { makeTempDir, cleanupTempDir } from "../fixtures/index";
import { createKitDir, deleteKitDir, listKits, countKitFiles } from "../../src/lib/kit";

let tempDir: string;

beforeEach(() => {
  tempDir = makeTempDir();
  // Create the kits directory structure
  mkdirSync(join(tempDir, "kits"), { recursive: true });
});

afterEach(() => {
  cleanupTempDir(tempDir);
});

test("createKitDir creates directory", () => {
  createKitDir(tempDir, "mykit");
  const kitPath = join(tempDir, "kits", "mykit");
  expect(require("node:fs").existsSync(kitPath)).toBe(true);
});

test("createKitDir throws if directory already exists", () => {
  createKitDir(tempDir, "mykit");
  expect(() => createKitDir(tempDir, "mykit")).toThrow();
});

test("deleteKitDir deletes directory", () => {
  createKitDir(tempDir, "mykit");
  deleteKitDir(tempDir, "mykit");
  const kitPath = join(tempDir, "kits", "mykit");
  expect(require("node:fs").existsSync(kitPath)).toBe(false);
});

test("deleteKitDir throws if directory missing", () => {
  expect(() => deleteKitDir(tempDir, "nonexistent")).toThrow();
});

test("listKits returns kit names", () => {
  createKitDir(tempDir, "alpha");
  createKitDir(tempDir, "beta");
  const kits = listKits(tempDir);
  expect(kits).toContain("alpha");
  expect(kits).toContain("beta");
  expect(kits.length).toBe(2);
});

test("listKits returns empty array when no kits directory", () => {
  const emptyDir = makeTempDir();
  try {
    const kits = listKits(emptyDir);
    expect(kits).toEqual([]);
  } finally {
    cleanupTempDir(emptyDir);
  }
});

test("countKitFiles counts files", () => {
  createKitDir(tempDir, "mykit");
  const kitPath = join(tempDir, "kits", "mykit");
  writeFileSync(join(kitPath, "file1.txt"), "hello");
  writeFileSync(join(kitPath, "file2.txt"), "world");
  const count = countKitFiles(tempDir, "mykit");
  expect(count).toBe(2);
});

test("countKitFiles returns 0 for empty kit", () => {
  createKitDir(tempDir, "emptykit");
  const count = countKitFiles(tempDir, "emptykit");
  expect(count).toBe(0);
});

test("countKitFiles returns 0 when kit dir missing", () => {
  const count = countKitFiles(tempDir, "nonexistent");
  expect(count).toBe(0);
});
