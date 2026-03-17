#!/usr/bin/env bash
# Tauri sidecar wrapper for openclaw.
# Locates the bundled Node.js + openclaw relative to this script.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# In development: sidecar is in src-tauri/binaries/, resources in src-tauri/resources/node-runtime/
# In tauri:dev: sidecar may be staged into src-tauri/target/debug alongside node + node_modules/
# In bundled .app: sidecar is in Contents/MacOS/, resources flattened into Contents/Resources/
for candidate in \
  "$SCRIPT_DIR" \
  "$SCRIPT_DIR/../../resources/node-runtime" \
  "$SCRIPT_DIR/../resources/node-runtime" \
  "$SCRIPT_DIR/../Resources" \
  "$SCRIPT_DIR/../Resources/node-runtime" \
  "$SCRIPT_DIR/../Resources/resources/node-runtime"; do
  if [ -f "$candidate/node" ] && [ -f "$candidate/node_modules/openclaw/openclaw.mjs" ]; then
    RUNTIME_DIR="$(cd "$candidate" && pwd)"
    break
  fi
done

if [ -z "${RUNTIME_DIR:-}" ]; then
  echo "Error: Could not find bundled Node.js runtime" >&2
  echo "Searched from: $SCRIPT_DIR" >&2
  exit 1
fi

exec "$RUNTIME_DIR/node" "$RUNTIME_DIR/node_modules/openclaw/openclaw.mjs" "$@"
