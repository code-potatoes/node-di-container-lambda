.PHONY: build


build:
	rm -Rf ./build/
	./node_modules/.bin/tsc
