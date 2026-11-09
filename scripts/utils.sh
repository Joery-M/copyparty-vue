#!/bin/bash

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
