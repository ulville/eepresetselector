EXT_UUID=eepresetselector@ulville.github.io
SCHEMAS_DIR=$EXT_UUID/schemas

if [ -f $SCHEMAS_DIR/gschemas.compiled ]; then
    echo "Compiled schemas exist. Removing."
    rm $SCHEMAS_DIR/gschemas.compiled
fi

echo "Compiling schemas"
glib-compile-schemas $SCHEMAS_DIR
