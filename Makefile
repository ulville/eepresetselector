BUNDLE_PATH = "eepresetselector@ulville.github.io.zip"
EXTENSION_DIR = "eepresetselector@ulville.github.io"

all: build install

.PHONY: build install translations pot test publish

build:
	rm -f $(BUNDLE_PATH)
	cd $(EXTENSION_DIR); \
	gnome-extensions pack --force --podir=locale \
	                      --extra-source=preferences/ \
	                      --extra-source=icons/ \
	                      --extra-source=COPYING; \
	mv $(EXTENSION_DIR).shell-extension.zip ../$(BUNDLE_PATH)

install:
	gnome-extensions install $(BUNDLE_PATH) --force
	@./post-install.sh

translations:
	./update-locale.sh

pot:
	./update-locale.sh -a

test:
	./test-in-nested-session.sh

# https://github.com/swsnr/ego-upload from swsnr
publish:
	ego-upload $(BUNDLE_PATH)