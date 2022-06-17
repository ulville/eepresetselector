<img height="128" src="eepresetselector@ulville.github.io/icons/eepresetselector.svg" align="left"/>

# EasyEffects Preset Selector GNOME Extension

A GNOME Shell Extension to quickly show and load EasyEffects Presets from top panel

## Overview

[EasyEffects](https://github.com/wwmm/easyeffects) (formerly known as PulseEffects) is a GTK4 application to apply multiple filters and audio effects to your audio inputs (microphone) and outputs (speaker, headphone etc.). It lets users to download [community presets](https://github.com/wwmm/easyeffects/wiki/Community-presets) or create their own. Installed presets can be viewed and selected from EasyEffect GUI or using terminal commands.

This GNOME Extension lets users to quickly view and select the preset they want right from the GNOME Shell Status Bar without opening the EasyEffects App or typing commands to the terminal.

![Extension](./screenshots/screenshot.png)

## Installation

### Dependencies

This Extension depends on EasyEffects to function. It makes use of command-line options `easyeffects -p` and `easyeffects -l`.

~~Flatpak version is not supported for now.~~ Both Flatpak and non-flatpak versions of EasyEffects are supported.

It's tested mostly on GNOME version 41 but it uses rather stable modules and libraries. So it should work fine on older versions too.

### Install From GNOME Extensions Website

-   You can install the extension directy from [here](https://extensions.gnome.org/extension/4907/easyeffects-preset-selector/).
-   Alternatively go to [GNOME Extensions Website](https://extensions.gnome.org) and search for EasyEffects Preset Selector
-   To be able to install extensions from extensions website, you need to have:
    1. `chrome-gnome-shell` package (from your package manager) (regardless of what you use as browser firefox or chromium based this package works for all of them)
    2. GNOME Shell Integration add-on for your browser - [for chromium](https://chrome.google.com/webstore/detail/gnome-shell-integration/gphhapmejobijbbhgpjhcjognlahblep) , [for firefox](https://addons.mozilla.org/tr/firefox/addon/gnome-shell-integration/)

-   Note: Because of the review process, new versions on the GNOME Extensions Website may lag a few days behind sometimes.

### Manual Installation

-   Clone the repository:

```
git clone https://github.com/ulville/eepresetselector.git
```

-   Copy `eepresetselector@ulville.github.io` directory to `~/.local/share/gnome-shell/extensions/`

```
cp -r eepresetselector/eepresetselector@ulville.github.io ~/.local/share/gnome-shell/extensions/
```

-   Log out and login.
-   Enable the extension from GNOME Extensions app.

### Install Script

-   Clone the repository as stated above.
-   Run install script:

```
cd eepresetselector
```

```
chmod +x install.sh
```

```
./install.sh
```

### Install Presets

-   You can find all the information [here](https://github.com/wwmm/easyeffects/wiki/Community-presets)

## Language Support

The extension shows text as parsed from the output of EasyEffects' command-line interface so it already comes in the system language (If supported by EasyEffects).

![When system language set to Turkish](./screenshots/screenshot-turkish.png)
