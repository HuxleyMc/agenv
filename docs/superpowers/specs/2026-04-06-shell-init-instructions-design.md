# Shell-Init Instructions Design

**Date:** 2026-04-06
**Status:** Approved

## Summary

Improve `agenv shell-init` so users know where to add the emitted snippet and how to use it. Instructions are printed to stderr (never captured by eval or pipes) after the snippet is written to stdout.

## Problem

Currently `agenv shell-init` emits a raw snippet with no context. A new user doesn't know which config file to edit or that they can use `eval "$(agenv shell-init <shell>)"` instead of pasting.

## Approach

Always write per-shell instructions to `process.stderr` after the snippet. No flags, no TTY detection. Stderr is safe regardless of how the command is invoked.

## Instructions per shell

| Shell    | Config file                      | Pattern                              |
|----------|----------------------------------|--------------------------------------|
| bash     | `~/.bashrc`                      | `eval "$(agenv shell-init bash)"`    |
| zsh      | `~/.zshrc`                       | `eval "$(agenv shell-init zsh)"`     |
| fish     | `~/.config/fish/config.fish`     | `eval "$(agenv shell-init fish)"`    |
| starship | `~/.config/starship.toml`        | paste directly (no eval support)     |
| pwsh     | `$PROFILE`                       | paste directly (no eval support)     |

## Example stderr output (zsh)

```
# Shell integration: add the following to ~/.zshrc
#
#   eval "$(agenv shell-init zsh)"
#
# Then restart your shell or run: source ~/.zshrc
```

For starship/pwsh:

```
# Shell integration: paste the snippet above into ~/.config/starship.toml
#
# Then restart your shell.
```

## Implementation

- Add `generateInstructions(shell: ShellType, bin: string): string` in `shell-init.ts`
- Call `process.stderr.write(generateInstructions(targetShell, opts.bin))` after `console.log(snippet)`
- No changes to stdout output, no new flags, no new dependencies
