#!/usr/bin/env bash
# Build, then package the release assets into release/:
#   speed-reader-extension.zip  unpacked MV3 extension (dist/ contents at zip root)
#   speed-reader.html           standalone offline reader page
#   install.sh                  one-line installer for the extension
# Asset names carry no version so /releases/latest/download/<name> stays stable.
set -euo pipefail
cd "$(dirname "$0")/.."

bun run build
rm -rf release && mkdir -p release
(cd dist && zip -q -X -r ../release/speed-reader-extension.zip .)
cp index.html release/speed-reader.html
cp scripts/install.sh release/install.sh
ls -l release
