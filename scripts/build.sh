#!/bin/bash -e

#
# This file is meant to be called after Vite has finished building and does 3 things:
#  1. Copy the assets to their respective folder in the git submodule
#  2. Create copyparty/_vue_assets with paths to each file for python to use
#  3. Create copyparty/scripts/sfx-vue.ls with paths to each file for sfx bundling
#

RED='\033[1;31m'
GREEN='\033[0;32m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color
debug() {
	echo -ne "${BLUE}"
	echo -ne "$@"
	echo -e "${NC}"
}
error() {
	echo -ne "${RED}" >&2
	echo -ne "$@" >&2
	echo -e "${NC}" >&2
}
info() {
	echo -ne "${GREEN}"
	echo -ne "$@"
	echo -e "${NC}"
}
fatal() {
	# shellcheck disable=SC2068
	error "$@"
	exit 1
}

# https://stackoverflow.com/a/17841619
function join_with_newlines {
	local IFS=$'\n'
	echo "$*"
}

if [ ! -f "node_modules/.bin/vite" ]; then
	fatal "Could not find vite, did you run 'pnpm i'?"
fi

debug "Checking if submodule exists..."
git submodule status copyparty

MSYS_NO_PATHCONV=1 node_modules/.bin/vite build --base "/.cpr/vue"

sfx_files=('copyparty/web/vue,')
python_files=()
count=0
while IFS= read -r -d $'\0'; do
	path="${REPLY//dist\//}"
	sfx_files+=("copyparty/web/vue/${path},")
	if [ -f "$REPLY" ]; then
		python_files+=("web/vue/${path}")
	fi
	count=$((count + 1))
done < <(find dist/ -mindepth 1 -print0)

debug "Got $count files"

cat <<EOF >copyparty/copyparty/_vue_assets.py
VUE_ASSETS = """
$(join_with_newlines "${python_files[@]}")
"""
EOF

join_with_newlines "${sfx_files[@]}" >copyparty/scripts/sfx-vue.ls

rm -rf copyparty/copyparty/web/vue
mkdir copyparty/copyparty/web/vue
cp -r dist/* copyparty/copyparty/web/vue
