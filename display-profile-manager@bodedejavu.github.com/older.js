/*
author: Paul Bodenbenner <paul.bodenbenner@gmail.com>
*/


const GLib = imports.gi.GLib;
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const GnomeDesktop = imports.gi.GnomeDesktop;
const Lang = imports.lang;
const Shell = imports.gi.Shell;

const Meta = imports.gi.Meta;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Parser = Me.imports.parser;
const Common = Me.imports.common;

const Gettext = imports.gettext.domain('display-profile-manager');
const _ = Gettext.gettext;


const XRandr2Iface = <interface name='org.gnome.SettingsDaemon.XRANDR_2'>
<method name='ApplyConfiguration'>
    <arg type='x' direction='in'/>
    <arg type='x' direction='in'/>
</method>
</interface>;
const XRandr2 = Gio.DBusProxy.makeProxyWrapper(XRandr2Iface);


const DisplayProfileManager = new Lang.Class({
    Name: 'DisplayProfileManager.DisplayProfileManager',
    Extends: PanelMenu.SystemStatusButton,
    
    _init: function() {
    	this.parent('preferences-desktop-display-symbolic', 'Display Profile Manager');
    	
        this._proxy = new XRandr2(Gio.DBus.session, 'org.gnome.SettingsDaemon', '/org/gnome/SettingsDaemon/XRANDR');
        
        try {
            this._screen = new GnomeDesktop.RRScreen({gdk_screen: Gdk.Screen.get_default()});
            this._screen.init(null);
            }
        catch(e) {
            this.actor.hide();
            return;
            }
            
        this._keybindings = new Array();
        
        this._settings = Convenience.getSettings();
        
       	this._getCurrentSettings();
        this._createMenu(false);
        
        this._handlerIdScreen = this._screen.connect('changed', Lang.bind(this, this._onMonitorsChanged));
        this._handlerIdSettings = this._settings.connect('changed::' + Common.SETTINGS_KEY_PROFILES, Lang.bind(this, this._onSettingsChanged));
        },
        
    cleanup: function() {
        this._clearSignals();
        this._clearKeybindings();
        },
        
    _clearSignals: function() {
        if (this._handlerIdScreen)
            this._screen.disconnect(this._handlerIdScreen);
        if (this._handlerIdSettings)
            this._settings.disconnect(this._handlerIdSettings);
        },
        
    _clearKeybindings: function() {
        let keybinding;
        while (this._keybindings.length > 0) {
            keybinding = this._keybindings.pop();
            if (Main.wm.removeKeybinding)
                Main.wm.removeKeybinding(keybinding);
            else
                global.display.remove_keybinding(keybinding);
            }
        },
        
    _getCurrentSettings: function() {
        let profilesString = this._settings.get_string(Common.SETTINGS_KEY_PROFILES);
        this._profiles = Parser.getProfilesFromString(profilesString);
        },
        
    _onSettingsChanged: function() {
        this._getCurrentSettings();
        this._createMenu(true);
        },
        
    _onMonitorsChanged: function() {
        this._createMenu(true);
        },
        
    _createMenu: function(withReset) {
        if (withReset == true) {
            this.menu.removeAll();
            this._clearKeybindings();
            }
            
        let config = GnomeDesktop.RRConfig.new_current(this._screen);
        let outputs = config.get_outputs();
        
        let profileCurrent = this._getCurrentProfile(config, outputs);
        let profileStringCurrent = Parser.getProfileAsString(profileCurrent);
       	this._settings.set_string(Common.SETTINGS_KEY_CURRENT_PROFILE, profileStringCurrent);
        
        this._insertProfileItems(config, outputs);
        this._insertSettingsItems();
        },
        
    _insertProfileItems: function(config, outputs) {
        let item;
        let profileCurrent = this._getCurrentProfile(config, outputs);
        
        if (this._profiles.length == 0) {
            item = new PopupMenu.PopupMenuItem(_("No Profiles Defined"));
            item.actor.reactive = false;
            this.menu.addMenuItem(item);
            }
        else {
            for (let i = 0; i < this._profiles.length; i++) {
                this._addProfileItem(config, outputs, i, this._profiles[i], profileCurrent);
                }
            }
        },
        
    _insertSettingsItems: function() {
        let showDisplaysSettings = this._settings.get_boolean(Common.SETTINGS_KEY_SHOW_DISPLAYS_SETTINGS);
        let showDisplayProfileManagerSettings = this._settings.get_boolean(Common.SETTINGS_KEY_SHOW_DISPLAY_PROFILE_MANAGER_SETTINGS);
        
        if (showDisplaysSettings == true || showDisplayProfileManagerSettings == true)
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        if (showDisplaysSettings == true) {
            this.menu.addSettingsAction(_("Displays Settings"), 'gnome-display-panel.desktop');
            }
        if (showDisplayProfileManagerSettings == true) {
            let item = new PopupMenu.PopupMenuItem(_("Display Profile Manager Settings"));
            item.connect('activate', function() {
                let app = Shell.AppSystem.get_default().lookup_app('gnome-shell-extension-prefs.desktop');
                if (app != null)
                    app.launch(global.display.get_current_time_roundtrip(), ['extension:///' + Me.uuid], -1, null);
                });
            this.menu.addMenuItem(item);
            }
        },
        
    _addProfileItem: function(config, outputs, profileNumber, profile, profileCurrent) {
        let item;
        
        item = new PopupMenu.PopupMenuItem((profileNumber+1).toString() + '. ' + profile[0]);
        if (this._checkProfilePossible(outputs, profile) == true) {
            if (Common._compareProfiles(profile, profileCurrent) == true)
                item.setShowDot(true);
                
            item.connect('activate', Lang.bind(this, this._setProfileFromMenuItem, config, outputs, profile));
            
            if (profileNumber < 9) {
                let keybinding;
                let keybinding_name;
                let keybinding_handler;
                
                keybinding_name = Common.SETTINGS_KEY_KEYBINDING_PROFILE + (profileNumber+1).toString();
                keybinding_handler = Lang.bind(this, this._setProfileFromKeybinding, config, outputs, profile);
                if (Main.wm.addKeybinding) {
                    keybinding = Main.wm.addKeybinding(keybinding_name, this._settings, Meta.KeyBindingFlags.NONE, Shell.KeyBindingMode.NORMAL | Shell.KeyBindingMode.MESSAGE_TRAY, keybinding_handler);
                    }
                else {
                    keybinding = global.display.add_keybinding(keybinding_name, this._settings, Meta.KeyBindingFlags.NONE, keybinding_handler);
                    }
                this._keybindings.push(keybinding_name);
                }
            }
        else {
            item.actor.reactive = false;
            }
        this.menu.addMenuItem(item);
        
        let showProfileDescription = this._settings.get_boolean(Common.SETTINGS_KEY_SHOW_PROFILE_DESCRIPTION);
        if (showProfileDescription == true) {
            let profileDescription;
            for (let i = 2; i < profile.length; i++) {
                profileDescription = '';
                profileDescription += '   ' + profile[i][1] + ' - ' + profile[i][4] + 'x' + profile[i][5] + '@' + profile[i][6] + 'Hz';
                if (profile[1] == true)
                    profileDescription += ' (Cloned)';
                item = new PopupMenu.PopupMenuItem(profileDescription);
                item.actor.reactive = false;
                this.menu.addMenuItem(item);
                }
            }
        },
        
    _setProfileFromMenuItem: function(item, event, config, outputs, profile) {
        this._setProfile(event.get_time(), config, outputs, profile);
        },
        
    _setProfileFromKeybinding: function(display, screen, dummy, keybinding, config, outputs, profile) {
        this._setProfile(global.display.get_current_time_roundtrip(), config, outputs, profile);
        },
        
    _setProfile: function(time, config, outputs, profile) {
        config.save();
        
        for (let i = 0; i < outputs.length; i++) {
            if (outputs[i].is_connected() == true && outputs[i].is_active() == true) {
                outputs[i].set_active(false);
                }
            }
        config.set_clone(profile[1]);
        for (let i = 2; i < profile.length; i++) {
            for (let j = 0; j < outputs.length; j++) {
                if (outputs[j].get_name() == profile[i][0]) {
                    outputs[j].set_geometry(profile[i][2], profile[i][3], profile[i][4], profile[i][5]);
                    outputs[j].set_refresh_rate(profile[i][6]);
                    outputs[j].set_rotation(profile[i][7]);
                    outputs[j].set_primary(profile[i][8]);
                    outputs[j].set_active(true);
                    break;
                    }
                }
            }
    	    
        try {
            config.save();
            this._proxy.ApplyConfigurationRemote(0, time);
            }
        catch (e) {
            global.log('Could not save screen configuration: ' + e);
            }
        },
        
    _checkProfilePossible: function(outputs, profile) {
        for (let i = 2; i < profile.length; i++) {
            let outputFound = false;
            for (let j = 0; j < outputs.length; j++) {
                if (outputs[j].get_name() == profile[i][0]) {
                    if (outputs[j].is_connected() == false || outputs[j].get_display_name() != profile[i][1])
                        return false;
                    outputFound = true;
                    break;
                    }
                }
            if (outputFound == false)
                return false;
            }
        return true;
        },
        
    _getCurrentProfile: function(config, outputs) {
        let profile = new Array();
        profile.push('Unnamed');
        profile.push(config.get_clone());
        
        for (let i = 0; i < outputs.length; i++) {
            if (outputs[i].is_connected() == true && outputs[i].is_active() == true) {
                let iOutput = new Array();
                
                let name = outputs[i].get_name();                   
		        let displayName = outputs[i].get_display_name();
		        let geometry = outputs[i].get_geometry();
		        let refreshRate = outputs[i].get_refresh_rate();
		        let rotation = outputs[i].get_rotation();
		        let primary = outputs[i].get_primary();
		        
		        iOutput.push(name);
		        iOutput.push(displayName);
		        iOutput.push(geometry[0]);
		        iOutput.push(geometry[1]);
		        iOutput.push(geometry[2]);
		        iOutput.push(geometry[3]);
		        iOutput.push(refreshRate);
		        iOutput.push(rotation);
		        iOutput.push(primary);
		        
               	profile.push(iOutput);
                }
            }
            
        let primaryFound = false;
        for (let i = 2; i < profile.length; i++) {
            if (profile[i][8] == true)
                primaryFound = true;
            }
        if (primaryFound == false)
            profile[2][8] = true;
            
        return profile;
        }
    });
    
