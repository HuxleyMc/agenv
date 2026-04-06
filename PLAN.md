# agenv

> Manage multiple `.agents/` directories per project — switch between them instantly.

---

## Problem

AI coding tools (Cursor, Claude Code, Copilot, etc.) increasingly read from a `.agents/` directory in your project root — a set of markdown files that define agent personas, rules, and behaviours. The problem is a single static `.agents/` doesn't fit how people actually work:

- **Research mode** needs a different set of agents than **shipping mode**
- **Different clients or workstreams** want different constraints and personas
- **Team members** want to share curated kits without overwriting each other

There's no tool to manage this. agenv is that tool — modelled on the pyenv/rbenv/nvm mental model that developers already know.

---

## Solution

agenv stores all kits in a single directory (global `~/.agenv/` by default, or local `.agenv/` per project) and keeps `.agents/` as a **symlink** pointing at the active kit. Switching is instant and atomic — just `unlink` + `symlink`. Tools that already read `.agents/` need zero changes.

```
~/.agenv/                        # global store (default)
  config.toml                    # active kit + kit metadata
  kits/
    default/
    research/                    # .agents/ → here when "research" is active
    prod/

project/
  .agents -> ~/.agenv/kits/research   # absolute (global) or relative (local)
```

---

## Scope decisions

| Decision | Choice | Rationale |
|---|---|---|
| Default mode | Global (`~/.agenv/`) | Kits shared across all projects by default |
| Local override | `--local` flag or auto-detect `.agenv/` in cwd | Opt-in for per-project isolation |
| Symlink paths | Absolute (global), relative (local) | Local relative paths are git-portable |
| Config format | TOML | Human-readable, supports structured metadata, no JSON quirkiness |
| Runtime | Bun | Single compiled binary, fast startup, no Node install required |
| Dependencies | `commander`, `picocolors`, `smol-toml` | Minimal surface area |

---

## Commands

### `agenv init [name]`

Bootstrap agenv in the current project. Creates the kit store, migrates any existing `.agents/` contents, and points `.agents/` at the active kit.

```
agenv init                    # kit named "default"
agenv init research           # kit named "research"
agenv init --local            # use .agenv/ in cwd instead of ~/.agenv/
agenv init --no-migrate       # don't absorb existing .agents/ contents
```

**Flow:**
1. Determine scope (local vs global)
2. Refuse if already initialized
3. If `.agents/` exists and is not a symlink → copy contents into new kit dir, remove original
4. Create `.agenv/kits/<name>/`
5. Write `config.toml` with `active = "<name>"`
6. Create `.agents/` symlink

---

### `agenv create <name>`

Scaffold a new kit without switching to it.

```
agenv create staging
agenv create prod --from staging          # clone existing kit
agenv create prod --from staging --switch # clone and activate immediately
agenv create research -d "Deep research agents"
```

**Flags:**
- `--from <kit>` — copy an existing kit as the starting point
- `--switch` — immediately activate after creating
- `-d, --description <text>` — short description stored in config.toml

---

### `agenv switch <name>`

Swap the active kit. Instant — only touches the symlink and config.

```
agenv switch research
agenv switch prod --create    # create kit on the fly then switch
```

**Flags:**
- `--create` — create the kit if it doesn't exist, then switch

---

### `agenv list` / `agenv ls`

List all kits. Active kit is marked with `▶`.

```
agenv list
agenv list -v         # show file counts, descriptions, dates
agenv list --json     # machine-readable output
```

**Example output (verbose):**
```
  kits · global

    default   1 file   2026-04-01
  ▶ research  7 files  Deep research agents  2026-04-06
    prod      5 files  Production agents     2026-04-05
```

---

### `agenv status`

Show the active kit and symlink details.

```
agenv status
agenv status --porcelain   # just the kit name, exit 1 if not initialized
agenv status --json
```

`--porcelain` is designed for shell prompt integration — it exits `1` silently when outside an agenv-managed context so prompts can hide the segment automatically.

---

### `agenv delete <name>` / `agenv rm <name>`

Remove a kit permanently.

```
agenv delete old-experiments
agenv delete prod --force     # delete even if active (auto-switches to next kit)
agenv delete prod -y          # skip confirmation prompt
```

**Flags:**
- `--force` — allow deleting the active kit; agenv will auto-switch to the next available kit
- `-y, --yes` — skip the `(y/N)` confirmation

---

### `agenv shell-init [shell]`

Emit a shell integration snippet. Pipe to `eval` or `source`. Shell is auto-detected from `$SHELL` if omitted.

```bash
eval "$(agenv shell-init)"           # bash or zsh — auto-detect
eval "$(agenv shell-init zsh)"
agenv shell-init fish | source
agenv shell-init starship            # paste into ~/.config/starship.toml
agenv shell-init pwsh                # PowerShell $PROFILE
agenv shell-init --bin ~/.local/bin/agenv   # custom binary path in emitted script
```

**What each shell gets:**

| Shell | Integration |
|---|---|
| **bash** | Injects `_agenv_prompt()` into `PS1` → `~/project (research) $` |
| **zsh** | `precmd` hook → kit name in `RPROMPT` in green `⬡ research` |
| **fish** | `_agenv_kit` helper for your `fish_prompt` function |
| **starship** | Ready-to-paste `[custom.agenv]` module block |
| **pwsh** | Wraps `prompt` function |

---

## Planned commands

These are scoped out but not yet implemented.

### `agenv rename <old> <new>`

Rename a kit — updates the directory name and all references in config.toml. If the kit is active, re-points the symlink.

```
agenv rename staging qa
```

---

### `agenv copy <src> <dest>`

Like `create --from` but a first-class command with clearer intent. Clones a kit without switching.

```
agenv copy research research-backup
```

---

### `agenv edit [name]`

Open the active kit (or named kit) directory in `$EDITOR` or a configured editor. Useful for quickly adding/editing agent files.

```
agenv edit
agenv edit research
```

---

### `agenv import <path>`

Import a kit from an external directory or git URL. Copies contents into a new kit.

```
agenv import ./path/to/agents
agenv import https://github.com/user/repo/agents
agenv import https://github.com/user/repo/agents --as research
```

---

### `agenv export <name> [dest]`

Export a kit to a plain directory (no symlinks, no agenv structure). Useful for sharing, archiving, or committing into a project.

```
agenv export research ./shared-agents
agenv export research --tar > research.tar.gz
```

---

### `agenv doctor`

Diagnose common issues: broken symlinks, missing kit directories, config/filesystem drift, kits in config that have no directory, etc.

```
agenv doctor
```

**Checks:**
- `.agents/` exists and is a symlink
- Symlink target exists
- `config.toml` active kit matches a real kit directory
- All kit directories in `config.toml` exist on disk
- No orphan kit directories (on disk but not in config)

---

## Config format

`~/.agenv/config.toml` (global) or `.agenv/config.toml` (local):

```toml
active = "research"

[kits.default]
created = "2026-04-01"

[kits.research]
description = "Deep research agents"
created = "2026-04-06"

[kits.prod]
description = "Production agents"
created = "2026-04-05"
```

---

## Directory layout

```
# Global (default)
~/.agenv/
  config.toml
  kits/
    default/
      browser.md
    research/
      researcher.md
      summarizer.md
      critic.md
    prod/
      deployer.md
      reviewer.md

# Local (--local or auto-detected)
project/
  .agenv/
    config.toml
    kits/
      default/
      staging/
  .agents -> .agenv/kits/staging   ← relative path (git-portable)
```

---

## Symlink strategy

| Mode | Symlink target | Why |
|---|---|---|
| Global | Absolute: `~/.agenv/kits/research` | Consistent across any project directory |
| Local | Relative: `.agenv/kits/research` | Can be committed to git; portable across machines |

---

## Build & install

```bash
# Dev
bun install
bun run dev -- init

# Build self-contained binary (no Bun install required on target machine)
bun run build
# → dist/agenv  (~95MB, single executable)

# Install globally
bun run build && cp dist/agenv /usr/local/bin/agenv

# Or via npm (when published)
npm install -g agenv
bunx agenv
```

**Why Bun:**
- `bun build --compile` produces a self-contained binary — users don't need Bun, Node, or any runtime installed
- ~22ms bundle time, ~86ms compile time
- Native TypeScript — no separate tsc step in dev
- `bun test` for tests with no additional framework needed

---

## Testing plan

Tests live in `tests/` and use `bun test`.

```
tests/
  lib/
    paths.test.ts       # resolveLocal, symlink target logic
    config.test.ts      # TOML read/write, addKit, setActive
    kit.test.ts         # createKitDir, deleteKitDir, countKitFiles
  commands/
    init.test.ts
    create.test.ts
    switch.test.ts
    list.test.ts
    delete.test.ts
    status.test.ts
    shell-init.test.ts
  fixtures/             # temp dirs created/cleaned per test
```

Each command test spins up a fresh temp directory, runs commands against it using `Bun.spawn`, and asserts on stdout, exit code, and filesystem state.

---

## Publishing

```
npm publish          # agenv on npm
```

**Binary distribution (future):**
- GitHub Releases: pre-built binaries for linux-x64, darwin-x64, darwin-arm64
- Single `curl | sh` installer that picks the right binary

---

## Non-goals

- **No agent file parsing** — agenv treats kit contents as opaque files. It doesn't know or care what format they're in.
- **No remote sync** — syncing kits between machines is out of scope (use git for that via `export`/`import`)
- **No daemon / watch mode** — agenv is a pure CLI, no background processes
- **No Windows symlink handling** — Windows symlinks require elevated permissions or Developer Mode; out of scope for v1
