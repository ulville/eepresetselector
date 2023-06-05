#!/usr/bin/env sh

cd eepresetselector@ulville.github.io || exit 1

pot="gnome-shell-extension-eepresetselector.pot"

touch "$pot"
xgettext -j ./*.js -o "$pot" --from-code UTF-8
xgettext -j preferences/*.js -o "$pot" --from-code UTF-8
xgettext -j schemas/*.xml -o "$pot" --from-code UTF-8

for locale_lang in locale/*; do
    po="$locale_lang/LC_MESSAGES/gnome-shell-extension-eepresetselector.po"
    echo "$po"
    msgmerge --backup=off -U "$po" "$pot"
    msgfmt "$po" -o "${po%po}mo"
done

rm "$pot"