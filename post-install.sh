#!/usr/bin/env sh

if command -v zenity &> /dev/null
then
    if zenity --question --no-wrap --text="Extension's installed. Re-login to start using it.\n\nDo you want to logout now?"
        then gnome-session-quit --logout --no-prompt
    fi
else
    echo "Extension's installed. Re-login to start using it."
    read -t 10 -p "Do you want to logout now? (y/N): " confirm && [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]] || exit 0
    gnome-session-quit --logout
fi