# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install           # install dependencies
bun run dev -- <cmd>  # run CLI without building (e.g. bun run dev -- init)
bun test              # run all tests
bun test tests/commands/init.test.ts  # run a single test file
bun run lint          # type-check via tsc --noEmit
bun run build         # compile self-contained binary → dist/agenv
```

## Architecture

agenv is a CLI tool (TypeScript, Bun runtime) that manages named "kits" (directories of agent config files) and keeps `.agents/` as a symlink pointing at the active one.

**Entry point:** `src/index.ts` — registers all commands via Commander.js and delegates to `src/commands/*.ts`.

**Key concepts:**
- **Store**: `~/.agenv/` (global) or `.agenv/` in cwd (local). Local takes precedence when detected.
- **Kit**: a directory under `<store>/kits/<name>/`. Only flat files are tracked (no subdirectories).
- **Active kit**: recorded in `<store>/config.toml` (`active` key). The `.agents/` symlink points to the active kit dir.
- **Symlink targets**: absolute paths in global mode, relative paths in local mode (git-portable).

**`src/lib/` modules:**
- `paths.ts` — all path resolution (`resolveStore`, `detectScope`, `kitPath`, `agentsPath`, `symlinkTarget`)
- `config.ts` — read/write `config.toml` via `smol-toml`; pure functions (`addKit`, `setActive`, `removeKit`) return new config objects without mutation
- `kit.ts` — filesystem operations on kit directories (`createKitDir`, `deleteKitDir`, `copyKitDir`, `listKits`, `countKitFiles`)
- `validation.ts` — shared validation constants (`KIT_NAME_RE = /^[a-z0-9_-]+$/`)

**`src/commands/` modules:** one file per CLI subcommand; each exports a `register*(program)` function.

## Testing

Tests in `tests/` mirror the `src/` structure. The fixture helper `tests/fixtures/index.ts` provides:
- `makeTempDir()` / `cleanupTempDir()` — isolated temp dirs per test
- `agenvInDir(args, cwd, { home? })` — spawns the CLI via `bun src/index.ts` with controlled `HOME` and `cwd`

Tests are integration-style: they spawn the real CLI and assert on exit codes, stdout/stderr, and filesystem state. There are no unit test mocks for filesystem or config.

## Gotchas

- Kit names must match `/^[a-z0-9_-]+$/` — lowercase alphanumeric, hyphens, underscores only
- `switch` without args shows an interactive `@clack/prompts` menu (requires a TTY); `switch <name>` skips the menu
- `shell-init [shell]` emits prompt integration snippets for bash/zsh/fish/starship/pwsh; auto-detects shell if omitted
- `status` shows active kit and symlink details; `status --porcelain` emits just the kit name (used by shell integration)
