#!/usr/bin/env bash
# Install or update Artwork One on a Volumio player, as the plugin it is.
#
# Run it on the player (over SSH):
#   curl -fsSL https://raw.githubusercontent.com/michaltamas/volumio-artwork-one/main/scripts/install.sh | bash
#
# It puts the plugin (the interface under ui/, and the settings it keeps) in
# /data/plugins/user_interface/artwork_one, registers it in Volumio's plugin list as enabled, and
# restarts Volumio once so it loads; the plugin then registers the interface itself. It is the same
# plugin the Volumio plugin store carries. Everything lives on the data partition, so it survives
# system updates. Nothing in /volumio is touched.
#
# An Artwork One 1.x–3.1 install made by the older script (/data/artwork-ui + the Companion plugin) is
# replaced: the plugin takes the interface entry and the settings over, and the old files are removed.
#
# Options:
#   --version vX.Y.Z   install a specific release instead of the latest one
#   --from PATH        install from a local build: a build/artwork_one folder or an artwork-one.tar.gz
#   --activate         make Artwork One the active interface
#   -h, --help         show this help
#
# Environment (for testing): ARTWORK_PLUGIN_DIR, ARTWORK_PLUGIN_CONF_DIR, VOLUMIO_PLUGINS_JSON, ARTWORK_UI_LIST, ARTWORK_ACTIVE_UI
set -euo pipefail

REPO="michaltamas/volumio-artwork-one"
ASSET="artwork-one.tar.gz"
PLUGIN_NAME="artwork_one"
PLUGIN_DIR="${ARTWORK_PLUGIN_DIR:-/data/plugins/user_interface/$PLUGIN_NAME}"
PLUGIN_CONF_DIR="${ARTWORK_PLUGIN_CONF_DIR:-/data/configuration/user_interface/$PLUGIN_NAME}"
PLUGINS_JSON="${VOLUMIO_PLUGINS_JSON:-/data/configuration/plugins.json}"
UI_LIST="${ARTWORK_UI_LIST:-/data/thirdPartyUisList.json}"
ACTIVE_UI="${ARTWORK_ACTIVE_UI:-/data/active_volumio_ui}"
OLD_UI_DIR="/data/artwork-ui"
OLD_PLUGIN_DIR="/data/plugins/miscellanea/artwork_companion"
OLD_PLUGIN_CONF="/data/configuration/miscellanea/artwork_companion"

VERSION="latest"
SOURCE=""
ACTIVATE=0

usage() {
  cat <<'HELP'
Install or update Artwork One on a Volumio player.

Usage: install.sh [--version vX.Y.Z] [--from PATH] [--activate]

  --version vX.Y.Z   install a specific release instead of the latest one
  --from PATH        install from a local build: a build/artwork_one folder or an artwork-one.tar.gz
  --activate         make Artwork One the active interface
  -h, --help         show this help
HELP
}
die() { echo "error: $*" >&2; exit 1; }

while [ $# -gt 0 ]; do
  case "$1" in
    --version) [ $# -ge 2 ] || die "--version needs a value"; VERSION="$2"; shift 2 ;;
    --from)    [ $# -ge 2 ] || die "--from needs a path"; SOURCE="$2"; shift 2 ;;
    --activate) ACTIVATE=1; shift ;;
    --no-companion) shift ;;   # 3.1 and earlier: nothing to skip any more
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

# 1) get the plugin folder into $STAGE/artwork_one
if [ -n "$SOURCE" ]; then
  if [ -d "$SOURCE" ]; then
    mkdir -p "$STAGE/$PLUGIN_NAME" && cp -a "$SOURCE"/. "$STAGE/$PLUGIN_NAME"/
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
SRC="$STAGE/$PLUGIN_NAME"
[ -f "$SRC/package.json" ] && [ -f "$SRC/ui/index.html" ] || die "this does not look like an Artwork One plugin build (package.json or ui/index.html missing)"
NEW_PV="$(node -p 'require(process.argv[1]).version' "$SRC/package.json" 2>/dev/null || echo "?")"

# 2) the plugin, swapped into place so a browser never loads a half-copied interface
echo ">> installing Artwork One $NEW_PV to $PLUGIN_DIR"
mkdir -p "$(dirname "$PLUGIN_DIR")" "$PLUGIN_CONF_DIR"
rm -rf "$PLUGIN_DIR.new" "$PLUGIN_DIR.old"
cp -a "$SRC" "$PLUGIN_DIR.new"
[ -d "$PLUGIN_DIR" ] && mv "$PLUGIN_DIR" "$PLUGIN_DIR.old"
mv "$PLUGIN_DIR.new" "$PLUGIN_DIR"
rm -rf "$PLUGIN_DIR.old"
[ -f "$PLUGIN_CONF_DIR/config.json" ] || echo '{}' > "$PLUGIN_CONF_DIR/config.json"

# 3) registered as enabled in Volumio's plugin list (idempotent); Volumio starts it on its next start
PLUGIN_NAME="$PLUGIN_NAME" PLUGINS_JSON="$PLUGINS_JSON" node -e '
  const fs = require("fs");
  const { PLUGIN_NAME, PLUGINS_JSON } = process.env;
  let all = {};
  try { all = JSON.parse(fs.readFileSync(PLUGINS_JSON, "utf8")); } catch (e) { all = {}; }
  all.user_interface = all.user_interface || {};
  all.user_interface[PLUGIN_NAME] = { enabled: { type: "boolean", value: true }, status: { type: "string", value: "STARTED" } };
  // the old companion is gone from the list too
  if (all.miscellanea && all.miscellanea.artwork_companion) { delete all.miscellanea.artwork_companion; }
  fs.writeFileSync(PLUGINS_JSON, JSON.stringify(all, null, 2));
'
echo ">> registered the plugin in $PLUGINS_JSON"

# 4) an install made by the older script: its settings come over, the active interface stays Artwork One
#    (now the plugin's), and the old files go — the plugin itself cleans the interface list on start
if [ -d "$OLD_PLUGIN_CONF" ] && [ ! -s "$PLUGIN_CONF_DIR/config.json" -o "$(cat "$PLUGIN_CONF_DIR/config.json")" = "{}" ]; then
  cp "$OLD_PLUGIN_CONF/config.json" "$PLUGIN_CONF_DIR/config.json" 2>/dev/null && echo ">> settings taken over from the Artwork One Companion" || true
fi
if [ -f "$ACTIVE_UI" ] && grep -q "\"uiPath\": *\"$OLD_UI_DIR\"" "$ACTIVE_UI" 2>/dev/null; then
  printf '{"uiPrettyName":"Artwork One","uiName":"artwork","uiPath":"%s/ui"}' "$PLUGIN_DIR" > "$ACTIVE_UI"
  echo ">> the active interface is now the plugin's"
fi
if [ -d "$OLD_UI_DIR" ] || [ -d "$OLD_PLUGIN_DIR" ]; then
  rm -rf "$OLD_UI_DIR" "$OLD_UI_DIR.new" "$OLD_UI_DIR.old" "$OLD_PLUGIN_DIR" "$OLD_PLUGIN_DIR.new" "$OLD_PLUGIN_CONF"
  UI_LIST="$UI_LIST" OLD_UI_DIR="$OLD_UI_DIR" node -e '
    const fs = require("fs"); const { UI_LIST, OLD_UI_DIR } = process.env;
    let list = []; try { list = JSON.parse(fs.readFileSync(UI_LIST, "utf8")); } catch (e) { list = []; }
    if (Array.isArray(list)) { fs.writeFileSync(UI_LIST, JSON.stringify(list.filter(u => u && u.uiPath !== OLD_UI_DIR), null, 2)); }
  ' 2>/dev/null || true
  echo ">> removed the older install ($OLD_UI_DIR, the Companion)"
fi

# 5) optionally make it the active interface (the plugin's start registers the interface; the flag is read then)
if [ "$ACTIVATE" -eq 1 ]; then
  printf '{"uiPrettyName":"Artwork One","uiName":"artwork","uiPath":"%s/ui"}' "$PLUGIN_DIR" > "$ACTIVE_UI"
  echo ">> Artwork One will be the active interface"
fi

echo ">> restarting Volumio"
if command -v volumio >/dev/null 2>&1; then
  volumio vrestart || echo "   restart failed: run 'volumio vrestart' yourself"
fi
if [ "$ACTIVATE" -eq 1 ]; then
  echo "Done: Artwork One $NEW_PV is installed and active. Reload the page in your browser."
else
  echo "Done: Artwork One $NEW_PV is installed."
  echo "Select it in Volumio: Settings > System > User Interface layout design > Artwork One, then Save."
fi
