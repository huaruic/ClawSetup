#!/usr/bin/env bash
set -euo pipefail

# Prepare a portable Node.js + openclaw runtime for the Tauri desktop bundle.
#
# Strategy: Since openclaw is ESM and requires Node.js >= 22,
# we prepare a bundled runtime by:
#   1. Download a standalone Node.js 22 binary
#   2. Install openclaw into a local prefix
#   3. Render a wrapper script that acts as the sidecar entry point
#
# Output:
#   src-tauri/binaries/openclaw-<target-triple>   (wrapper script)
#   src-tauri/resources/node-runtime/              (Node.js + openclaw)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BINARIES_DIR="$PROJECT_DIR/src-tauri/binaries"
RESOURCES_DIR="$PROJECT_DIR/src-tauri/resources/node-runtime"
WRAPPER_TEMPLATE="$SCRIPT_DIR/templates/openclaw-wrapper.sh"

NODE_VERSION="22.15.0"

# Detect host target triple
detect_target() {
  local arch os
  arch="$(uname -m)"
  os="$(uname -s)"
  case "$os" in
    Darwin)
      case "$arch" in
        x86_64)  echo "x86_64-apple-darwin" ;;
        arm64)   echo "aarch64-apple-darwin" ;;
        *)       echo "Error: unsupported arch: $arch" >&2; exit 1 ;;
      esac ;;
    Linux)
      case "$arch" in
        x86_64)  echo "x86_64-unknown-linux-gnu" ;;
        aarch64) echo "aarch64-unknown-linux-gnu" ;;
        *)       echo "Error: unsupported arch: $arch" >&2; exit 1 ;;
      esac ;;
    *) echo "Error: unsupported OS: $os" >&2; exit 1 ;;
  esac
}

# Map target triple to Node.js download identifier
node_platform() {
  case "$1" in
    x86_64-apple-darwin)        echo "darwin-x64" ;;
    aarch64-apple-darwin)       echo "darwin-arm64" ;;
    x86_64-unknown-linux-gnu)   echo "linux-x64" ;;
    aarch64-unknown-linux-gnu)  echo "linux-arm64" ;;
    *) echo "Error: unknown target $1" >&2; exit 1 ;;
  esac
}

TARGET="$(detect_target)"
NODE_PLATFORM="$(node_platform "$TARGET")"
echo "==> Target: $TARGET (Node.js platform: $NODE_PLATFORM)"

if [ ! -f "$WRAPPER_TEMPLATE" ]; then
  echo "Error: wrapper template not found: $WRAPPER_TEMPLATE" >&2
  exit 1
fi

# Clean previous build
rm -rf "$RESOURCES_DIR"
mkdir -p "$RESOURCES_DIR" "$BINARIES_DIR"

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

# 1. Download Node.js
NODE_ARCHIVE="node-v${NODE_VERSION}-${NODE_PLATFORM}.tar.gz"
NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/${NODE_ARCHIVE}"
echo "==> Downloading Node.js v${NODE_VERSION}..."
curl -fSL --progress-bar -o "$WORK_DIR/$NODE_ARCHIVE" "$NODE_URL"

echo "==> Extracting Node.js..."
tar -xzf "$WORK_DIR/$NODE_ARCHIVE" -C "$WORK_DIR"
NODE_DIR="$WORK_DIR/node-v${NODE_VERSION}-${NODE_PLATFORM}"

# Copy only the node binary (we don't need npm/npx in the final bundle)
cp "$NODE_DIR/bin/node" "$RESOURCES_DIR/node"
chmod +x "$RESOURCES_DIR/node"

# 2. Install openclaw into resources
echo "==> Installing openclaw..."
cd "$RESOURCES_DIR"
# Use the downloaded node's npm to install openclaw
export PATH="$NODE_DIR/bin:$PATH"
npm init -y > /dev/null 2>&1
npm install openclaw --omit=dev 2>&1 | tail -5

# Verify the entry point exists
if [ ! -f "$RESOURCES_DIR/node_modules/openclaw/openclaw.mjs" ]; then
  echo "Error: openclaw.mjs not found after install" >&2
  ls -la "$RESOURCES_DIR/node_modules/openclaw/" >&2
  exit 1
fi

# Remove unnecessary files to reduce bundle size
echo "==> Cleaning up to reduce bundle size..."
rm -rf "$RESOURCES_DIR/node_modules/.package-lock.json"
cd "$RESOURCES_DIR"
# Source maps (~67MB)
find node_modules -name "*.map" -delete 2>/dev/null || true
find node_modules -name "*.map.js" -delete 2>/dev/null || true
# Type definitions
find node_modules -name "*.d.ts" -delete 2>/dev/null || true
find node_modules -name "*.d.mts" -delete 2>/dev/null || true
# Tests, examples (skip openclaw/ and dist/ entirely — they may contain runtime files)
find node_modules -type d \( -name "__tests__" -o -name "test" -o -name "tests" -o -name "example" -o -name "examples" \) \
  -not -path "*/openclaw/*" -not -path "*/dist/*" -exec rm -rf {} + 2>/dev/null || true
# Docs dirs (but NOT openclaw/docs which has runtime templates, NOT dist/doc which has runtime code)
find node_modules -maxdepth 3 -type d -name "docs" \
  -not -path "*/openclaw/*" -not -path "*/dist/*" -exec rm -rf {} + 2>/dev/null || true
# Misc files (but NOT .md inside openclaw/ — templates like AGENTS.md are required at runtime)
find node_modules -name "*.md" -not -path "*/openclaw/*" -delete 2>/dev/null || true
find node_modules -name "LICENSE*" -not -path "*/openclaw/*" -delete 2>/dev/null || true
find node_modules -name "CHANGELOG*" -delete 2>/dev/null || true
find node_modules -name "*.txt" -not -path "*/dist/*" -not -path "*/openclaw/*" -delete 2>/dev/null || true
find node_modules \( -name ".eslintrc*" -o -name ".prettierrc*" -o -name "tsconfig*.json" -o -name ".npmignore" \) -not -path "*/openclaw/*" | xargs rm -f 2>/dev/null || true

# 3. Create the sidecar wrapper script
WRAPPER="$BINARIES_DIR/openclaw-$TARGET"
cp "$WRAPPER_TEMPLATE" "$WRAPPER"

chmod +x "$WRAPPER"

# Summary
echo ""
echo "==> Build complete!"
echo "    Sidecar wrapper: $WRAPPER"
echo "    Node.js runtime: $RESOURCES_DIR/node"
NODE_SIZE=$(du -sh "$RESOURCES_DIR/node" | cut -f1)
MODULES_SIZE=$(du -sh "$RESOURCES_DIR/node_modules" | cut -f1)
echo "    Node.js size:    $NODE_SIZE"
echo "    Modules size:    $MODULES_SIZE"
TOTAL_SIZE=$(du -sh "$RESOURCES_DIR" | cut -f1)
echo "    Total runtime:   $TOTAL_SIZE"
