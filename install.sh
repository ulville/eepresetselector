#!/bin/bash

EXT_UUID=eepresetselector@ulville.github.io

if (( $EUID == 0 )); then
	INSTALL_DIR="/usr/share/gnome-shell/extensions/"
    echo "Installing as system extension"
else
    echo "Installing as user extension"
	INSTALL_DIR="$HOME/.local/share/gnome-shell/extensions/"
fi

if [ ! -d $INSTALL_DIR ]; then
    echo "$INSTALL_DIR doesn't exist. Creating..."
	mkdir $INSTALL_DIR
fi

echo "Installing extension files into $INSTALL_DIR$EXT_UUID"
cp -r $EXT_UUID $INSTALL_DIR

echo "Done."
echo "Restarting your GNOME Shell at this point is recommended"
exit 0
