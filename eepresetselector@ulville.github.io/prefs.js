'use strict';

const GETTEXT_DOMAIN = 'eepresetselector@ulville.github.io';

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const PrefsPage = Me.imports.preferences.prefsPage;

const _ = ExtensionUtils.gettext;

// eslint-disable-next-line jsdoc/require-jsdoc, no-unused-vars
function init() {
    ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
}

// eslint-disable-next-line jsdoc/require-jsdoc, no-unused-vars
function fillPreferencesWindow(window) {
    const settings = ExtensionUtils.getSettings();

    const prefsPage = new PrefsPage.EEPSPrefsPage(settings);

    window.add(prefsPage);

    // Make sure the window doesn't outlive the settings object
    window._settings = settings;
}
