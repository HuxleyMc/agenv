#!/bin/sh
set -e

REPO="HuxleyMc/agenv"
BINARY_NAME="agenv"
INSTALL_DIR="${HOME}/.local/share/agenv"
BIN_DIR="${HOME}/.local/bin"

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

# Install binary to ~/.local/share/agenv/
mkdir -p "$INSTALL_DIR"
mv "$TMP" "${INSTALL_DIR}/${BINARY_NAME}"

# Create symlink in ~/.local/bin/
mkdir -p "$BIN_DIR"
ln -sf "${INSTALL_DIR}/${BINARY_NAME}" "${BIN_DIR}/${BINARY_NAME}"

printf 'agenv %s installed to %s/%s\n' "$TAG" "$INSTALL_DIR" "$BINARY_NAME"
printf 'Symlink created at %s/%s\n' "$BIN_DIR" "$BINARY_NAME"

# Remind user to add ~/.local/bin to PATH if needed
case ":${PATH}:" in
  *":${BIN_DIR}:"*) ;;
  *)
    printf '\nNote: add %s to your PATH:\n' "$BIN_DIR"
    printf '  export PATH="%s:$PATH"\n' "$BIN_DIR"
    ;;
esac
