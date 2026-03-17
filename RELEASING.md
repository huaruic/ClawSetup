# Releasing ClawSetup

ClawSetup is distributed to end users through GitHub Releases.

## Release Flow

1. Confirm the desktop build works locally:
   ```bash
   npm ci
   npm run desktop:build
   ```
2. Create and push a version tag:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```
3. GitHub Actions runs `.github/workflows/release.yml`.
4. The workflow builds the macOS bundles and creates a draft GitHub Release.
5. Review the draft release and publish it.

## Release Artifacts

- `.dmg`
- `.app.tar.gz`

## Notes

- `desktop:prepare` generates the OpenClaw sidecar and bundled Node.js runtime.
- `src-tauri/binaries/`, `src-tauri/resources/node-runtime/`, and `src-tauri/target/` are build outputs and must not be committed.
- macOS signing and notarization are not configured yet; current releases are unsigned.
