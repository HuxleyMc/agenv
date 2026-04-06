# Installer Script & GitHub Releases — Design

**Date:** 2026-04-06
**Status:** Approved

---

## Overview

Add automated release infrastructure to agenv:

1. A GitHub Actions workflow that builds macOS binaries and publishes a GitHub Release on every version tag push
2. A `curl | sh` installer script that downloads the correct binary for the user's architecture

---

## GitHub Actions Workflow

**File:** `.github/workflows/release.yml`

**Trigger:** Push to tags matching `v*.*.*`

**Approach:** Single job on `macos-latest` using Bun's cross-compilation (`--target`) to produce both Mac architectures from one runner.

**Job steps:**
1. Checkout repo
2. Setup Bun (latest)
3. `bun install`
4. `bun run lint` — type-check gate before building
5. Build `dist/agenv-darwin-x64` with `--target bun-darwin-x64`
6. Build `dist/agenv-darwin-arm64` with `--target bun-darwin-arm64`
7. Create GitHub Release via `softprops/action-gh-release`
   - Title: tag name (e.g. `v0.1.0`)
   - Release notes: auto-generated from commits (`generate_release_notes: true`)
   - Assets: both compiled binaries

---

## Installer Script

**File:** `install.sh` (repo root)

**Shell:** POSIX sh (compatible with macOS default `/bin/sh`)

**Flow:**
1. Detect architecture via `uname -m`
   - `arm64` → `darwin-arm64`
   - `x86_64` → `darwin-x64`
   - Anything else → print error and exit 1
2. Fetch latest release tag from GitHub API (`/repos/<owner>/agenv/releases/latest`)
3. Construct binary download URL: `https://github.com/<owner>/agenv/releases/download/<tag>/agenv-<arch>`
4. Download binary to a temp file via `curl -fsSL`
5. `chmod +x` the temp file
6. Move to `/usr/local/bin/agenv` (uses `sudo mv` if needed)
7. Print confirmation: `agenv <version> installed to /usr/local/bin/agenv`

**User invocation:**
```sh
curl -fsSL https://raw.githubusercontent.com/<owner>/agenv/main/install.sh | sh
```

---

## Artifacts

| Platform | Binary name |
|---|---|
| macOS Apple Silicon | `agenv-darwin-arm64` |
| macOS Intel | `agenv-darwin-x64` |

---

## Non-goals

- Linux or Windows binaries (out of scope for v1)
- Homebrew tap or npm publishing
- Manual workflow dispatch trigger
- Checksum/signature verification (can be added later)
