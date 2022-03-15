#!/bin/bash

EXT_UUID=eepresetselector@ulville.github.io
ZIP_FILE=$EXT_UUID.zip

if [[ -f "$ZIP_FILE" ]]; then
    echo "$ZIP_FILE already exists. Removing..."
    rm $ZIP_FILE
    echo "$ZIP_FILE removed"
fi

cd $EXT_UUID
zip -r ../$ZIP_FILE *
echo "$ZIP_FILE builded"
cd ..