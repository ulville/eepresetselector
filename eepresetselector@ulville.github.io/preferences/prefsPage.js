// Shamelessly stolen from:
// https://github.com/eonpatapon/gnome-shell-extension-caffeine/blob/master/caffeine%40patapon.info/preferences/generalPage.js

/* exported EEPSPrefsPage */


'use strict';

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import Gdk from 'gi://Gdk';

import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const genParam = (type, name, ...dflt) => GObject.ParamSpec[type](name, name, name, GObject.ParamFlags.READWRITE, ...dflt);

export var EEPSPrefsPage = GObject.registerClass(
    class EEPSPrefsPage extends Adw.PreferencesPage {
        _init(settings) {
            super._init();
            this._settings = settings;

            // Shortcut group
            // --------------
            let resetShortcutsButton = new Gtk.Button({
                icon_name: 'view-refresh-symbolic',
                valign: Gtk.Align.CENTER,
                css_classes: ['destructive-action'],
                hexpand: false,
                vexpand: false,
            });
            let shortcutGroup = new Adw.PreferencesGroup({
                title: _('Keyboard Shortcuts'),
                header_suffix: resetShortcutsButton,
            });

            // Cycle Output Presets Keyboard shortcut
            this.outputShortcutRow = new ShortcutRow(
                this._settings,
                'cycle-output-presets',
                _('Cycle Output Presets'),
                _('Keyboard shortcut to cycle through output presets')
            );
            // Cycle Input Presets Keyboard shortcut
            this.inputShortcutRow = new ShortcutRow(
                this._settings,
                'cycle-input-presets',
                _('Cycle Input Presets'),
                _('Keyboard shortcut to cycle through input presets')
            );

            // Hide/Show delete button
            if (!(this.outputShortcutRow.isAcceleratorChanged() || this.inputShortcutRow.isAcceleratorChanged()))
                resetShortcutsButton.visible = false;


            // Add elements
            shortcutGroup.add(this.outputShortcutRow);
            shortcutGroup.add(this.inputShortcutRow);
            this.add(shortcutGroup);


            // Bind signals
            // --------------
            resetShortcutsButton.connect('clicked', this._resetShortcuts.bind(this));
            this._settings.connect('changed::cycle-output-presets', () => {
                if (this.outputShortcutRow.isAcceleratorChanged() || this.inputShortcutRow.isAcceleratorChanged())
                    resetShortcutsButton.visible = true;
                else
                    resetShortcutsButton.visible = false;
            });
            this._settings.connect('changed::cycle-input-presets', () => {
                if (this.outputShortcutRow.isAcceleratorChanged() || this.inputShortcutRow.isAcceleratorChanged())
                    resetShortcutsButton.visible = true;
                else
                    resetShortcutsButton.visible = false;
            });
        }

        _resetShortcuts() {
            this.outputShortcutRow.resetAccelerator();
            this.inputShortcutRow.resetAccelerator();
        }
    });


/*
* Shortcut Widget
*/
const ShortcutRow = class extends Adw.ActionRow {
    static {
        GObject.registerClass({
            Properties: {
                shortcut: genParam('string', 'shortcut', ''),
            },
            Signals: {
                changed: {param_types: [GObject.TYPE_STRING]},
            },
        }, this);
    }

    constructor(settings, key, label, sublabel) {
        super({
            title: label,
            subtitle: sublabel,
            activatable: true,
        });

        this.shortcutBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            halign: Gtk.Align.CENTER,
            spacing: 5,
            hexpand: false,
            vexpand: false,
        });

        this._key = key;
        this._settings = settings;
        this._description = sublabel;

        this.add_suffix(this.shortcutBox);
        this.shortLabel = new Gtk.ShortcutLabel({
            disabled_text: _('New shortcut…'),
            valign: Gtk.Align.CENTER,
            hexpand: false,
            vexpand: false,
        });

        this.shortcutBox.append(this.shortLabel);

        // Bind signals
        this.connect('activated', this._onActivated.bind(this));
        this.bind_property('shortcut', this.shortLabel, 'accelerator', GObject.BindingFlags.DEFAULT);
        [this.shortcut] = this._settings.get_strv(this._key);

        this.add_suffix(this.shortcutBox);
    }

    isAcceleratorChanged() {
        if (this.shortLabel.get_accelerator() === this._settings.get_default_value(this._key).get_strv()[0])
            return false;
        else
            return true;
    }

    resetAccelerator() {
        [this.shortcut] = this._settings.get_default_value(this._key).get_strv();
        this._settings.reset(this._key);
    }

    _onActivated(widget) {
        let ctl = new Gtk.EventControllerKey();

        let content = new Adw.StatusPage({
            title: _('Enter new shortcut…'),
            description: _('Use Backspace to clear'),
            icon_name: 'preferences-desktop-keyboard-shortcuts-symbolic',
        });

        this._editor = new Adw.Window({
            modal: true,
            hide_on_close: true,
            transient_for: widget.get_root(),
            width_request: 480,
            height_request: 320,
            content,
        });

        this._editor.add_controller(ctl);
        ctl.connect('key-pressed', this._onKeyPressed.bind(this));
        this._editor.present();
    }

    _onKeyPressed(_widget, keyval, keycode, state) {
        let mask = state & Gtk.accelerator_get_default_mod_mask();
        mask &= ~Gdk.ModifierType.LOCK_MASK;

        if (!mask && keyval === Gdk.KEY_Escape) {
            this._editor.close();
            return Gdk.EVENT_STOP;
        }

        if (keyval === Gdk.KEY_BackSpace) {
            this.saveShortcut(); // Clear shortcut
            return Gdk.EVENT_STOP;
        }

        if (!this.isValidBinding(mask, keycode, keyval) || !this.isValidAccel(mask, keyval))
            return Gdk.EVENT_STOP;

        this.saveShortcut(keyval, keycode, mask);
        return Gdk.EVENT_STOP;
    }

    saveShortcut(keyval, keycode, mask) {
        if (!keyval && !keycode)
            this.shortcut = '';
        else
            this.shortcut = Gtk.accelerator_name_with_keycode(null, keyval, keycode, mask);


        this.emit('changed', this.shortcut);
        this._settings.set_strv(this._key, [this.shortcut]);
        this._editor.destroy();
    }

    // Functions from https://gitlab.gnome.org/GNOME/gnome-control-center/-/blob/main/panels/keyboard/keyboard-shortcuts.c

    keyvalIsForbidden(keyval) {
        return [
            // Navigation keys
            Gdk.KEY_Home,
            Gdk.KEY_Left,
            Gdk.KEY_Up,
            Gdk.KEY_Right,
            Gdk.KEY_Down,
            Gdk.KEY_Page_Up,
            Gdk.KEY_Page_Down,
            Gdk.KEY_End,
            Gdk.KEY_Tab,

            // Return
            Gdk.KEY_KP_Enter,
            Gdk.KEY_Return,

            Gdk.KEY_Mode_switch,
        ].includes(keyval);
    }

    isValidBinding(mask, keycode, keyval) {
        return !(mask === 0 || mask === Gdk.SHIFT_MASK && keycode !== 0 &&
                 ((keyval >= Gdk.KEY_a && keyval <= Gdk.KEY_z) ||
                     (keyval >= Gdk.KEY_A && keyval <= Gdk.KEY_Z) ||
                     (keyval >= Gdk.KEY_0 && keyval <= Gdk.KEY_9) ||
                     (keyval >= Gdk.KEY_kana_fullstop && keyval <= Gdk.KEY_semivoicedsound) ||
                     (keyval >= Gdk.KEY_Arabic_comma && keyval <= Gdk.KEY_Arabic_sukun) ||
                     (keyval >= Gdk.KEY_Serbian_dje && keyval <= Gdk.KEY_Cyrillic_HARDSIGN) ||
                     (keyval >= Gdk.KEY_Greek_ALPHAaccent && keyval <= Gdk.KEY_Greek_omega) ||
                     (keyval >= Gdk.KEY_hebrew_doublelowline && keyval <= Gdk.KEY_hebrew_taf) ||
                     (keyval >= Gdk.KEY_Thai_kokai && keyval <= Gdk.KEY_Thai_lekkao) ||
                     (keyval >= Gdk.KEY_Hangul_Kiyeog && keyval <= Gdk.KEY_Hangul_J_YeorinHieuh) ||
                     (keyval === Gdk.KEY_space && mask === 0) || this.keyvalIsForbidden(keyval))
        );
    }

    isValidAccel(mask, keyval) {
        return Gtk.accelerator_valid(keyval, mask) || (keyval === Gdk.KEY_Tab && mask !== 0);
    }
};
