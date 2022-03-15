# EasyEffects Preset Selector GNOME Extension

## Overview

[EasyEffects](https://github.com/wwmm/easyeffects) (formerly known as PulseEffects) is a GTK4 application to apply multiple filters and audio effects to your audio inputs (microphone) and outputs (speaker, headphone etc.). It lets users to download [community presets](https://github.com/wwmm/easyeffects/wiki/Community-presets) or create their own. Installed presets can be viewed and selected from EasyEffect GUI or using terminal commands.

This GNOME Extension lets users to quickly view and select the preset they want right from the GNOME Shell Status Bar without opening the EasyEffects App or typing commands to the terminal.

![Extension](./screenshots/screenshot.png)

## Dependencies

This Extension depends on EasyEffects to function. It makes use of command-line options `easyeffects -p` and `easyeffects -l`.

**Flatpak version is not supported** for now. Even though it still has those command-line options as `flatpak run com.github.wwmm.easyeffects -p` and `flatpak run com.github.wwmm.easyeffects -l` they don't seem to be working correctly. So if available, install from your distribution's package manager or build from source.

It's tested mostly on GNOME version 41 but it uses rather stable modules and libraries. So it should work fine on older versions too.

## Language Support

The extension shows text as parsed from the output of EasyEffects' command-line interface so it already comes in the system language (If supported by EasyEffects).

![When system language set to Turkish](./screenshots/screenshot-turkish.png)
