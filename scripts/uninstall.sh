#!/usr/bin/env bash
# Remove the Artwork One interface from a Volumio player.
#
# Run it on the player (over SSH):
#   curl -fsSL https://raw.githubusercontent.com/michaltamas/volumio-artwork-one/main/scripts/uninstall.sh | bash
#
# If Artwork One is the active interface, the player switches back to its default
# interface (the first one in Volumio's own list) and Volumio restarts.
#
# The companion plugin (/data/plugins/miscellanea/artwork_companion) goes too, with its settings.
#
# Environment (for testing): ARTWORK_INSTALL_DIR, ARTWORK_UI_LIST, ARTWORK_ACTIVE_UI, VOLUMIO_UI_LIST, ARTWORK_PLUGIN_DIR, VOLUMIO_PLUGINS_JSON
set -euo pipefail

UI_NAME="artwork"
INSTALL_DIR="${ARTWORK_INSTALL_DIR:-/data/artwork-ui}"
UI_LIST="${ARTWORK_UI_LIST:-/data/thirdPartyUisList.json}"
ACTIVE_UI="${ARTWORK_ACTIVE_UI:-/data/active_volumio_ui}"
CORE_UI_LIST="${VOLUMIO_UI_LIST:-/volumio/volumioUisList.json}"
PLUGIN_NAME="artwork_companion"
PLUGIN_DIR="${ARTWORK_PLUGIN_DIR:-/data/plugins/miscellanea/$PLUGIN_NAME}"
PLUGIN_CONF_DIR="${ARTWORK_PLUGIN_CONF_DIR:-/data/configuration/miscellanea/$PLUGIN_NAME}"
PLUGINS_JSON="${VOLUMIO_PLUGINS_JSON:-/data/configuration/plugins.json}"

command -v node >/dev/null 2>&1 || { echo "error: node not found; run this on a Volumio player" >&2; exit 1; }

# 1) unregister
if [ -f "$UI_LIST" ]; then
  UI_NAME="$UI_NAME" INSTALL_DIR="$INSTALL_DIR" UI_LIST="$UI_LIST" node -e '
    const fs = require("fs");
    const { UI_NAME, INSTALL_DIR, UI_LIST } = process.env;
    let list = [];
    try { list = JSON.parse(fs.readFileSync(UI_LIST, "utf8")); } catch (e) { list = []; }
    if (!Array.isArray(list)) { list = []; }
    fs.writeFileSync(UI_LIST, JSON.stringify(list.filter(u => u && u.uiName !== UI_NAME && u.uiPath !== INSTALL_DIR), null, 2));
  '
  echo ">> removed Artwork One from $UI_LIST"
fi

# 2) if it is the active interface, fall back to the player's default one
RESTART=0
if [ -f "$ACTIVE_UI" ] && ACTIVE_UI="$ACTIVE_UI" INSTALL_DIR="$INSTALL_DIR" node -e '
    const fs = require("fs");
    const a = JSON.parse(fs.readFileSync(process.env.ACTIVE_UI, "utf8"));
    process.exit(a && a.uiPath === process.env.INSTALL_DIR ? 0 : 1);
  ' 2>/dev/null; then
  UI_NAME="$UI_NAME" ACTIVE_UI="$ACTIVE_UI" CORE_UI_LIST="$CORE_UI_LIST" node -e '
    const fs = require("fs");
    let core = [];
    try { core = JSON.parse(fs.readFileSync(process.env.CORE_UI_LIST, "utf8")); } catch (e) { core = []; }
    const next = core.find(u => u && u.uiName !== process.env.UI_NAME && u.uiPath && fs.existsSync(u.uiPath)) ||
      { uiPrettyName: "Classic", uiName: "classic", uiPath: "/volumio/http/www" };
    fs.writeFileSync(process.env.ACTIVE_UI, JSON.stringify(next));
    console.log(">> switched the active interface back to " + next.uiPrettyName);
  '
  RESTART=1
fi

# 3) delete the files
rm -rf "$INSTALL_DIR" "$INSTALL_DIR.new" "$INSTALL_DIR.old"
echo ">> deleted $INSTALL_DIR"

# 4) the companion plugin and its settings
if [ -d "$PLUGIN_DIR" ] || [ -d "$PLUGIN_CONF_DIR" ]; then
  rm -rf "$PLUGIN_DIR" "$PLUGIN_DIR.new" "$PLUGIN_CONF_DIR"
  if [ -f "$PLUGINS_JSON" ]; then
    PLUGIN_NAME="$PLUGIN_NAME" PLUGINS_JSON="$PLUGINS_JSON" node -e '
      const fs = require("fs");
      const { PLUGIN_NAME, PLUGINS_JSON } = process.env;
      let all = {};
      try { all = JSON.parse(fs.readFileSync(PLUGINS_JSON, "utf8")); } catch (e) { all = {}; }
      if (all.miscellanea && all.miscellanea[PLUGIN_NAME]) { delete all.miscellanea[PLUGIN_NAME]; fs.writeFileSync(PLUGINS_JSON, JSON.stringify(all, null, 2)); }
    '
  fi
  echo ">> removed the companion plugin"
  RESTART=1
fi

if [ "$RESTART" -eq 1 ] && command -v volumio >/dev/null 2>&1; then
  echo ">> restarting Volumio"
  volumio vrestart || echo "   restart failed: run 'volumio vrestart' yourself"
fi
echo "Done: Artwork One is uninstalled."
