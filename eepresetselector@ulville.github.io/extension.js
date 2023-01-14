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

/* Copyright Ulvican Kahya aka ulville 2022 */

/* exported init */

const GETTEXT_DOMAIN = 'eepresetselector@ulville.github.io';

const { GObject, St, GLib, Gio, Shell, Clutter } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const _ = ExtensionUtils.gettext;
const Me = ExtensionUtils.getCurrentExtension();

let sourceId = null;

const EEPSIndicator = GObject.registerClass(
    class EEPSIndicator extends PanelMenu.Button {
        _init() {
            super._init(0.5, _('EasyEffects Preset Selector'));

            this.categoryNames = [' ', ' '];
            this.outputPresets = [' '];
            this.inputPresets = [' '];
            this.lastUsedInputPreset = ' ';
            this.lastUsedOutputPreset = ' ';
            this.lastPresetLoadTime = 0;

            this._icon = new St.Icon({ style_class: 'system-status-icon' });
            this._icon.gicon = Gio.icon_new_for_string(
                `${Me.path}/icons/eepresetselector-symbolic.svg`
            );
            this.add_child(this._icon);
            this.connect('button-press-event', () => {
                this._refreshMenu();
            });
            this._refreshMenu();
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
            } catch (error) {
                Main.notify(
                    _('An error occured while trying to load the preset'),
                    _(`Error:\n\n${error}`)
                );
                logError(error);
            }
        }

        _buildMenu(
            outputCategoryName,
            inputCategoryName,
            outputPresets,
            inputPresets,
            lastUsedOutputPreset,
            lastUsedInputPreset,
            command
        ) {
            // Clear Menu
            this.menu._getMenuItems().forEach(item => {
                item.destroy();
            });
            // Category Title: "Output Presets" (As how the command did output it)
            if (outputCategoryName) {
                let _outputTitle = new PopupMenu.PopupSeparatorMenuItem(
                    `${_(outputCategoryName)}:`
                );
                _outputTitle.add_style_class_name('preset-title-item');
                let _inputIcon = new St.Icon({
                    style_class: 'popup-menu-icon',
                    x_align: Clutter.ActorAlign.END,
                    icon_name: 'audio-speakers-symbolic',
                });
                _outputTitle.add_child(_inputIcon);
                this.menu.addMenuItem(_outputTitle);
            }
            // Create scrollable MenuSection for Output Presets
            let _outputScrollSection = new PopupMenu.PopupMenuSection();
            let _outputScrollView = new St.ScrollView({
                style_class: 'scroll-menu-section',
                overlay_scrollbars: true,
            });
            let _outputSection = new PopupMenu.PopupMenuSection();
            _outputScrollView.add_actor(_outputSection.actor);
            _outputScrollSection.actor.add_actor(_outputScrollView);

            // Add a menu item to menu for each output preset and connect it to easyeffects' load preset command
            outputPresets.forEach(element => {
                let _menuItem = new PopupMenu.PopupMenuItem(_(element));
                if (element === lastUsedOutputPreset)
                    _menuItem.setOrnament(PopupMenu.Ornament.DOT);

                _menuItem.connect('activate', () => {
                    this._loadPreset(element, command);
                    this.menu.toggle();
                });
                _outputSection.addMenuItem(_menuItem);
            });

            this.menu.addMenuItem(_outputScrollSection);

            // Category Title: "Input Presets" (As how the command did output it)
            if (inputCategoryName) {
                let _inputTitle = new PopupMenu.PopupSeparatorMenuItem(
                    `${_(inputCategoryName)}:`
                );
                _inputTitle.add_style_class_name('preset-title-item');
                let _inputIcon = new St.Icon({
                    style_class: 'popup-menu-icon',
                    x_align: Clutter.ActorAlign.END,
                    icon_name: 'audio-input-microphone-symbolic',
                });
                _inputTitle.add_child(_inputIcon);
                this.menu.addMenuItem(_inputTitle);
            }

            // Create scrollable PopupMenuSection for Input Presets
            let _inputScrollSection = new PopupMenu.PopupMenuSection();
            let _inputScrollView = new St.ScrollView({
                style_class: 'scroll-menu-section',
                overlay_scrollbars: true,
            });
            _inputScrollView.add_style_class_name('scroll-menu-section');
            let _inputSection = new PopupMenu.PopupMenuSection();
            _inputScrollView.add_actor(_inputSection.actor);
            _inputScrollSection.actor.add_actor(_inputScrollView);

            // Add a menu item to menu for each input preset and connect it to easyeffects' load preset command
            inputPresets.forEach(element => {
                let _menuItem = new PopupMenu.PopupMenuItem(_(element));
                if (element === lastUsedInputPreset)
                    _menuItem.setOrnament(PopupMenu.Ornament.DOT);

                _menuItem.connect('activate', () => {
                    this._loadPreset(element, command);
                    this.menu.toggle();
                });
                _inputSection.addMenuItem(_menuItem);
            });

            this.menu.addMenuItem(_inputScrollSection);
        }

        async _refreshMenu() {
            // Learn if EasyEffects is installed as a Flatpak
            let appSystem = Shell.AppSystem.get_default();
            let app = appSystem.lookup_app('com.github.wwmm.easyeffects.desktop');

            if (!app) {
                this.menu._getMenuItems().forEach(item => {
                    item.destroy();
                });
                Main.notify(
                    _("EasyEffects isn't available on the system"),
                    _('This extension depends on EasyEffects to function')
                );
                log(_("EasyEffects isn't available on the system"));
            } else {
                let info = app.get_app_info();
                let filename = info.get_filename();
                let command;
                let appType;
                if (filename.includes('flatpak')) {
                    appType = 'flatpak';
                    command = ['flatpak', 'run', 'com.github.wwmm.easyeffects'];
                } else {
                    command = ['easyeffects'];
                    appType = 'native';
                }

                // Build menu with last values
                this._buildMenu(
                    this.categoryNames[0],
                    this.categoryNames[1],
                    this.outputPresets,
                    this.inputPresets,
                    this.lastUsedOutputPreset,
                    this.lastUsedInputPreset,
                    command
                );

                // Try to get Last used presets
                let erMessage = 'An error occured while trying to get last presets';
                try {
                    let lastPresets;
                    if (appType === 'flatpak') {
                        // If Flatpak make sure to wait min 1sec before getting last presets
                        let timeDiff = new Date().getTime() - this.lastPresetLoadTime;
                        if (timeDiff < 1000) {
                            await new Promise(resolve => {
                                sourceId = GLib.timeout_add(
                                    GLib.PRIORITY_DEFAULT,
                                    1000 - timeDiff,
                                    () => {
                                        sourceId = null;
                                        resolve();
                                        return GLib.SOURCE_REMOVE;
                                    }
                                );
                            });
                        }
                        // Get last used presets
                        lastPresets = await this.getLastPresets(appType);
                        // Try 3 more times until getting correct data
                        for (let n = 0; n < 3; n++) {
                            if (
                                lastPresets[0].includes('**') ||
                                lastPresets[1].includes('**')
                            ) {
                                // eslint-disable-next-line no-await-in-loop
                                lastPresets = await this.getLastPresets(
                                    appType
                                );
                            } else {
                                break;
                            }
                        }
                    } else {
                        lastPresets = await this.getLastPresets(appType);
                    }
                    this.lastUsedOutputPreset = lastPresets[0];
                    this.lastUsedInputPreset = lastPresets[1];

                    this.categoryNames = [];
                    this.outputPresets = [];
                    this.inputPresets = [];
                    try {
                        let data = await this.execCommunicate(
                            command.concat(['-p'])
                        );

                        for (let n = 0; n < 3; n++) {
                            if (data.includes('**')) {
                                // eslint-disable-next-line no-await-in-loop
                                data = await this.execCommunicate(
                                    command.concat(['-p'])
                                );
                            } else {
                                break;
                            }
                        }

                        // Parse Data
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
                            if (
                                this.outputPresets[
                                    this.outputPresets.length - 1
                                ] === ''
                            )
                                this.outputPresets.pop();

                            this.inputPresets = presetsAsText[1]
                                .trim()
                                .split(',');
                            if (
                                this.inputPresets[
                                    this.inputPresets.length - 1
                                ] === ''
                            )
                                this.inputPresets.pop();
                        } catch (e) {
                            Main.notify(
                                _(
                                    'An error occured while trying to get available presets'
                                ),
                                _(`Error:\n${e}\n\nGot data:\n${data}`)
                            );
                            logError(e);
                            logError(new Error(data));
                        }

                        this._buildMenu(
                            this.categoryNames[0],
                            this.categoryNames[1],
                            this.outputPresets,
                            this.inputPresets,
                            this.lastUsedOutputPreset,
                            this.lastUsedInputPreset,
                            command
                        );
                    } finally {
                        erMessage =
                            'An error occured while trying to get available presets';
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

        async getLastPresets(appType) {
            let _lastUsedOutputPreset = '';
            let _lastUsedInputPreset = '';
            try {
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
                    let _odata = await this.execCommunicate(
                        command.concat(['last-used-output-preset'])
                    );
                    _lastUsedOutputPreset = _odata.trim().slice(1, -1);

                    let _idata = await this.execCommunicate(
                        command.concat(['last-used-input-preset'])
                    );
                    _lastUsedInputPreset = _idata.trim().slice(1, -1);
                } else if (appType === 'native') {
                    // Get last used presets
                    const settings = new Gio.Settings({
                        schema_id: 'com.github.wwmm.easyeffects',
                    });
                    _lastUsedOutputPreset = settings.get_string(
                        'last-used-output-preset'
                    );
                    _lastUsedInputPreset = settings.get_string(
                        'last-used-input-preset'
                    );
                }
                return Promise.resolve([_lastUsedOutputPreset, _lastUsedInputPreset]);
            } catch (error) {
                return Promise.reject(error);
            }
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
                                'Command ran succesfully but printed nothing'
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

class Extension {
    constructor(uuid) {
        this._uuid = uuid;

        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        this._indicator = new EEPSIndicator();
        Main.panel.addToStatusArea(this._uuid, this._indicator);
    }

    disable() {
        if (sourceId) {
            GLib.Source.remove(sourceId);
            sourceId = null;
        }
        this._indicator.destroy();
        this._indicator = null;
    }
}

// eslint-disable-next-line jsdoc/require-jsdoc
function init(meta) {
    return new Extension(meta.uuid);
}
