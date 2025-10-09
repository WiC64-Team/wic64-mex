.PHONY: install pretty check eslint pretty-check precommit watch-check


install: node_modules
	touch node_modules


node_modules: package.json
	npm install
	touch node_modules


pretty: install
	./node_modules/.bin/prettier --write "**/*.{js,json,css,md,html,njs}"

pretty-check: install
	./node_modules/.bin/prettier --check "**/*.{js,json,css,md,html,njs}"

check: pretty-check eslint

eslint: install
	./node_modules/.bin/eslint

precommit: pretty check



watch-check: install
	find | entr -c make check