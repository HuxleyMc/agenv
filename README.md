# agenv

Switch between AI agent configurations instantly — like pyenv, but for your `.agents/` directory.

Managing multiple AI agent setups across projects means constantly swapping out markdown files. agenv tracks named "kits" (sets of agent files) and keeps `.agents/` as a symlink pointing at the active one. Switching is instant.

## Installation

```sh
curl -fsSL https://raw.githubusercontent.com/HuxleyMc/agenv/main/install.sh | sh
```

Installs to `~/.local/bin/agenv`. Make sure `~/.local/bin` is in your PATH:

```sh
export PATH="$HOME/.local/bin:$PATH"
```

**Requirements:** macOS, `curl`

**Manual install:** Download a binary directly from [GitHub Releases](https://github.com/HuxleyMc/agenv/releases).

## Quick start

```bash
# In any project directory:
agenv init                    # bootstrap with a "default" kit
agenv create backend          # create a new kit
agenv switch backend          # .agents/ now points at backend/
agenv switch                  # pick a kit from an interactive menu
agenv list                    # see all kits
agenv status                  # show active kit + symlink details
```

## Commands

### `agenv init [name]`

Bootstrap agenv in the current project. Creates a kit store, initializes the named kit (default: `default`), and creates the `.agents/` symlink.

```
Options:
  --local       use .agenv/ in cwd instead of ~/.agenv/ (global)
  --no-migrate  don't absorb existing .agents/ contents into the new kit
```

If `.agents/` already exists as a plain directory, its files are migrated into the new kit and replaced with a symlink.

### `agenv switch [name]`

Swap the active kit by relinking `.agents/`. If `name` is omitted, an interactive menu lets you pick from available kits.

```
Options:
  --create   create the kit if it doesn't exist, then switch
```

### `agenv create <name>`

Scaffold a new kit.

```
Options:
  --from <kit>           copy an existing kit as the starting point
  --switch               immediately activate after creating
  -d, --description <t>  short description stored in config.toml
```

### `agenv list` / `agenv ls`

List all kits.

```
Options:
  -v, --verbose  show file counts, descriptions, and creation dates
  --json         machine-readable JSON output
```

### `agenv status`

Show the active kit and symlink details.

```
Options:
  --porcelain  print only the kit name; exit 1 if not initialized
  --json       machine-readable JSON output
```

### `agenv delete <name>` / `agenv rm <name>`

Remove a kit permanently.

```
Options:
  --force    allow deleting the active kit (auto-switches to another)
  -y, --yes  skip confirmation prompt
```

### `agenv shell-init [shell]`

Emit a shell integration snippet that shows the active kit in your prompt. Pipe it into your shell config.

Supported shells: `bash`, `zsh`, `fish`, `starship`, `pwsh`

```bash
# bash / zsh
eval "$(agenv shell-init)"

# fish
agenv shell-init fish | source

# starship — add to starship.toml
agenv shell-init starship >> ~/.config/starship.toml
```

```
Options:
  --bin <path>  custom binary path in emitted snippet (default: "agenv")
```

## How it works

Kits are just directories. The `.agents/` symlink is the only magic.

- **Global mode** (`~/.agenv/`): kit store is shared across all projects. Symlink targets are absolute paths.
- **Local mode** (`.agenv/` in cwd): kit store lives inside the project. Symlink targets are relative, making the store git-portable.

Scope is detected automatically: local `.agenv/` takes precedence over global `~/.agenv/`.

Store layout:

```
~/.agenv/                  # or .agenv/ for local
  config.toml              # active kit + kit metadata
  kits/
    default/               # kit directory (what .agents/ points at)
      CLAUDE.md
      ...
    backend/
      CLAUDE.md
      ...
```

## Development

```bash
bun install           # install dependencies
bun run dev -- <cmd>  # run without building (e.g. bun run dev -- init)
bun test              # run all tests
bun run lint          # type-check via tsc --noEmit
bun run build         # compile self-contained binary → dist/agenv
```
