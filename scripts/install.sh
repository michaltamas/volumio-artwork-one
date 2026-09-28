#!/usr/bin/env bash
# Install or update the Artwork One interface on a Volumio player.
#
# Run it on the player (over SSH):
#   curl -fsSL https://raw.githubusercontent.com/michaltamas/volumio-artwork-one/main/scripts/install.sh | bash
#
# The interface is unpacked to /data/artwork-ui (the same place as Artwork One 1.x and 2.x, which
# it replaces) and registered through Volumio's
# third-party UI list (/data/thirdPartyUisList.json). Both live on the data
# partition, so they survive Volumio system updates. Nothing in /volumio is touched.
#
# Options:
#   --version vX.Y.Z   install a specific release instead of the latest one
#   --from PATH        install from a local build: a dist/ folder or an artwork-one.tar.gz
#   --activate         make Artwork One the active interface and restart Volumio
#   --no-companion     skip the Artwork One Companion plugin (theme and ambient display kept on
#                      the player, for every screen); without it those stay per browser
#   -h, --help         show this help
#
# The companion plugin goes to /data/plugins/miscellanea/artwork_companion and is registered in
# Volumio's plugin list; Volumio restarts once so it loads.
#
# Environment (for testing): ARTWORK_INSTALL_DIR, ARTWORK_UI_LIST, ARTWORK_ACTIVE_UI, ARTWORK_PLUGIN_DIR, VOLUMIO_PLUGINS_JSON
set -euo pipefail

REPO="michaltamas/volumio-artwork-one"
ASSET="artwork-one.tar.gz"
UI_NAME="artwork"
UI_PRETTY_NAME="Artwork One"
INSTALL_DIR="${ARTWORK_INSTALL_DIR:-/data/artwork-ui}"
UI_LIST="${ARTWORK_UI_LIST:-/data/thirdPartyUisList.json}"
ACTIVE_UI="${ARTWORK_ACTIVE_UI:-/data/active_volumio_ui}"
PLUGIN_NAME="artwork_companion"
PLUGIN_DIR="${ARTWORK_PLUGIN_DIR:-/data/plugins/miscellanea/$PLUGIN_NAME}"
PLUGIN_CONF_DIR="${ARTWORK_PLUGIN_CONF_DIR:-/data/configuration/miscellanea/$PLUGIN_NAME}"
PLUGINS_JSON="${VOLUMIO_PLUGINS_JSON:-/data/configuration/plugins.json}"

VERSION="latest"
SOURCE=""
ACTIVATE=0
COMPANION=1

usage() {
  cat <<'HELP'
Install or update the Artwork One interface on a Volumio player.

Usage: install.sh [--version vX.Y.Z] [--from PATH] [--activate]

  --version vX.Y.Z   install a specific release instead of the latest one
  --from PATH        install from a local build: a dist/ folder or an artwork-one.tar.gz
  --activate         make Artwork One the active interface and restart Volumio
  --no-companion     skip the companion plugin (settings then stay per browser)
  -h, --help         show this help
HELP
}
die() { echo "error: $*" >&2; exit 1; }

while [ $# -gt 0 ]; do
  case "$1" in
    --version) [ $# -ge 2 ] || die "--version needs a value"; VERSION="$2"; shift 2 ;;
    --from)    [ $# -ge 2 ] || die "--from needs a path"; SOURCE="$2"; shift 2 ;;
    --activate) ACTIVATE=1; shift ;;
    --no-companion) COMPANION=0; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown option: $1 (see --help)" ;;
  esac
done

command -v node >/dev/null 2>&1 || die "node not found; run this on a Volumio player"
command -v tar  >/dev/null 2>&1 || die "tar not found"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
STAGE="$TMP/stage"
mkdir -p "$STAGE"

# 1) get the build into $STAGE
if [ -n "$SOURCE" ]; then
  if [ -d "$SOURCE" ]; then
    cp -a "$SOURCE"/. "$STAGE"/
  elif [ -f "$SOURCE" ]; then
    tar -xzf "$SOURCE" -C "$STAGE"
  else
    die "--from: $SOURCE does not exist"
  fi
else
  command -v curl >/dev/null 2>&1 || die "curl not found"
  if [ "$VERSION" = "latest" ]; then
    URL="https://github.com/$REPO/releases/latest/download/$ASSET"
  else
    URL="https://github.com/$REPO/releases/download/$VERSION/$ASSET"
  fi
  echo ">> downloading $URL"
  curl -fL --retry 3 --progress-bar -o "$TMP/$ASSET" "$URL" || die "download failed"
  tar -xzf "$TMP/$ASSET" -C "$STAGE"
fi

if [ ! -f "$STAGE/index.html" ] || [ ! -d "$STAGE/assets" ]; then
  die "this does not look like an Artwork One build (index.html or assets/ missing)"
fi

# the companion plugin travels inside the archive; it is not part of the interface files
COMPANION_SRC=""
if [ -d "$STAGE/companion" ]; then
  mv "$STAGE/companion" "$TMP/companion"
  COMPANION_SRC="$TMP/companion"
fi

# 2) swap it into place, so a browser never loads a half-copied interface
echo ">> installing to $INSTALL_DIR"
mkdir -p "$(dirname "$INSTALL_DIR")"
rm -rf "$INSTALL_DIR.new" "$INSTALL_DIR.old"
cp -a "$STAGE" "$INSTALL_DIR.new"
[ -d "$INSTALL_DIR" ] && mv "$INSTALL_DIR" "$INSTALL_DIR.old"
mv "$INSTALL_DIR.new" "$INSTALL_DIR"
rm -rf "$INSTALL_DIR.old"

# 3) register it where Volumio lists additional interfaces (idempotent)
UI_NAME="$UI_NAME" UI_PRETTY_NAME="$UI_PRETTY_NAME" INSTALL_DIR="$INSTALL_DIR" UI_LIST="$UI_LIST" node -e '
  const fs = require("fs");
  const { UI_NAME, UI_PRETTY_NAME, INSTALL_DIR, UI_LIST } = process.env;
  let list = [];
  try { list = JSON.parse(fs.readFileSync(UI_LIST, "utf8")); } catch (e) { list = []; }
  if (!Array.isArray(list)) { list = []; }
  list = list.filter(u => u && u.uiName !== UI_NAME && u.uiPath !== INSTALL_DIR);
  list.push({ uiPrettyName: UI_PRETTY_NAME, uiName: UI_NAME, uiPath: INSTALL_DIR });
  fs.writeFileSync(UI_LIST, JSON.stringify(list, null, 2));
'
echo ">> registered \"$UI_PRETTY_NAME\" in $UI_LIST"

INSTALLED="$(cat "$INSTALL_DIR/VERSION" 2>/dev/null || echo "local build")"

# 4) the companion plugin: the theme and the ambient display kept on the player, for every
#    screen it drives. Copied into Volumio's plugin tree and registered as enabled; Volumio
#    loads it on its next start.
RESTART=0
if [ "$COMPANION" -eq 1 ] && [ -n "$COMPANION_SRC" ] && [ -f "$COMPANION_SRC/package.json" ]; then
  NEW_PV="$(node -p 'require(process.argv[1]).version' "$COMPANION_SRC/package.json" 2>/dev/null || echo "?")"
  OLD_PV="$(node -p 'require(process.argv[1]).version' "$PLUGIN_DIR/package.json" 2>/dev/null || echo "")"
  mkdir -p "$(dirname "$PLUGIN_DIR")" "$PLUGIN_CONF_DIR"
  rm -rf "$PLUGIN_DIR.new"
  cp -a "$COMPANION_SRC" "$PLUGIN_DIR.new"
  rm -rf "$PLUGIN_DIR"
  mv "$PLUGIN_DIR.new" "$PLUGIN_DIR"
  [ -f "$PLUGIN_CONF_DIR/config.json" ] || echo '{}' > "$PLUGIN_CONF_DIR/config.json"
  REGISTERED="$(PLUGIN_NAME="$PLUGIN_NAME" PLUGINS_JSON="$PLUGINS_JSON" node -e '
    const fs = require("fs");
    const { PLUGIN_NAME, PLUGINS_JSON } = process.env;
    let all = {};
    try { all = JSON.parse(fs.readFileSync(PLUGINS_JSON, "utf8")); } catch (e) { all = {}; }
    all.miscellanea = all.miscellanea || {};
    const was = all.miscellanea[PLUGIN_NAME];
    const on = was && was.enabled && was.enabled.value === true && was.status && was.status.value === "STARTED";
    all.miscellanea[PLUGIN_NAME] = { enabled: { type: "boolean", value: true }, status: { type: "string", value: "STARTED" } };
    fs.writeFileSync(PLUGINS_JSON, JSON.stringify(all, null, 2));
    process.stdout.write(on ? "already" : "new");
  ')"
  if [ "$REGISTERED" = "new" ] || [ "$NEW_PV" != "$OLD_PV" ]; then RESTART=1; fi
  echo ">> companion plugin $NEW_PV installed to $PLUGIN_DIR"
elif [ "$COMPANION" -eq 1 ]; then
  echo ">> no companion plugin in this build; theme and ambient settings stay per browser"
fi

# 5) optionally switch to it; restart Volumio when it has to load something new
if [ "$ACTIVATE" -eq 1 ]; then
  printf '{"uiPrettyName":"%s","uiName":"%s","uiPath":"%s"}' "$UI_PRETTY_NAME" "$UI_NAME" "$INSTALL_DIR" > "$ACTIVE_UI"
  echo ">> $UI_PRETTY_NAME is now the active interface"
  RESTART=1
fi
if [ "$RESTART" -eq 1 ]; then
  echo ">> restarting Volumio"
  if command -v volumio >/dev/null 2>&1; then
    volumio vrestart || echo "   restart failed: run 'volumio vrestart' yourself"
  fi
fi
if [ "$ACTIVATE" -eq 1 ]; then
  echo "Done: Artwork One $INSTALLED is active. Reload the page in your browser."
else
  echo "Done: Artwork One $INSTALLED is installed."
  echo "Select it in Volumio: Settings > System > User Interface layout design > $UI_PRETTY_NAME, then Save."
fi
