/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* Copyright Ulvican Kahya aka ulville 2022-2023 */

/* exported EEPSExtension */

import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Shell from 'gi://Shell';
import Clutter from 'gi://Clutter';
import Meta from 'gi://Meta';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

let sourceId = null;

const EEPSIndicator = GObject.registerClass(
    class EEPSIndicator extends PanelMenu.Button {
        _init(settings, path) {
            super._init(0.5, _('EasyEffects Preset Selector'));

            this.categoryNames = [' ', ' '];
            this.outputPresets = [' '];
            this.inputPresets = [' '];
            this.lastUsedInputPreset = ' ';
            this.lastUsedOutputPreset = ' ';
            this.lastPresetLoadTime = 0;
            this.enableBypass = false;
            this.command = [];
            this.settings = settings;
            this.appDesktopFile = 'com.github.wwmm.easyeffects.desktop';
            this.easyEffectsApp = Shell.AppSystem.get_default().lookup_app(this.appDesktopFile);

            Main.wm.addKeybinding(
                'cycle-output-presets',
                this.settings,
                Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
                Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW | Shell.ActionMode.POPUP,
                () => this._loadNext('output'));
            Main.wm.addKeybinding(
                'cycle-input-presets',
                this.settings,
                Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
                Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW | Shell.ActionMode.POPUP,
                () => this._loadNext('input'));
            Main.wm.addKeybinding(
                'toggle-global-bypass',
                this.settings,
                Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
                Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW | Shell.ActionMode.POPUP,
                () => this._toggleGlobalBypass());

            this._icon = new St.Icon({style_class: 'system-status-icon'});
            this._icon.gicon = Gio.icon_new_for_string(
                `${path}/icons/eepresetselector-symbolic.svg`
            );
            this.add_child(this._icon);
            this.connect('button-press-event', () => {
                this._refreshMenu();
            });
            this._refreshMenu();
        }

        async _toggleGlobalBypass() {
            await this._refreshMenu();
            this._enableGlobalBypass(!this.enableBypass);
            await this._refreshMenu();
            if (!this.menu.isOpen)
                this.menu.toggle();
        }

        _loadNext(presetType) {
            let nextPreset;
            if (presetType === 'output') {
                const index = this.outputPresets.indexOf(this.lastUsedOutputPreset);
                const nextIndex = index === this.outputPresets.length - 1 ? 0 : index + 1;
                nextPreset = this.outputPresets[nextIndex];
            } else if (presetType === 'input') {
                const index = this.inputPresets.indexOf(this.lastUsedInputPreset);
                const nextIndex = index === this.inputPresets.length - 1 ? 0 : index + 1;
                nextPreset = this.inputPresets[nextIndex];
            }

            if (!(nextPreset === undefined))
                this._loadPreset(nextPreset, this.command);

            if (!this.menu.isOpen)
                this.menu.toggle();
        }

        _loadPreset(preset, commandArr) {
            let argument = preset.replaceAll(' ', '\\ ').replaceAll("'", "\\'");
            let commandStr = `${commandArr.concat(['-l']).join(' ')} `;

            try {
                GLib.spawn_command_line_async(commandStr + argument);
                this.lastPresetLoadTime = new Date().getTime();

                if (this.outputPresets.includes(preset))
                    this.lastUsedOutputPreset = preset;

                if (this.inputPresets.includes(preset))
                    this.lastUsedInputPreset = preset;
                this._buildMenu(this.categoryNames[0], this.categoryNames[1], commandArr);
            } catch (error) {
                Main.notify(
                    _('An error occurred while trying to load the preset'),
                    _(`Error:\n\n${error}`)
                );
                logError(error);
            }
        }

        _enableGlobalBypass(state) {
            this.enableBypass = state;
            const bypassOption = state ? '1' : '2';
            const command = this.command.concat(['-b', bypassOption]).join(' ');
            try {
                GLib.spawn_command_line_async(command);
            } catch (error) {
                Main.notify(
                    _('An error occurred while trying to toggle bypass'),
                    _(`Error:\n\n${error}`)
                );
                logError(error);
            }
        }

        _addCategoryTitle(categoryName, categoryIconName) {
            let _title = new PopupMenu.PopupSeparatorMenuItem(
                `${_(categoryName)}:`
            );
            _title.add_style_class_name('preset-title-item');
            let _icon = new St.Icon({
                style_class: 'popup-menu-icon',
                x_align: Clutter.ActorAlign.END,
                icon_name: categoryIconName,
            });
            _title.add_child(_icon);
            this.menu.addMenuItem(_title);
        }

        _addScrollMenuSection(scrollView, menuSection, presets, lastUsedPreset, command) {
            let _scrollSection = new PopupMenu.PopupMenuSection();
            scrollView.set_overlay_scrollbars(false);
            try {
                scrollView.add_actor(menuSection.actor);
                _scrollSection.actor.add_actor(scrollView);
            } catch (e) {
                scrollView.add_child(menuSection.actor);
                _scrollSection.actor.add_child(scrollView);
            }

            // Add a menu item to menu for each preset and connect it to easyeffects' load preset command
            presets.forEach(element => {
                let _menuItem = new PopupMenu.PopupMenuItem(_(element));
                if (element === lastUsedPreset)
                    _menuItem.setOrnament(PopupMenu.Ornament.DOT);
                else
                    _menuItem.setOrnament(PopupMenu.Ornament.NO_DOT);

                _menuItem.connect('activate', () => {
                    this._loadPreset(element, command);
                    this.menu.toggle();
                });
                menuSection.addMenuItem(_menuItem);
            });

            this.menu.addMenuItem(_scrollSection);
        }

        _buildMenu(outputCategoryName, inputCategoryName, command) {
            // Clear Menu
            this.menu._getMenuItems().forEach(item => {
                item.destroy();
            });

            // Category Title: "Output Presets" (As how the command did output it)
            if (outputCategoryName)
                this._addCategoryTitle(outputCategoryName, 'audio-speakers-symbolic');

            // Create scrollable MenuSection for Output Presets
            let _outputScrollView = new St.ScrollView();
            let _outputSection = new PopupMenu.PopupMenuSection();
            this._addScrollMenuSection(_outputScrollView, _outputSection, this.outputPresets, this.lastUsedOutputPreset, command);

            // Category Title: "Input Presets" (As how the command did output it)
            if (inputCategoryName)
                this._addCategoryTitle(inputCategoryName, 'audio-input-microphone-symbolic');

            // Create scrollable PopupMenuSection for Input Presets
            let _inputScrollView = new St.ScrollView();
            let _inputSection = new PopupMenu.PopupMenuSection();
            this._addScrollMenuSection(_inputScrollView, _inputSection, this.inputPresets, this.lastUsedInputPreset, command);

            // Separator
            let _separatorItem = new PopupMenu.PopupSeparatorMenuItem();
            this.menu.addMenuItem(_separatorItem);

            // Add switch menu item to toggle global bypass
            const toggleBypassItem = new PopupMenu.PopupSwitchMenuItem(_('Global Bypass'), this.enableBypass, {});
            toggleBypassItem.setOrnament(PopupMenu.Ornament.NONE);
            toggleBypassItem.add_style_class_name('bypass-toggle-item');
            toggleBypassItem.connect('toggled', (item, state) => {
                this._enableGlobalBypass(state);
            });
            this.menu.addMenuItem(toggleBypassItem);

            // Add a menu item to activate (open) the Easy Effects application
            let _easyEffectsActivatorItem = new PopupMenu.PopupMenuItem(
                _('Launch %s').format(this.easyEffectsApp.get_name())
            );
            _easyEffectsActivatorItem.setOrnament(PopupMenu.Ornament.NONE);
            _easyEffectsActivatorItem.add_style_class_name('easyeffects-activator-item');
            _easyEffectsActivatorItem.connect('activate', () => {
                Main.overview.hide();
                this.easyEffectsApp.activate();
            });
            this.menu.addMenuItem(_easyEffectsActivatorItem);

            // Arrange scrollbar policies
            let _menuThemeNode = this.menu.actor.get_theme_node();
            let _maxHeight = _menuThemeNode.get_max_height();
            let [, _titleNaturH] = this.menu.firstMenuItem.actor.get_preferred_height(-1);
            let [, _outputNaturH] = _outputSection.actor.get_preferred_height(-1);
            let [, _inputNaturH] = _inputSection.actor.get_preferred_height(-1);
            let [, _sepNaturH] = _separatorItem.actor.get_preferred_height(-1);
            let [, _toggleBypassNaturH] = toggleBypassItem.actor.get_preferred_height(-1);
            let [, _eeActNaturH] = _easyEffectsActivatorItem.actor.get_preferred_height(-1);

            let _notFillsScreen = _maxHeight >= 0 && _inputNaturH + _outputNaturH + 2 * _titleNaturH <= _maxHeight - _eeActNaturH - _sepNaturH - _toggleBypassNaturH;
            if (_notFillsScreen) {
                _inputScrollView.vscrollbar_policy = St.PolicyType.NEVER;
                _outputScrollView.vscrollbar_policy = St.PolicyType.NEVER;
            } else {
                let _outputNeedsScrollbar = _maxHeight >= 0 && _outputNaturH + _titleNaturH >= (_maxHeight - _eeActNaturH - _sepNaturH - _toggleBypassNaturH) / 2;
                _outputScrollView.vscrollbar_policy = _outputNeedsScrollbar ? St.PolicyType.AUTOMATIC : St.PolicyType.NEVER;

                let _inputNeedsScrollbar = _maxHeight >= 0 && _inputNaturH + _titleNaturH >= (_maxHeight - _eeActNaturH - _sepNaturH - _toggleBypassNaturH) / 2;
                _inputScrollView.vscrollbar_policy = _inputNeedsScrollbar ? St.PolicyType.AUTOMATIC : St.PolicyType.NEVER;
            }
        }

        async _refreshMenu() {
            // Learn if EasyEffects is installed as a Flatpak
            let appSystem = Shell.AppSystem.get_default();
            this.easyEffectsApp = appSystem.lookup_app(this.appDesktopFile);

            if (!this.easyEffectsApp) {
                this.menu._getMenuItems().forEach(item => {
                    item.destroy();
                });
                Main.notify(
                    _("EasyEffects isn't available on the system"),
                    _('This extension depends on EasyEffects to function')
                );
                log(_("EasyEffects isn't available on the system"));
            } else {
                let info = this.easyEffectsApp.get_app_info();
                let filename = info.get_filename();
                let appType;
                if (filename.includes('flatpak')) {
                    appType = 'flatpak';
                    this.command = ['flatpak', 'run', 'com.github.wwmm.easyeffects'];
                } else {
                    this.command = ['easyeffects'];
                    appType = 'native';
                }

                // Get Easy Effects App Version
                const appVersionString = await this.execCommunicate(this.command.concat(['-v']));
                const appVersionArray = appVersionString.split(' ');
                const appVersion = appVersionArray[appVersionArray.length - 1];
                const [majorVer, unusedMinorVer, unusedBuildVer] = appVersion.split('.', 3);
                const easyEffectsIsQT = Number(majorVer) >= 8;

                // Build menu with last values
                this._buildMenu(this.categoryNames[0], this.categoryNames[1], this.command);

                // Get global bypass
                try {
                    if (easyEffectsIsQT) {
                        // TODO: -b 3 doesn't work. Try local server method
                        // /run/user/1000/.flatpak/com.github.wwmm.easyeffects/tmp/EasyEffectsServer
                        // https://github.com/wwmm/easyeffects/issues/4402
                        // For now just remember the value this extension set.
                    } else {
                        const bypassResponse = await this.execCommunicate(this.command.concat(['-b', '3']));
                        this.enableBypass = bypassResponse.trim() === '1';
                    }
                } catch (err) {
                    Main.notify(_('An error occurred while trying to get global bypass'), _(`Error:\n\n${err}`));
                    logError(err);
                }

                // Try to get Last used presets
                let erMessage = 'An error occurred while trying to get last presets';
                try {
                    let lastPresets;
                    if (appType === 'flatpak') {
                        // If Flatpak make sure to wait min 1sec before getting last presets
                        const waitTimeMs = easyEffectsIsQT ? 35000 : 1000;
                        let timeDiff = new Date().getTime() - this.lastPresetLoadTime;
                        if (timeDiff < waitTimeMs) {
                            await new Promise(resolve => {
                                sourceId = GLib.timeout_add(
                                    GLib.PRIORITY_DEFAULT,
                                    waitTimeMs - timeDiff,
                                    () => {
                                        sourceId = null;
                                        resolve();
                                        return GLib.SOURCE_REMOVE;
                                    }
                                );
                            });
                        }
                        // Get last used presets
                        lastPresets = await this.getLastPresets(appType, easyEffectsIsQT);
                        // Try 3 more times until getting correct data
                        for (let n = 0; n < 3; n++) {
                            if (
                                lastPresets[0].includes('**') ||
                                lastPresets[1].includes('**')
                            ) {
                                // eslint-disable-next-line no-await-in-loop
                                lastPresets = await this.getLastPresets(
                                    appType, easyEffectsIsQT
                                );
                            } else {
                                break;
                            }
                        }
                    } else {
                        lastPresets = await this.getLastPresets(appType, easyEffectsIsQT);
                    }
                    this.lastUsedOutputPreset = lastPresets[0];
                    this.lastUsedInputPreset = lastPresets[1];

                    this.categoryNames = [];
                    this.outputPresets = [];
                    this.inputPresets = [];
                    try {
                        let data = await this.execCommunicate(
                            this.command.concat(['-p'])
                        );

                        for (let n = 0; n < 3; n++) {
                            if (data.includes('**')) {
                                // eslint-disable-next-line no-await-in-loop
                                data = await this.execCommunicate(
                                    this.command.concat(['-p'])
                                );
                            } else {
                                break;
                            }
                        }

                        // Parse Data
                        if (easyEffectsIsQT) {
                            let lines = data.split('\n');
                            this.categoryNames.push(lines.shift().split(':')[0]);
                            while (!(lines[0] === '')) {
                                let splittedElement = lines.shift().split('\t');
                                this.outputPresets.push(splittedElement[splittedElement.length - 1].trim());
                            }

                            while (lines[0] === '')
                                lines.shift();

                            while (lines[lines.length - 1] === '')
                                lines.pop();

                            this.categoryNames.push(lines.shift().split(':')[0]);

                            while (lines.length > 0) {
                                let splittedElement = lines.shift().split('\t');
                                this.inputPresets.push(splittedElement[splittedElement.length - 1].trim());
                            }
                            // this.categoryNames.push(lines.splice(lines.indexOf(''), 2)[1]);
                        } else {
                            let presetCategories = data.split('\n');
                            if (
                                presetCategories[presetCategories.length - 1] === ''
                            )
                                presetCategories.pop();

                            while (presetCategories.length > 2)
                                presetCategories.shift();

                            let presetsAsText = [];
                            presetCategories.forEach(element => {
                                let splittedElement = element.split(':');
                                this.categoryNames.push(splittedElement[0]);
                                presetsAsText.push(splittedElement[1]);
                            });
                            try {
                                this.outputPresets = presetsAsText[0]
                                    .trim()
                                    .split(',');

                                this.inputPresets = presetsAsText[1]
                                    .trim()
                                    .split(',');
                            } catch (e) {
                                Main.notify(
                                    _(
                                        'An error occurred while trying to get available presets'
                                    ),
                                    _(`Error:\n${e}\n\nGot data:\n${data}`)
                                );
                                logError(e);
                                logError(new Error(data));
                            }
                        }

                        while (this.outputPresets[this.outputPresets.length - 1] === '')
                            this.outputPresets.pop();
                        this.outputPresets.sort();

                        while (this.inputPresets[this.inputPresets.length - 1] === '')
                            this.inputPresets.pop();
                        this.inputPresets.sort();

                        this._buildMenu(this.categoryNames[0], this.categoryNames[1], this.command);
                    } finally {
                        erMessage =
                            'An error occurred while trying to get available presets';
                    }
                } catch (e) {
                    if (sourceId) {
                        GLib.Source.remove(sourceId);
                        sourceId = null;
                    }
                    Main.notify(_(erMessage), _(`Error:\n\n${e}`));
                    logError(e);
                }
            }
        }

        async getLastPresets(appType, easyEffectsIsQT) {
            let _lastUsedOutputPreset = '';
            let _lastUsedInputPreset = '';


            try {
                if (!easyEffectsIsQT) {
                    let lastInputKeyName;
                    let lastOutputKeyName;
                    [lastInputKeyName, lastOutputKeyName] = await this.getLastIOGSettingsKeyNames(appType);
                    if (appType === 'flatpak') {
                    // Get last used preset from the flatpak's sandbox
                        let command = [
                            'flatpak',
                            'run',
                            '--command=/usr/bin/gsettings', // command we want to run instead of easyeffects
                            'com.github.wwmm.easyeffects', // inside easyeffects' flatpak sandbox
                            'get', // argument 1
                            'com.github.wwmm.easyeffects', // argument 2
                        ];
                        const _odata = await this.execCommunicate(command.concat([lastOutputKeyName]));
                        _lastUsedOutputPreset = _odata.trim().slice(1, -1);

                        const _idata = await this.execCommunicate(command.concat([lastInputKeyName]));
                        _lastUsedInputPreset = _idata.trim().slice(1, -1);
                    } else if (appType === 'native') {
                    // Get last used presets
                        const settings = new Gio.Settings({
                            schema_id: 'com.github.wwmm.easyeffects',
                        });
                        _lastUsedOutputPreset = settings.get_string(lastOutputKeyName);
                        _lastUsedInputPreset = settings.get_string(lastInputKeyName);
                    }
                } else {
                    // New method: use command --active-preset option
                    const opt = '--active-preset';

                    const _odata = await this.execCommunicate(this.command.concat([opt, 'output']));
                    _lastUsedOutputPreset = _odata.trim();

                    const _idata = await this.execCommunicate(this.command.concat([opt, 'input']));
                    _lastUsedInputPreset = _idata.trim();
                }

                return Promise.resolve([_lastUsedOutputPreset, _lastUsedInputPreset]);
            } catch (error) {
                return Promise.reject(error);
            }
        }

        async getLastIOGSettingsKeyNames(appType) {
            let lastInputKeyName = 'last-loaded-input-preset';
            let lastOutputKeyName = 'last-loaded-output-preset';
            try {
                // Check if schema keys are valid
                // Get a list of all keys
                let keys = [];
                let lastInputKeyNameFallback = 'last-used-input-preset';
                let lastOutputKeyNameFallback = 'last-used-output-preset';
                if (appType === 'flatpak') {
                    const listKeysCommand = [
                        'flatpak',
                        'run',
                        '--command=/usr/bin/gsettings', // command we want to run instead of easyeffects
                        'com.github.wwmm.easyeffects', // inside easyeffects' flatpak sandbox
                        'list-keys', // argument 1
                        'com.github.wwmm.easyeffects', // argument 2
                    ];
                    const listKeyResponse = await this.execCommunicate(listKeysCommand);
                    // String (values are separated by new line)
                    keys = listKeyResponse.trim().split('\n');
                } else if (appType === 'native') {
                    const settings = new Gio.Settings({
                        schema_id: 'com.github.wwmm.easyeffects',
                    });
                    keys = settings.settings_schema.list_keys();
                }
                // If key names are invalid, try fallback
                if (!(keys.includes(lastInputKeyName) && keys.includes(lastOutputKeyName))) {
                    if (keys.includes(lastInputKeyNameFallback) && keys.includes(lastOutputKeyNameFallback)) {
                        lastInputKeyName = lastInputKeyNameFallback;
                        lastOutputKeyName = lastOutputKeyNameFallback;
                    } else {
                        return Promise.reject(new Error("Couldn't find the GSettings schema key for easyeffects last used presets."));
                    }
                }
            } catch (err) {
                return Promise.reject(err);
            }
            return Promise.resolve([lastInputKeyName, lastOutputKeyName]);
        }

        // eslint-disable-next-line require-await
        async execCommunicate(argv, input = null, cancellable = null) {
            let cancelId = 0;
            let flags =
                Gio.SubprocessFlags.STDOUT_PIPE |
                Gio.SubprocessFlags.STDERR_PIPE;

            if (input !== null)
                flags |= Gio.SubprocessFlags.STDIN_PIPE;

            let proc = new Gio.Subprocess({
                argv,
                flags,
            });
            try {
                proc.init(cancellable);
            } catch (e) {
                return new Promise((resolve, reject) => {
                    reject(e);
                    if (cancelId > 0)
                        cancellable.disconnect(cancelId);
                });
            }

            if (cancellable instanceof Gio.Cancellable)
                cancelId = cancellable.connect(() => proc.force_exit());


            return new Promise((resolve, reject) => {
                proc.communicate_utf8_async(input, null, (_proc, res) => {
                    try {
                        let [, stdout, stderr] =
                            _proc.communicate_utf8_finish(res);
                        let status = _proc.get_exit_status();

                        if (status !== 0) {
                            reject(stderr);
                            throw new Gio.IOErrorEnum({
                                code: Gio.io_error_from_errno(status),
                                message: stderr
                                    ? stderr.trim()
                                    : GLib.strerror(status),
                            });
                        }
                        // Command gives output as stderr on some versions of EasyEffects for some reason...
                        // Looks like it's fixed on never versions. This if-else is for compatibility
                        // Flatpak version 6.2.3 prints some messages to stdout but data we want is in stderr
                        if (stdout && !stderr) {
                            // If there is only stdout but no stderr (for version >= v6.2.4, flatpak or non-flatpak)
                            resolve(stdout);
                        } else if (!stdout && !stderr) {
                            // If there is no stderr and no stdout : there is a problem
                            let customErr = new Error(
                                'Command ran successfully but printed nothing'
                            );
                            reject(customErr);
                        } else {
                            // If there is both stderr and stdout (for flatpak vers. < v6.2.4)
                            // Or there is no stdout but only stderr (for non-flatpak vers. < v6.2.4)
                            resolve(stderr);
                        }
                    } catch (e) {
                        reject(e);
                    } finally {
                        if (cancelId > 0)
                            cancellable.disconnect(cancelId);
                    }
                });
            });
        }
    }
);

export default class EEPSExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._indicator = new EEPSIndicator(this._settings, this.path);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        if (sourceId) {
            GLib.Source.remove(sourceId);
            sourceId = null;
        }
        Main.wm.removeKeybinding('cycle-output-presets');
        Main.wm.removeKeybinding('cycle-input-presets');
        Main.wm.removeKeybinding('toggle-global-bypass');
        this._indicator.destroy();
        this._indicator = null;
        this._settings = null;
    }
}
