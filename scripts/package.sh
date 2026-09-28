#!/usr/bin/env bash
# Package dist/ as the release archive that scripts/install.sh downloads.
# Usage: scripts/package.sh [version]   e.g. scripts/package.sh v3.0.0
# Writes artwork-one.tar.gz in the repository root. Build first: npm ci && npm run build
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION="${1:-$(git describe --tags --always 2>/dev/null || echo dev)}"
[ -f dist/index.html ] || { echo "error: no dist/ - run npm run build first" >&2; exit 1; }
echo "$VERSION" > dist/VERSION
# the companion plugin rides along under companion/; the installer lifts it out before the UI is copied
rm -rf dist/companion && cp -a plugin/artwork_companion dist/companion
# no macOS metadata in the archive (GNU tar on the player warns about it)
if tar --version 2>/dev/null | grep -q bsdtar; then
  COPYFILE_DISABLE=1 tar --no-mac-metadata --no-xattrs -czf artwork-one.tar.gz -C dist .
else
  tar --no-xattrs -czf artwork-one.tar.gz -C dist . 2>/dev/null || tar -czf artwork-one.tar.gz -C dist .
fi
echo "artwork-one.tar.gz ($VERSION, $(du -h artwork-one.tar.gz | cut -f1))"
