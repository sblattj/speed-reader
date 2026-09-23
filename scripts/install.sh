#!/usr/bin/env bash
# Speed Reader extension installer.
#
#   curl -fsSL https://github.com/sblattj/speed-reader/releases/latest/download/install.sh | bash
#
# Downloads the latest extension build into a stable folder, copies that
# folder's path to the clipboard, and opens the browser's extensions page so
# you only have to click "Load unpacked" and paste. Rerun it to update, then
# press the reload icon on the extension card. The folder never moves, so the
# extension keeps its ID and your settings across updates.
#
# Options (env vars):
#   SPEED_READER_DIR      install folder (default ~/.speed-reader/extension)
#   SPEED_READER_VERSION  tag to install, e.g. v1.1.0 (default latest)
#   SPEED_READER_BROWSER  macOS app name to open (default: first of Chrome, Arc, Brave, Edge)
set -euo pipefail

REPO="sblattj/speed-reader"
DEST="${SPEED_READER_DIR:-$HOME/.speed-reader/extension}"
VERSION="${SPEED_READER_VERSION:-latest}"
if [ "$VERSION" = "latest" ]; then
  URL="https://github.com/$REPO/releases/latest/download/speed-reader-extension.zip"
else
  URL="https://github.com/$REPO/releases/download/$VERSION/speed-reader-extension.zip"
fi

command -v curl >/dev/null || { echo "curl is required" >&2; exit 1; }
command -v unzip >/dev/null || { echo "unzip is required" >&2; exit 1; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "Downloading $URL"
curl -fsSL "$URL" -o "$tmp/ext.zip"
unzip -q "$tmp/ext.zip" -d "$tmp/ext"
[ -f "$tmp/ext/manifest.json" ] || { echo "download did not contain manifest.json" >&2; exit 1; }

mkdir -p "$DEST"
find "$DEST" -mindepth 1 -delete
cp -R "$tmp/ext/." "$DEST/"
installed="$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$DEST/manifest.json" | head -1)"

copied=""
if command -v pbcopy >/dev/null; then printf '%s' "$DEST" | pbcopy && copied=1
elif command -v wl-copy >/dev/null; then printf '%s' "$DEST" | wl-copy && copied=1
elif command -v xclip >/dev/null; then printf '%s' "$DEST" | xclip -selection clipboard && copied=1
fi

opened=""
if [ "$(uname)" = "Darwin" ]; then
  for app in ${SPEED_READER_BROWSER:+"$SPEED_READER_BROWSER"} "Google Chrome" "Arc" "Brave Browser" "Microsoft Edge"; do
    if open -Ra "$app" 2>/dev/null; then
      open -a "$app" "chrome://extensions" 2>/dev/null && opened="$app"
      break
    fi
  done
fi

cat <<MSG

Speed Reader ${installed:+v$installed }installed to:
  $DEST${copied:+   (path copied to clipboard)}

Finish in your browser${opened:+ ($opened should now show chrome://extensions)}:
  1. Go to chrome://extensions and turn on Developer mode (top right).
  2. First install: click "Load unpacked" and pick the folder above
     (in the file picker press Cmd+Shift+G on macOS, or Ctrl+L, and paste).
     Updating: click the reload icon on the Speed Reader card instead.
  3. Pin it, then press Alt+R on any page to speed read it.
MSG
