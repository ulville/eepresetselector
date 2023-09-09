#!/usr/bin/env sh

cd eepresetselector@ulville.github.io || exit 1

pot="gnome-shell-extension-eepresetselector.pot"

touch "$pot"
xgettext -j ./*.js -o "$pot" --from-code UTF-8
xgettext -j preferences/*.js -o "$pot" --from-code UTF-8
xgettext -j schemas/*.xml -o "$pot" --from-code UTF-8

for po in locale/*; do
    echo "$po"
    msgmerge --backup=off -U "$po" "$pot"
done

rm "$pot"