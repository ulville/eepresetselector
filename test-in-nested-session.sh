#!/bin/sh -e

# This pollutes the output of `easyeffects -p` and breaks the functionality of the extension
# export G_MESSAGES_DEBUG=all 
 
export MUTTER_DEBUG_DUMMY_MODE_SPECS=1366x768
export SHELL_DEBUG=all

dbus-run-session -- \
    gnome-shell --nested \
                --wayland
