#!/usr/bin/env bash
# Remove Artwork One from a Volumio player: the plugin, its settings, and an install made by the
# older script (/data/artwork-ui + the Companion) if one is still there.
#
# Run it on the player (over SSH):
#   curl -fsSL https://raw.githubusercontent.com/michaltamas/volumio-artwork-one/main/scripts/uninstall.sh | bash
#
# If Artwork One is the active interface, the player switches back to its default interface
# (the first one in Volumio's own list). Volumio restarts.
#
# Environment (for testing): ARTWORK_PLUGIN_DIR, ARTWORK_PLUGIN_CONF_DIR, VOLUMIO_PLUGINS_JSON, ARTWORK_UI_LIST, ARTWORK_ACTIVE_UI, VOLUMIO_UI_LIST
set -euo pipefail

UI_NAME="artwork"
PLUGIN_NAME="artwork_one"
PLUGIN_DIR="${ARTWORK_PLUGIN_DIR:-/data/plugins/user_interface/$PLUGIN_NAME}"
PLUGIN_CONF_DIR="${ARTWORK_PLUGIN_CONF_DIR:-/data/configuration/user_interface/$PLUGIN_NAME}"
PLUGINS_JSON="${VOLUMIO_PLUGINS_JSON:-/data/configuration/plugins.json}"
UI_LIST="${ARTWORK_UI_LIST:-/data/thirdPartyUisList.json}"
ACTIVE_UI="${ARTWORK_ACTIVE_UI:-/data/active_volumio_ui}"
CORE_UI_LIST="${VOLUMIO_UI_LIST:-/volumio/volumioUisList.json}"
OLD_UI_DIR="/data/artwork-ui"
OLD_PLUGIN_DIR="/data/plugins/miscellanea/artwork_companion"
OLD_PLUGIN_CONF="/data/configuration/miscellanea/artwork_companion"

command -v node >/dev/null 2>&1 || { echo "error: node not found; run this on a Volumio player" >&2; exit 1; }

# 1) the interface out of Volumio's list (every Artwork One entry, old or new)
if [ -f "$UI_LIST" ]; then
  UI_NAME="$UI_NAME" UI_LIST="$UI_LIST" node -e '
    const fs = require("fs"); const { UI_NAME, UI_LIST } = process.env;
    let list = []; try { list = JSON.parse(fs.readFileSync(UI_LIST, "utf8")); } catch (e) { list = []; }
    if (!Array.isArray(list)) { list = []; }
    fs.writeFileSync(UI_LIST, JSON.stringify(list.filter(u => u && u.uiName !== UI_NAME), null, 2));
  '
  echo ">> removed Artwork One from $UI_LIST"
fi

# 2) if it is the active interface, fall back to the player's default one
if [ -f "$ACTIVE_UI" ] && grep -q "\"uiName\": *\"$UI_NAME\"" "$ACTIVE_UI" 2>/dev/null; then
  UI_NAME="$UI_NAME" ACTIVE_UI="$ACTIVE_UI" CORE_UI_LIST="$CORE_UI_LIST" node -e '
    const fs = require("fs");
    let core = []; try { core = JSON.parse(fs.readFileSync(process.env.CORE_UI_LIST, "utf8")); } catch (e) { core = []; }
    const next = core.find(u => u && u.uiName !== process.env.UI_NAME && u.uiPath && fs.existsSync(u.uiPath)) ||
      { uiPrettyName: "Classic", uiName: "classic", uiPath: "/volumio/http/www" };
    fs.writeFileSync(process.env.ACTIVE_UI, JSON.stringify(next));
    console.log(">> switched the active interface back to " + next.uiPrettyName);
  '
fi

# 3) the plugin and its settings, out of the list and off the disk
PLUGIN_NAME="$PLUGIN_NAME" PLUGINS_JSON="$PLUGINS_JSON" node -e '
  const fs = require("fs"); const { PLUGIN_NAME, PLUGINS_JSON } = process.env;
  let all = {}; try { all = JSON.parse(fs.readFileSync(PLUGINS_JSON, "utf8")); } catch (e) { all = {}; }
  let changed = false;
  if (all.user_interface && all.user_interface[PLUGIN_NAME]) { delete all.user_interface[PLUGIN_NAME]; changed = true; }
  if (all.miscellanea && all.miscellanea.artwork_companion) { delete all.miscellanea.artwork_companion; changed = true; }
  if (changed) { fs.writeFileSync(PLUGINS_JSON, JSON.stringify(all, null, 2)); }
' 2>/dev/null || true
rm -rf "$PLUGIN_DIR" "$PLUGIN_DIR.new" "$PLUGIN_DIR.old" "$PLUGIN_CONF_DIR"
rm -rf "$OLD_UI_DIR" "$OLD_UI_DIR.new" "$OLD_UI_DIR.old" "$OLD_PLUGIN_DIR" "$OLD_PLUGIN_DIR.new" "$OLD_PLUGIN_CONF"
echo ">> deleted the plugin and its settings"

if command -v volumio >/dev/null 2>&1; then
  echo ">> restarting Volumio"
  volumio vrestart || echo "   restart failed: run 'volumio vrestart' yourself"
fi
echo "Done: Artwork One is uninstalled."
