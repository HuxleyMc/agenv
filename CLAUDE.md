# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

`agenv` is a CLI tool (modelled on pyenv/rbenv) for managing multiple `.agents/` directories per project. It stores "kits" (sets of agent markdown files) in `~/.agenv/` (global) or `.agenv/` (local), and keeps `.agents/` as a symlink pointing at the active kit. Switching kits is instant — just `unlink` + `symlink`.

## Commands

```bash
bun install           # install dependencies
bun run dev -- <cmd>  # run CLI in dev (e.g. bun run dev -- init)
bun test              # run all tests
bun test src/lib/config.test.ts  # run a single test file
bun run lint          # type-check via tsc --noEmit
bun run build         # compile self-contained binary → dist/agenv
```

## Architecture

```
src/
  index.ts          # CLI entry point (commander); registers all commands
  lib/
    paths.ts        # Pure path helpers: resolveStore, kitPath, symlinkTarget, detectScope
    config.ts       # TOML read/write (smol-toml); immutable helpers: addKit, setActive, removeKit
    kit.ts          # Filesystem operations: createKitDir, deleteKitDir, copyKitDir, countKitFiles, listKits
```

**Key design decisions:**
- `paths.ts` is pure (no I/O); `config.ts` handles TOML I/O; `kit.ts` handles filesystem I/O. Keep these layers separate.
- Global mode uses absolute symlink targets; local mode uses relative targets (`.agenv/kits/<name>`) so they're git-portable.
- Scope detection (`detectScope`) checks for local `.agenv/` in cwd first, then global `~/.agenv/`.
- `config.ts` functions are immutable — they return new `Config` objects rather than mutating.
- `src/index.ts` is currently a stub (`console.log("Hello via Bun!")`); commands from PLAN.md are not yet wired up.

## Tech stack

- Runtime: Bun (single compiled binary target)
- CLI framework: `commander`
- TOML: `smol-toml`
- Colors: `picocolors`
- TypeScript strict mode with `noUncheckedIndexedAccess`

## Bun conventions

- Use `bun <file>` not `node` or `ts-node`
- Use `bun:sqlite`, `Bun.file`, `Bun.serve()`, `Bun.$` — not their Node equivalents
- Bun auto-loads `.env`; no dotenv needed
- Tests use `bun:test` (`import { test, expect } from "bun:test"`)
- Tests live in `tests/` mirroring `src/` structure (see PLAN.md for planned layout)
