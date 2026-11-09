#!/bin/bash
set -euo pipefail

cd "$(dirname -- "${BASH_SOURCE[0]}")"
. ./utils.sh

if ! which docker >/dev/null 2>&1; then
	fatal Docker not found
fi

reka_version="$(pnpm list reka-ui --depth=0 --json | jq '.[0].dependencies."reka-ui".version' --raw-output)"
info "Patching reka-ui version $reka_version"

docker build -t reka-ui-patch --file "./reka-ui-patch/reka-ui-patch.dockerfile" "./reka-ui-patch/" --build-arg "REKA_UI_VERSION=$reka_version"

EDIT_DIR="$(realpath ./reka-ui-patch/edit-dir)"
TEMP_DIR="./reka-ui-patch/.tmp"

rm -rf "$EDIT_DIR" "$TEMP_DIR"
mkdir "$EDIT_DIR" "$TEMP_DIR"

info "Exporting build to patch folder"
MSYS_NO_PATHCONV=1 docker run --rm -v "${TEMP_DIR}:/output" -t reka-ui-patch

info "Applying changes"
pnpm patch reka-ui -d "scripts/reka-ui-patch/edit-dir"

tar --overwrite -xf ./reka-ui-patch/.tmp/reka-ui.tgz -C reka-ui-patch/edit-dir --strip-components=1

cd "$(dirname "$(pnpm root)")"
pnpm patch-commit "$EDIT_DIR"

rm -rf "$EDIT_DIR" "$TEMP_DIR"
