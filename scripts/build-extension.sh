#!/usr/bin/env bash
#
# Package the Chrome extension into a distributable .zip.
#
# The archive is named using the version from extension/manifest.json and
# written to dist/ at the repository root. Only the files the extension needs
# at runtime are included (no README, no dotfiles).
#
set -euo pipefail

# Resolve the repository root (this script lives in <root>/scripts).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

EXT_DIR="${ROOT_DIR}/extension"
DIST_DIR="${ROOT_DIR}/dist"
MANIFEST="${EXT_DIR}/manifest.json"

if [[ ! -f "${MANIFEST}" ]]; then
  echo "error: ${MANIFEST} not found" >&2
  exit 1
fi

# Pull the version out of manifest.json without extra tooling.
VERSION="$(node -p "require('${MANIFEST}').version")"

# Files that make up the shipped extension.
FILES=(manifest.json background.js popup.html popup.js)

OUTPUT="${DIST_DIR}/auth-proxy-switcher-${VERSION}.zip"

mkdir -p "${DIST_DIR}"
rm -f "${OUTPUT}"

# Zip from inside extension/ so paths in the archive are flat (no "extension/"
# prefix), which is what Chrome's "Load unpacked" / packing expects.
( cd "${EXT_DIR}" && zip -q -X "${OUTPUT}" "${FILES[@]}" )

echo "Built ${OUTPUT}"
