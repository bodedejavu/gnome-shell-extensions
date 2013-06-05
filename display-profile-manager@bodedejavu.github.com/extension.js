/*
author: Paul Bodenbenner <paul.bodenbenner@gmail.com>
*/


const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const GnomeDesktop = imports.gi.GnomeDesktop;
const Lang = imports.lang;
const Shell = imports.gi.Shell;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Parser = Me.imports.parser;

const XRandr2Iface = <interface name='org.gnome.SettingsDaemon.XRANDR_2'>
<method name='ApplyConfiguration'>
    <arg type='x' direction='in'/>
    <arg type='x' direction='in'/>
</method>
</interface>;

const XRandr2 = Gio.DBusProxy.makeProxyWrapper(XRandr2Iface);


const SETTINGS_KEY_PROFILES = 'profiles';
const SETTINGS_KEY_CURRENT_PROFILE = 'current-profile';
const SETTINGS_KEY_EXPERT_MODE = 'expert-mode';


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
            
        this._settings = Convenience.getSettings();
        
       	this._getCurrentSettings();
        this._createMenu(false);
        
        this._screen.connect('changed', Lang.bind(this, this._randrEvent));
        this._settings.connect('changed::' + SETTINGS_KEY_PROFILES, Lang.bind(this, this._onSettingsChanged));
        },
        
    _getCurrentSettings: function() {
        let profilesString = this._settings.get_string(SETTINGS_KEY_PROFILES);
        this._profiles = Parser.getProfilesFromString(profilesString);
        },
        
    _onSettingsChanged: function() {
        this._getCurrentSettings();
        this._createMenu(true);
        },
        
    _randrEvent: function() {
        this._createMenu(true);
        },
        
    _createMenu: function(withReset) {
        let item;
        if (withReset == true)
            this.menu.removeAll();
            
        let config = GnomeDesktop.RRConfig.new_current(this._screen);
        let outputs = config.get_outputs();
        
        let profileCurrent = this._getCurrentProfile(config, outputs);
        let profileStringCurrent = Parser.getProfileAsString(profileCurrent);
       	this._settings.set_string(SETTINGS_KEY_CURRENT_PROFILE, profileStringCurrent);
        
        if (this._profiles.length == 0) {
            item = new PopupMenu.PopupMenuItem('No Profiles defined');
            item.actor.reactive = false;
            this.menu.addMenuItem(item);
            }
        else {
            for (let i = 0; i < this._profiles.length; i++) {
                this._addProfileItem(config, outputs, this._profiles[i], profileCurrent);
                }
            }
            
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
	    
        this.menu.addSettingsAction('Displays Settings', 'gnome-display-panel.desktop');
	    
        item = new PopupMenu.PopupMenuItem('Display Profile Manager Settings');
        item.connect('activate', function() {
            let app = Shell.AppSystem.get_default().lookup_app('gnome-shell-extension-prefs.desktop');
            if (app != null)
                app.launch(global.display.get_current_time_roundtrip(), ['extension:///' + Me.uuid], -1, null);
            });
        this.menu.addMenuItem(item);
        },
        
    _addProfileItem: function(config, outputs, profile, profileCurrent) {
        let item;
        
        item = new PopupMenu.PopupMenuItem(profile[0]);
        if (this._checkProfilePossible(outputs, profile) == true) {
            if (this._compareProfiles(profile, profileCurrent) == true)
                item.setShowDot(true);
            }
        else {
            item.actor.reactive = false;
            }
        item.connect('activate', Lang.bind(this, this._setProfile, config, outputs, profile));
        this.menu.addMenuItem(item);
        
        let profileCaption;
        let profileCaptionPfix = '';
        if (profile[1] == true)
            profileCaptionPfix = '(Cloned) ';
        for (let i = 2; i < profile.length; i++) {
             profileCaption = '   ' + profile[i][1] + ' - '  + profileCaptionPfix + profile[i][4] + 'x'  + profile[i][5] + '@'  + profile[i][6] + 'Hz';
             item = new PopupMenu.PopupMenuItem(profileCaption);
             item.actor.reactive = false;
             this.menu.addMenuItem(item);
             }        
        },
        
    _setProfile: function(item, event, config, outputs, profile) {
        config.save();
        
        for (let i = 0; i < outputs.length; i++) {
            if (outputs[i].is_connected()) {
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
            this._proxy.ApplyConfigurationRemote(0, event.get_time());
            }
        catch (e) {
            global.log('Could not save monitor configuration: ' + e);
            }
        },
        
    _compareProfiles: function(profileA, profileB) {
        if (profileA.length != profileB.length || profileA[1] != profileB[1])
            return false;
            
        let profileA_ = profileA.slice(2);
        let profileB_ = profileB.slice(2);
        
        profileA_ = profileA_.sort(function(a,b){return a[0]-b[0]});
        profileB_ = profileB_.sort(function(a,b){return a[0]-b[0]});
        
        for (let i = 0; i < profileA_.length; i++) {
            for (let j = 0; j < profileA_[0].length; j++) {
                if (profileA_[i][j] != profileB_[i][j])
                    return false;
                }
            }
        return true;
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
            if (outputs[i].is_connected() && outputs[i].is_active()) {
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
    
    
let _displayProfileManager;

function init(metadata) {
    }
    
function enable() {
    _displayProfileManager = new DisplayProfileManager();
    Main.panel.addToStatusArea('display-profile-manager', _displayProfileManager);
    }
    
function disable() {
    _displayProfileManager.destroy();
    }
    
