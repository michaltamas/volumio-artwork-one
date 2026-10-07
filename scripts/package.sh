#!/usr/bin/env bash
# Package the plugin: dist/ becomes plugin/artwork_one/ui/, and the plugin folder is the release archive
# (artwork-one.tar.gz, which scripts/install.sh downloads) and the folder sent to Volumio's plugin store.
# Usage: scripts/package.sh [version]   e.g. scripts/package.sh v3.2.0
# Build first: npm ci && npm run build. Writes artwork-one.tar.gz and build/artwork_one/ in the repository root.
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION="${1:-$(git describe --tags --always 2>/dev/null || echo dev)}"
[ -f dist/index.html ] || { echo "error: no dist/ - run npm run build first" >&2; exit 1; }
rm -rf build/artwork_one && mkdir -p build
cp -a plugin/artwork_one build/artwork_one
rm -rf build/artwork_one/ui build/artwork_one/test
cp -a dist build/artwork_one/ui
echo "$VERSION" > build/artwork_one/ui/VERSION
# no macOS metadata in the archive (GNU tar on the player warns about it)
if tar --version 2>/dev/null | grep -q bsdtar; then
  COPYFILE_DISABLE=1 tar --no-mac-metadata --no-xattrs -czf artwork-one.tar.gz -C build artwork_one
else
  tar --no-xattrs -czf artwork-one.tar.gz -C build artwork_one 2>/dev/null || tar -czf artwork-one.tar.gz -C build artwork_one
fi
echo "artwork-one.tar.gz ($VERSION, $(du -h artwork-one.tar.gz | cut -f1)) — build/artwork_one/ is the plugin folder"
