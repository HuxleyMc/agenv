import { test, expect, beforeEach, afterEach } from "bun:test";
import { makeTempDir, cleanupTempDir, agenvInDir } from "../fixtures/index";

let tempDir: string;

beforeEach(() => {
  tempDir = makeTempDir();
});

afterEach(() => {
  cleanupTempDir(tempDir);
});

test("list shows kits with active marker", () => {
  agenvInDir(["init", "alpha"], tempDir);
  agenvInDir(["create", "beta", "--skip-switch"], tempDir);

  const result = agenvInDir(["list"], tempDir);
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain("alpha");
  expect(result.stdout).toContain("beta");
});

test("list --json output is valid JSON with expected shape", () => {
  agenvInDir(["init", "alpha"], tempDir);
  agenvInDir(["create", "beta", "--skip-switch"], tempDir);

  const result = agenvInDir(["list", "--json"], tempDir);
  expect(result.exitCode).toBe(0);

  const parsed = JSON.parse(result.stdout);
  expect(parsed).toHaveProperty("kits");
  expect(parsed).toHaveProperty("active");
  expect(parsed).toHaveProperty("store");
  expect(parsed).toHaveProperty("local");
  expect(Array.isArray(parsed.kits)).toBe(true);

  const kitNames = parsed.kits.map((k: { name: string }) => k.name);
  expect(kitNames).toContain("alpha");
  expect(kitNames).toContain("beta");

  // alpha should be active
  const alphaKit = parsed.kits.find((k: { name: string }) => k.name === "alpha");
  expect(alphaKit.active).toBe(true);
});
