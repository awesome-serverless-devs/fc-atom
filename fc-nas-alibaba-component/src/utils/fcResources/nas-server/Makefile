TEST_FOLDER ?= ./test/
TEST_FILES ?= *.test.js
REPORTER = spec
TIMEOUT = 20000
PATH := ./node_modules/.bin:$(PATH)
SHELL := /bin/bash

lint:
	@npm run lint

unit-test:
	@mocha $(TEST_FOLDER) -t $(TIMEOUT) -R spec --recursive -name $(TEST_FILES) --grep '^(?!Integration::).*'

test: lint unit-test

install:
	env -i PATH="$(PATH)" npm install

clean:
	rm -rf ./dist

build: clean install
	env -i PATH="$(PATH)" npm run build
	git log -n 1 --pretty="format:%h" > ./dist/VERSION

package: build
	cd ./dist && zip -r ../../../../../dist/utils/fcResources/nas-server-"$$(<./VERSION)".zip  * .[^.]* -x "*.zip"
	cp -f ./dist/VERSION ../../../../dist/utils/fcResources/VERSION
