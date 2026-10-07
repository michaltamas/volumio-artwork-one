#!/usr/bin/env bash
# Development loop: build, package and install the current tree on a player over SSH.
# Usage: scripts/deploy.sh [user@host] [--activate]   (default volumio@volumio.local)
set -euo pipefail
HOST="${1:-volumio@volumio.local}"; shift || true
cd "$(dirname "$0")/.."
npm run build
scripts/package.sh dev
scp -q artwork-one.tar.gz scripts/install.sh "$HOST":/tmp/
# shellcheck disable=SC2029  # the options are meant to expand here, on the way to the player
ssh "$HOST" "bash /tmp/install.sh --from /tmp/artwork-one.tar.gz $* && rm -f /tmp/artwork-one.tar.gz /tmp/install.sh"
