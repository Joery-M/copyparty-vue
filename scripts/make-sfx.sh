#!/bin/bash -e

git submodule update

scripts/build.sh

cd copyparty

if [ ! -d ".venv" ]; then
	python -m venv .venv
fi

if [ -d '.venv/Scripts' ]; then
	. .venv/Scripts/activate
else
	. .venv/bin/activate
fi

./scripts/make-sfx.sh ign-wd

