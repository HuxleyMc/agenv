# Shell-Init Instructions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Print per-shell setup instructions to stderr after `agenv shell-init` emits its snippet, so users know which config file to edit and whether to use `eval` or paste directly.

**Architecture:** Add `generateInstructions(shell, bin)` to `src/commands/shell-init.ts` that returns a commented stderr message. Call it after `console.log(snippet)` via `process.stderr.write(...)`. No new flags, no changes to stdout.

**Tech Stack:** Bun, TypeScript, `bun:test`

---

### Task 1: Add failing tests for stderr instructions

**Files:**
- Modify: `tests/commands/shell-init.test.ts`

- [ ] **Step 1: Add tests for eval-style shells (bash, zsh, fish)**

Append to `tests/commands/shell-init.test.ts`:

```typescript
test("shell-init bash prints instructions to stderr", () => {
  const result = agenvInDir(["shell-init", "bash"], tempDir);
  expect(result.stderr).toContain("~/.bashrc");
  expect(result.stderr).toContain('eval "$(agenv shell-init bash)"');
});

test("shell-init zsh prints instructions to stderr", () => {
  const result = agenvInDir(["shell-init", "zsh"], tempDir);
  expect(result.stderr).toContain("~/.zshrc");
  expect(result.stderr).toContain('eval "$(agenv shell-init zsh)"');
});

test("shell-init fish prints instructions to stderr", () => {
  const result = agenvInDir(["shell-init", "fish"], tempDir);
  expect(result.stderr).toContain("~/.config/fish/config.fish");
  expect(result.stderr).toContain('eval "$(agenv shell-init fish)"');
});

test("shell-init starship prints paste instructions to stderr", () => {
  const result = agenvInDir(["shell-init", "starship"], tempDir);
  expect(result.stderr).toContain("~/.config/starship.toml");
  expect(result.stderr).not.toContain("eval");
});

test("shell-init pwsh prints paste instructions to stderr", () => {
  const result = agenvInDir(["shell-init", "pwsh"], tempDir);
  expect(result.stderr).toContain("$PROFILE");
  expect(result.stderr).not.toContain("eval");
});

test("shell-init instructions do not appear in stdout", () => {
  const result = agenvInDir(["shell-init", "zsh"], tempDir);
  expect(result.stdout).not.toContain("~/.zshrc");
  expect(result.stdout).not.toContain("eval");
});

test("shell-init --bin custom is reflected in eval instruction", () => {
  const result = agenvInDir(["shell-init", "zsh", "--bin", "/usr/local/bin/agenv"], tempDir);
  expect(result.stderr).toContain('eval "$(/usr/local/bin/agenv shell-init zsh)"');
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun test tests/commands/shell-init.test.ts
```

Expected: new tests FAIL (no instructions printed yet), existing tests PASS.

---

### Task 2: Implement `generateInstructions` and wire it up

**Files:**
- Modify: `src/commands/shell-init.ts`

- [ ] **Step 1: Add `generateInstructions` function**

Add after the `generatePwshSnippet` function (before `registerShellInit`):

```typescript
function generateInstructions(shell: ShellType, bin: string): string {
  switch (shell) {
    case "bash":
      return (
        `# Shell integration: add the following to ~/.bashrc\n` +
        `#\n` +
        `#   eval "$(${bin} shell-init bash)"\n` +
        `#\n` +
        `# Then restart your shell or run: source ~/.bashrc\n`
      );
    case "zsh":
      return (
        `# Shell integration: add the following to ~/.zshrc\n` +
        `#\n` +
        `#   eval "$(${bin} shell-init zsh)"\n` +
        `#\n` +
        `# Then restart your shell or run: source ~/.zshrc\n`
      );
    case "fish":
      return (
        `# Shell integration: add the following to ~/.config/fish/config.fish\n` +
        `#\n` +
        `#   eval "$(${bin} shell-init fish)"\n` +
        `#\n` +
        `# Then restart your shell or run: source ~/.config/fish/config.fish\n`
      );
    case "starship":
      return (
        `# Shell integration: paste the snippet above into ~/.config/starship.toml\n` +
        `#\n` +
        `# Then restart your shell.\n`
      );
    case "pwsh":
      return (
        `# Shell integration: paste the snippet above into $PROFILE\n` +
        `#\n` +
        `# Then restart your shell or run: . $PROFILE\n`
      );
  }
}
```

- [ ] **Step 2: Call it after `console.log(snippet)`**

In `registerShellInit`, replace:

```typescript
      console.log(snippet);
    });
```

with:

```typescript
      console.log(snippet);
      process.stderr.write(generateInstructions(targetShell, opts.bin));
    });
```

- [ ] **Step 3: Run tests**

```bash
bun test tests/commands/shell-init.test.ts
```

Expected: all tests PASS.

- [ ] **Step 4: Run full test suite**

```bash
bun test
```

Expected: all tests PASS, no regressions.

- [ ] **Step 5: Commit**

```bash
git add src/commands/shell-init.ts tests/commands/shell-init.test.ts
git commit -m "feat: print setup instructions to stderr in shell-init"
```
