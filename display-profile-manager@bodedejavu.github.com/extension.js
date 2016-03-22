/*
author: Paul Bodenbenner <paul.bodenbenner@gmail.com>
*/


const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Convenience = Me.imports.convenience;


let _displayProfileManager;

function init() {
    Convenience.initTranslations("display-profile-manager");
    }

function enable() {
    if (Main.panel.statusArea && Main.panel.statusArea.aggregateMenu) {
        const Newer = Me.imports.newer;
        _displayProfileManager = new Newer.DisplayProfileManager();
        let position = Main.panel.statusArea.aggregateMenu.menu.numMenuItems - 2;
        Main.panel.statusArea.aggregateMenu.menu.addMenuItem(_displayProfileManager, position);
        }
    else {
        const Older = Me.imports.older;
        _displayProfileManager = new Older.DisplayProfileManager();
        Main.panel.addToStatusArea('display-profile-manager', _displayProfileManager);
        }
    }

function disable() {
    _displayProfileManager.cleanup();
    _displayProfileManager.destroy();
    }

