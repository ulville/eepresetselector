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

const GETTEXT_DOMAIN = "eepresetselector@ulville.github.io";

const { GObject, St, GLib, Gio } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const ByteArray = imports.byteArray;

const _ = ExtensionUtils.gettext;
const Me = ExtensionUtils.getCurrentExtension();

const EEPSIndicator = GObject.registerClass(
    class EEPSIndicator extends PanelMenu.Button {
        _init() {
            super._init(0.0, _("EasyEffects Preset Selector"));

            this.categoryNames, this.outputPresets, this.inputPresets;

            this._icon = new St.Icon({ style_class: "system-status-icon" });
            this._icon.gicon = Gio.icon_new_for_string(
                `${Me.path}/icons/easyeffects.svg`
            );
            this.add_child(this._icon);
            this.connect("button-press-event", () => {
                this._refreshMenu();
            });
            this._refreshMenu();
        }

        _loadPreset(preset) {
            try {
                GLib.spawn_command_line_async("easyeffects -l " + preset);
            } catch (error) {
                log(
                    "eepresetselector@ulville.github.io : easyeffects unavailable"
                );
                Main.notify(
                    _("EasyEffects command-line options not available"),
                    _(
                        'Make sure it\'s installed correctly. Run "easyeffects -p" to check'
                    )
                );
            }
        }

        _refreshMenu() {
            this.execCommunicate(["easyeffects", "-p"])
                .then((data) => {
                    // Clear Menu
                    this.menu._getMenuItems().forEach((item) => {
                        item.destroy();
                    });
                    this.categoryNames = [];
                    this.outputPresets = [];
                    this.inputPresets = [];
                    // Parse Data
                    let presetCategories = data.split("\n");
                    presetCategories.pop();
                    let presetsAsText = [];
                    presetCategories.forEach((element) => {
                        let splittedElement = element.split(":");
                        this.categoryNames.push(splittedElement[0]);
                        presetsAsText.push(splittedElement[1]);
                    });

                    this.outputPresets = presetsAsText[0].trim().split(",");
                    if (
                        this.outputPresets[this.outputPresets.length - 1] === ""
                    ) {
                        this.outputPresets.pop();
                    }
                    this.inputPresets = presetsAsText[1].trim().split(",");
                    if (
                        this.inputPresets[this.inputPresets.length - 1] === ""
                    ) {
                        this.inputPresets.pop();
                    }

                    // Category Title: "Output Presets" (As how the command did output it)
                    if (this.categoryNames[0]) {
                        let _outputTitle = new PopupMenu.PopupMenuItem(
                            _(this.categoryNames[0]) + ":"
                        );
                        _outputTitle.style_class = "preset-title-item";
                        _outputTitle.connect("activate", () => {
                            this._refreshMenu();
                        });
                        this.menu.addMenuItem(_outputTitle);
                    }

                    // Add a menu item to menu for each output preset and connect it to easyeffects' load preset command
                    this.outputPresets.forEach((element) => {
                        let _menuItem = new PopupMenu.PopupMenuItem(_(element));
                        let argument = element.replace(" ", "\\ ");
                        _menuItem.connect("activate", () => {
                            this._loadPreset(argument);
                        });
                        this.menu.addMenuItem(_menuItem);
                    });

                    this.menu.addMenuItem(
                        new PopupMenu.PopupSeparatorMenuItem()
                    );

                    // Category Title: "Input Presets" (As how the command did output it)
                    if (this.categoryNames[1]) {
                        let _inputTitle = new PopupMenu.PopupMenuItem(
                            _(this.categoryNames[1]) + ":"
                        );
                        _inputTitle.style_class = "preset-title-item";
                        _inputTitle.connect("activate", () => {
                            this._refreshMenu();
                        });
                        this.menu.addMenuItem(_inputTitle);
                    }

                    // Add a menu item to menu for each input preset and connect it to easyeffects' load preset command
                    this.inputPresets.forEach((element) => {
                        let _menuItem = new PopupMenu.PopupMenuItem(_(element));
                        let argument = element.replace(" ", "\\ ");
                        _menuItem.connect("activate", () => {
                            this._loadPreset(argument);
                        });
                        this.menu.addMenuItem(_menuItem);
                    });
                })
                .catch((data) => {
                    logError(data);
                    logError(
                        "eepresetselector@ulville.github.io : easyeffects unavailable"
                    );
                    Main.notify(
                        _("EasyEffects command-line options not available"),
                        _(
                            'Make sure it\'s installed correctly. Run "easyeffects -p" to check'
                        )
                    );
                });
        }

        async execCommunicate(argv, input = null, cancellable = null) {
            let cancelId = 0;
            let flags =
                Gio.SubprocessFlags.STDOUT_PIPE |
                Gio.SubprocessFlags.STDERR_PIPE;

            if (input !== null) flags |= Gio.SubprocessFlags.STDIN_PIPE;

            let proc = new Gio.Subprocess({
                argv: argv,
                flags: flags,
            });
            proc.init(cancellable);

            if (cancellable instanceof Gio.Cancellable) {
                cancelId = cancellable.connect(() => proc.force_exit());
            }

            return new Promise((resolve, reject) => {
                proc.communicate_utf8_async(input, null, (proc, res) => {
                    try {
                        let [, , stderr] = proc.communicate_utf8_finish(res);
                        let status = proc.get_exit_status();

                        if (status !== 0) {
                            throw new Gio.IOErrorEnum({
                                code: Gio.io_error_from_errno(status),
                                message: stderr
                                    ? stderr.trim()
                                    : GLib.strerror(status),
                            });
                        }

                        resolve(stderr);
                    } catch (e) {
                        reject(e);
                    } finally {
                        if (cancelId > 0) {
                            cancellable.disconnect(cancelId);
                        }
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
        this._indicator.destroy();
        this._indicator = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
