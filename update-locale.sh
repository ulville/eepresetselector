#!/usr/bin/env sh

cd eepresetselector@ulville.github.io || exit 1

pot="gnome-shell-extension-eepresetselector.pot"

touch "$pot"
xgettext -j ./*.js -o "$pot" --from-code UTF-8
xgettext -j preferences/*.js -o "$pot" --from-code UTF-8
xgettext -j schemas/*.xml -o "$pot" --from-code UTF-8

if [ "$1" = "-a" ]; then
    echo "Template created as $pot"
    echo "Use it to create a po file for a new language"
    echo -e "Don't forget to remove \e[33m$pot\e[0m after you created your .po file"
else
    for po in locale/*; do
        echo "$po"
        msgmerge --backup=off -U "$po" "$pot"
    done

    rm "$pot"
fi