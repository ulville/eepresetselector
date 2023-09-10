/* exported EEPSPreferences */

'use strict';

import * as PrefsPage from './preferences/prefsPage.js';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class EEPSPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const prefsPage = new PrefsPage.EEPSPrefsPage(settings);

        window.add(prefsPage);
        window._settings = settings;
    }
}
