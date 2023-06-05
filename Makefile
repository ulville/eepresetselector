uuid = eepresetselector@ulville.github.io
install_dir = ~/.local/share/gnome-shell/extensions

all: build install

.PHONY: build install dist

build:
	./update-locale.sh
	glib-compile-schemas --strict $(uuid)/schemas

dist: build
	rm -f $(uuid).zip
	cd $(uuid) && zip -r ../$(uuid).zip ./* --exclude \*.po

install:
	install -d $(install_dir)
	cp -a $(uuid)/ $(install_dir)/
	@echo "Extension installed. Re-login to start using it"