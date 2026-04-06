# Installer Script & GitHub Releases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a GitHub Actions release workflow that builds macOS binaries on tag push and a `curl | sh` installer script that downloads and installs the correct binary.

**Architecture:** A single `macos-latest` GH Actions job cross-compiles both `darwin-x64` and `darwin-arm64` binaries using Bun's `--target` flag, then publishes them as GitHub Release assets. A POSIX sh installer script fetches the latest release tag via the GitHub API, downloads the right binary, and installs it to `/usr/local/bin`.

**Tech Stack:** Bun (cross-compilation), GitHub Actions (`softprops/action-gh-release@v2`, `oven-sh/setup-bun@v2`), POSIX sh

---

## Files

| Path | Action | Purpose |
|---|---|---|
| `.github/workflows/release.yml` | Create | GH Actions release workflow |
| `install.sh` | Create | `curl \| sh` installer |
| `README.md` | Modify | Replace manual build/install instructions with `curl \| sh` one-liner |

---

### Task 1: GitHub Actions release workflow

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Create the workflows directory**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Write the workflow file**

Create `.github/workflows/release.yml` with this exact content:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  release:
    runs-on: macos-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Type check
        run: bun run lint

      - name: Build darwin-x64
        run: bun build src/index.ts --compile --outfile dist/agenv-darwin-x64 --target bun-darwin-x64

      - name: Build darwin-arm64
        run: bun build src/index.ts --compile --outfile dist/agenv-darwin-arm64 --target bun-darwin-arm64

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
          files: |
            dist/agenv-darwin-x64
            dist/agenv-darwin-arm64
```

- [ ] **Step 3: Verify the workflow file parses as valid YAML**

```bash
bun -e "require('fs').readFileSync('.github/workflows/release.yml', 'utf8'); console.log('YAML readable')"
```

Expected output: `YAML readable`

- [ ] **Step 4: Verify the build commands work locally**

```bash
mkdir -p dist
bun build src/index.ts --compile --outfile dist/agenv-darwin-arm64 --target bun-darwin-arm64
bun build src/index.ts --compile --outfile dist/agenv-darwin-x64 --target bun-darwin-x64
ls -lh dist/
```

Expected: two files, each roughly 80-100MB.

- [ ] **Step 5: Smoke-test the native binary**

```bash
./dist/agenv-darwin-arm64 --help
```

Expected: prints agenv usage/help without errors.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add release workflow — builds mac binaries on tag push"
```

---

### Task 2: Installer script

**Files:**
- Create: `install.sh`

- [ ] **Step 1: Write the installer script**

Create `install.sh` at the repo root:

```sh
#!/bin/sh
set -e

REPO="HuxleyMc/agenv"
INSTALL_DIR="/usr/local/bin"
BINARY_NAME="agenv"

# Detect architecture
ARCH=$(uname -m)
case "$ARCH" in
  arm64)
    TARGET="darwin-arm64"
    ;;
  x86_64)
    TARGET="darwin-x64"
    ;;
  *)
    echo "Unsupported architecture: $ARCH" >&2
    echo "agenv only supports macOS (arm64, x86_64)" >&2
    exit 1
    ;;
esac

# Fetch latest release tag
printf 'Fetching latest release...\n'
TAG=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
  | grep '"tag_name"' \
  | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')

if [ -z "$TAG" ]; then
  echo "Error: could not determine latest release tag" >&2
  exit 1
fi

printf 'Installing agenv %s for %s...\n' "$TAG" "$TARGET"

# Download binary to temp file
URL="https://github.com/${REPO}/releases/download/${TAG}/agenv-${TARGET}"
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT
curl -fsSL "$URL" -o "$TMP"
chmod +x "$TMP"

# Install to /usr/local/bin (use sudo if directory not writable)
if [ -w "$INSTALL_DIR" ]; then
  mv "$TMP" "${INSTALL_DIR}/${BINARY_NAME}"
else
  sudo mv "$TMP" "${INSTALL_DIR}/${BINARY_NAME}"
fi

printf 'agenv %s installed to %s/%s\n' "$TAG" "$INSTALL_DIR" "$BINARY_NAME"
```

- [ ] **Step 2: Make the script executable**

```bash
chmod +x install.sh
```

- [ ] **Step 3: Verify the script is valid POSIX sh (no bashisms)**

```bash
sh -n install.sh
```

Expected: no output, exit code 0.

- [ ] **Step 4: Verify the arch-detection block locally**

```bash
sh -c '
ARCH=$(uname -m)
case "$ARCH" in
  arm64)   echo "would download: darwin-arm64" ;;
  x86_64)  echo "would download: darwin-x64" ;;
  *)       echo "unsupported: $ARCH"; exit 1 ;;
esac
'
```

Expected: prints `would download: darwin-arm64` on Apple Silicon, `would download: darwin-x64` on Intel.

- [ ] **Step 5: Commit**

```bash
git add install.sh
git commit -m "feat: add curl | sh installer script"
```

---

### Task 3: Update README installation section

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the Installation section**

Find this block in `README.md`:

```markdown
## Installation

```bash
bun install
bun run build        # compiles → dist/agenv
```

Then put `dist/agenv` somewhere on your `$PATH`.
```

Replace it with:

```markdown
## Installation

```sh
curl -fsSL https://raw.githubusercontent.com/HuxleyMc/agenv/main/install.sh | sh
```

This downloads the latest release binary for your Mac (Apple Silicon or Intel) and installs it to `/usr/local/bin/agenv`.

**Requirements:** macOS, `curl`

**Manual install:** Download a binary directly from [GitHub Releases](https://github.com/HuxleyMc/agenv/releases).
```

- [ ] **Step 2: Verify the README renders correctly**

```bash
cat README.md | head -20
```

Expected: Installation section shows the `curl` one-liner.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update installation instructions with curl installer"
```

---

### Task 4: End-to-end release verification

This task cannot be automated locally — it validates the full workflow runs correctly on GitHub.

- [ ] **Step 1: Push all commits**

```bash
git push origin main
```

- [ ] **Step 2: Tag and push to trigger the release workflow**

```bash
git tag v0.1.0
git push origin v0.1.0
```

- [ ] **Step 3: Monitor the Actions run**

Go to `https://github.com/HuxleyMc/agenv/actions` and watch the `Release` workflow. All steps should be green.

- [ ] **Step 4: Verify the release assets**

Go to `https://github.com/HuxleyMc/agenv/releases/tag/v0.1.0`. Confirm:
- Release exists with auto-generated notes
- Two assets present: `agenv-darwin-arm64` and `agenv-darwin-x64`

- [ ] **Step 5: Test the installer end-to-end**

```bash
# Temporarily move any existing agenv binary out of the way
sudo mv /usr/local/bin/agenv /usr/local/bin/agenv.bak 2>/dev/null || true

curl -fsSL https://raw.githubusercontent.com/HuxleyMc/agenv/main/install.sh | sh

agenv --version
# or
agenv --help
```

Expected: installer prints `agenv v0.1.0 installed to /usr/local/bin/agenv`, then `agenv --help` works.

- [ ] **Step 6: Restore backup if needed**

```bash
sudo mv /usr/local/bin/agenv.bak /usr/local/bin/agenv 2>/dev/null || true
```
