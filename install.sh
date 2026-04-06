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
