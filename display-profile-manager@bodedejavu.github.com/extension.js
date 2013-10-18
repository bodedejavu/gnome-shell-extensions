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

const Gettext = imports.gettext.domain('display-profile-manager');
const _ = Gettext.gettext;

const XRandr2Iface = <interface name='org.gnome.SettingsDaemon.XRANDR_2'>
<method name='ApplyConfiguration'>
    <arg type='x' direction='in'/>
    <arg type='x' direction='in'/>
</method>
</interface>;
const XRandr2 = Gio.DBusProxy.makeProxyWrapper(XRandr2Iface);

const DisplayConfigInterface = <interface name='org.gnome.Mutter.DisplayConfig'>
    <method name='ApplyConfiguration'>
      <arg name='serial' direction='in' type='u' />
      <arg name='persistent' direction='in' type='b' />
      <arg name='crtcs' direction='in' type='a(uiiiuaua{sv})' />
      <arg name='outputs' direction='in' type='a(ua{sv})' />
    </method>
    <method name='GetResources'>
      <arg name='serial' direction='out' type='u' />
      <arg name='crtcs' direction='out' type='a(uxiiiiiuaua{sv})' />
      <arg name='outputs' direction='out' type='a(uxiausauaua{sv})' />
      <arg name='modes' direction='out' type='a(uxuud)' />
      <arg name='max_screen_width' direction='out' type='i' />
      <arg name='max_screen_height' direction='out' type='i' />
    </method>
    <signal name='MonitorsChanged'>
    </signal>
</interface>;
const DisplayConfigProxy = Gio.DBusProxy.makeProxyWrapper(DisplayConfigInterface);

const SETTINGS_KEY_PROFILES = 'profiles';
const SETTINGS_KEY_CURRENT_PROFILE = 'current-profile';
const SETTINGS_KEY_EXPERT_MODE = 'expert-mode';
const SETTINGS_KEY_SHOW_PROFILE_DESCRIPTION = 'show-profile-description';
const SETTINGS_KEY_SHOW_DISPLAYS_SETTINGS = 'show-displays-settings';
const SETTINGS_KEY_SHOW_DISPLAY_PROFILE_MANAGER_SETTINGS = 'show-display-profile-manager-settings';
const SETTINGS_KEY_KEYBINDING_PROFILE = 'keybinding-profile-';


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
        this._handlerIdSettings = this._settings.connect('changed::' + SETTINGS_KEY_PROFILES, Lang.bind(this, this._onSettingsChanged));
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
            if (Main.wm.addKeybinding)
                Main.wm.removeKeybinding(keybinding);
            else
                global.display.remove_keybinding(keybinding);
            }
        },
        
    _getCurrentSettings: function() {
        let profilesString = this._settings.get_string(SETTINGS_KEY_PROFILES);
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
        if (withReset == true)
            this.menu.removeAll();
            this._clearKeybindings();
            
        let config = GnomeDesktop.RRConfig.new_current(this._screen);
        let outputs = config.get_outputs();
        
        let profileCurrent = this._getCurrentProfile(config, outputs);
        let profileStringCurrent = Parser.getProfileAsString(profileCurrent);
       	this._settings.set_string(SETTINGS_KEY_CURRENT_PROFILE, profileStringCurrent);
        
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
        let showDisplaysSettings = this._settings.get_boolean(SETTINGS_KEY_SHOW_DISPLAYS_SETTINGS);
        let showDisplayProfileManagerSettings = this._settings.get_boolean(SETTINGS_KEY_SHOW_DISPLAY_PROFILE_MANAGER_SETTINGS);
        
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
            if (this._compareProfiles(profile, profileCurrent) == true)
                item.setShowDot(true);
                
            item.connect('activate', Lang.bind(this, this._setProfileFromMenuItem, config, outputs, profile));
            
            if (profileNumber < 9) {
                let keybinding;
                let keybinding_name;
                let keybinding_handler;
                
                keybinding_name = SETTINGS_KEY_KEYBINDING_PROFILE + (profileNumber+1).toString();
                keybinding_handler = Lang.bind(this, this._setProfileFromKeybinding, config, outputs, profile);
                if (Main.wm.addKeybinding) {
                    keybinding = Main.wm.addKeybinding(keybinding_name, this._settings, Meta.KeyBindingFlags.NONE, Shell.KeyBindingMode.NORMAL | Shell.KeyBindingMode.MESSAGE_TRAY, keybinding_handler);
                    this._keybindings.push(keybinding_name);
                    }
                else {
                    keybinding = global.display.add_keybinding(keybinding_name, this._settings, Meta.KeyBindingFlags.NONE, keybinding_handler);
                    this._keybindings.push(keybinding);
                    }
                }
            }
        else {
            item.actor.reactive = false;
            }
        this.menu.addMenuItem(item);
        
        let showProfileDescription = this._settings.get_boolean(SETTINGS_KEY_SHOW_PROFILE_DESCRIPTION);
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
        
    _compareProfiles: function(profileA, profileB) {
        if (profileA.length != profileB.length || profileA[1] != profileB[1])
            return false;
            
        let profileA_ = profileA.slice(2);
        let profileB_ = profileB.slice(2);
        
        profileA_ = profileA_.sort(function(a,b){return a[0].localeCompare(b[0])});
        profileB_ = profileB_.sort(function(a,b){return a[0].localeCompare(b[0])});
        
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
    
const DisplayProfileManager2 = new Lang.Class({
    Name: 'DisplayProfileManager.DisplayProfileManager',
    Extends: PopupMenu.PopupMenuSection,
    
    _init: function() {
        this.rotationMapping = {'wayland': [0, 1, 2, 3], 'xrandr': [1, 2, 4, 8]};
        
        this.parent();
        
        this.item = new PopupMenu.PopupSubMenuMenuItem('Display Profiles', true);
        this.item.icon.icon_name = 'preferences-desktop-display-symbolic';
        this.addMenuItem(this.item);
        
        this._keybindings = new Array();
        
        this._settings = Convenience.getSettings();
       	this._getCurrentSettings();
        this._handlerIdSettings = this._settings.connect('changed', Lang.bind(this, this._onSettingsChanged));
        
        new this._displayConfigProxyWrapper(Lang.bind(this, this._displayConfigProxySignalMonitorsChanged));
        new this._displayConfigProxyWrapper(Lang.bind(this, this._displayConfigProxyMethodGetResourcesRemote));
        },
        
    cleanup: function() {
        this._clearSignals();
        this._clearKeybindings();
        },
        
    _clearSignals: function() {
        if (this._handlerIdMonitorsChanged)
            this._dbusMonitorsChanged.disconnectSignal(this._handlerIdMonitorsChanged);
        if (this._handlerIdSettings)
            this._settings.disconnect(this._handlerIdSettings);
        },
        
    _clearKeybindings: function() {
        let keybinding;
        while (this._keybindings.length > 0) {
            keybinding = this._keybindings.pop();
            if (Main.wm.addKeybinding)
                Main.wm.removeKeybinding(keybinding);
            else
                global.display.remove_keybinding(keybinding);
            }
        },
        
    _displayConfigProxyWrapper: function(callback) {
        new DisplayConfigProxy(Gio.DBus.session, 'org.gnome.Shell', '/org/gnome/Mutter/DisplayConfig', callback);
        },
        
    _displayConfigProxyMethodGetResourcesRemote: function(proxy) {
        proxy.GetResourcesRemote(Lang.bind(this, this._onMonitorsChanged));
        },
        
    _displayConfigProxyMethodApplyConfigurationRemote: function(proxy) {
        proxy.ApplyConfigurationRemote(this.serial_out, this.persistent_out, this.crtcs_out, this.outputs_out);
        },
        
    _displayConfigProxySignalMonitorsChanged: function(proxy) {
        this._dbusMonitorsChanged = proxy;
        this._handlerIdMonitorsChanged = proxy.connectSignal('MonitorsChanged', Lang.bind(this,
            function(proxy) {
                proxy.GetResourcesRemote(Lang.bind(this, this._onMonitorsChanged));
                }
            ));
        },
        
    _getCurrentSettings: function() {
        let profilesString = this._settings.get_string(SETTINGS_KEY_PROFILES);
        this._profiles = Parser.getProfilesFromString(profilesString);
        },
        
    _onSettingsChanged: function() {
        this._getCurrentSettings();
        this._createMenu();
        },
        
    _onMonitorsChanged: function(resources) {
        this.serial = resources[0];
        this.crtcs = resources[1];
        this.outputs = resources[2];
        this.modes = resources[3];
        
        this._profile = this._getCurrentProfile();
        
        let profileStringCurrent = Parser.getProfileAsString(this._profile);
        if (profileStringCurrent != this._settings.get_string(SETTINGS_KEY_CURRENT_PROFILE))
       	    this._settings.set_string(SETTINGS_KEY_CURRENT_PROFILE, profileStringCurrent);
            
        this._createMenu();
        },
        
    _createMenu: function() {
        this.item.menu.removeAll();
        this.item.status.text = '';
        this._clearKeybindings();
        
        this._insertProfileItems();
        this._insertSettingsItems();
        },
        
    _insertProfileItems: function() {
        let item;
        
        if (this._profiles.length == 0) {
            item = new PopupMenu.PopupMenuItem(_("No Profiles Defined"));
            item.actor.reactive = false;
            this.item.menu.addMenuItem(item);
            }
        else {
            let is_active;
            let active_set = false;
            for (let i = 0; i < this._profiles.length; i++) {
                is_active = this._addProfileItem(i);
                if (is_active == true && active_set == false) {
                    this.item.status.text = this._profiles[i][0];
                    active_set = true;
                    }
                }
            }
        },
        
    _insertSettingsItems: function() {
        let showDisplaysSettings = this._settings.get_boolean(SETTINGS_KEY_SHOW_DISPLAYS_SETTINGS);
        let showDisplayProfileManagerSettings = this._settings.get_boolean(SETTINGS_KEY_SHOW_DISPLAY_PROFILE_MANAGER_SETTINGS);
        
        if (showDisplaysSettings == true || showDisplayProfileManagerSettings == true)
            this.item.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        if (showDisplaysSettings == true) {
            this.item.menu.addSettingsAction(_("Displays Settings"), 'gnome-display-panel.desktop');
            }
        if (showDisplayProfileManagerSettings == true) {
            let item = new PopupMenu.PopupMenuItem(_("Display Profile Manager Settings"));
            item.connect('activate', function() {
                let app = Shell.AppSystem.get_default().lookup_app('gnome-shell-extension-prefs.desktop');
                if (app != null)
                    app.launch(global.display.get_current_time_roundtrip(), ['extension:///' + Me.uuid], -1, null);
                });
            this.item.menu.addMenuItem(item);
            }
        },
        
    _addProfileItem: function(profileIndex) {
        let item;
        let is_active = false;
        
        item = new PopupMenu.PopupMenuItem(this._profiles[profileIndex][0]);
        if (this._checkProfilePossible(this._profiles[profileIndex]) == true) {
            if (this._compareProfiles(this._profiles[profileIndex], this._profile) == true) {
                item.setOrnament(PopupMenu.Ornament.DOT);
                is_active = true;
                }
                
            item.connect('activate', Lang.bind(this, this._setProfileFromMenuItem, this._profiles[profileIndex]));
            
            if (profileIndex < 9) {
                let keybinding;
                let keybinding_name;
                let keybinding_handler;
                
                keybinding_name = SETTINGS_KEY_KEYBINDING_PROFILE + (profileIndex+1).toString();
                keybinding_handler = Lang.bind(this, this._setProfileFromKeybinding, this._profiles[profileIndex]);
                if (Main.wm.addKeybinding) {
                    keybinding = Main.wm.addKeybinding(keybinding_name, this._settings, Meta.KeyBindingFlags.NONE, Shell.KeyBindingMode.NORMAL | Shell.KeyBindingMode.MESSAGE_TRAY, keybinding_handler);
                    this._keybindings.push(keybinding_name);
                    }
                else {
                    keybinding = global.display.add_keybinding(keybinding_name, this._settings, Meta.KeyBindingFlags.NONE, keybinding_handler);
                    this._keybindings.push(keybinding);
                    }
                }
            }
        else {
            item.actor.reactive = false;
            }
        this.item.menu.addMenuItem(item);
        
        let showProfileDescription = this._settings.get_boolean(SETTINGS_KEY_SHOW_PROFILE_DESCRIPTION);
        if (showProfileDescription == true) {
            let profileDescription;
            for (let i = 2; i < this._profiles[profileIndex].length; i++) {
                profileDescription = '';
                profileDescription += '   ' + this._profiles[profileIndex][i][1] + ' - ' + this._profiles[profileIndex][i][4] + 'x' + this._profiles[profileIndex][i][5] + '@' + this._profiles[profileIndex][i][6] + 'Hz';
                if (this._profiles[profileIndex][1] == true)
                    profileDescription += ' (Cloned)';
                item = new PopupMenu.PopupMenuItem(profileDescription);
                item.actor.reactive = false;
                this.item.menu.addMenuItem(item);
                }
            }
            
        return is_active;
        },
        
    _setProfileFromMenuItem: function(item, event, profile) {
        this._setProfile(profile);
        },
        
    _setProfileFromKeybinding: function(display, screen, dummy, keybinding, profile) {
        this._setProfile(profile);
        },
        
    _setProfile: function(profile) {
        this.serial_out = this.serial;
        this.persistent_out = true;
        this.crtcs_out = new Array();
        this.outputs_out = new Array();
        
        for (let i = 0; i < this.outputs.length; i++) {
            let profileIndex = -1;
            for (let j = 2; j < profile.length; j++) {
                if (this.outputs[i][4] == profile[j][0]) {
                    profileIndex = j;
                    }
                }
                
            if (profileIndex == -1) {
                this.crtcs_out.push([this.crtcs[i][0], -1, this.crtcs[i][2], this.crtcs[i][3], this.crtcs[i][7], [this.outputs[i][0]], {}]);
                this.outputs_out.push([this.outputs[i][0], {}]);
                }
            else {
                let newMode = this._getModeFromData(profile[profileIndex][4], profile[profileIndex][5], profile[profileIndex][6], i);
                let rotation = profile[profileIndex][7];
                let transform = this.rotationMapping['wayland'][0];
                let rotationIndex = this.rotationMapping['xrandr'].indexOf(rotation);
                if (rotationIndex != -1)
                    transform = this.rotationMapping['wayland'][rotationIndex];
                    
                this.crtcs_out.push([this.crtcs[i][0], newMode, profile[profileIndex][2], profile[profileIndex][3], transform, [this.outputs[i][0]], {}]);
                this.outputs_out.push([this.outputs[i][0], {primary: GLib.Variant.new_boolean(profile[profileIndex][8])}]);
                }
            }
            
        new this._displayConfigProxyWrapper(Lang.bind(this, this._displayConfigProxyMethodApplyConfigurationRemote));
        },
        
    _compareProfiles: function(profileA, profileB) {
        if (profileA.length != profileB.length || profileA[1] != profileB[1])
            return false;
            
        let profileA_ = profileA.slice(2);
        let profileB_ = profileB.slice(2);
        
        profileA_ = profileA_.sort(function(a,b){return a[0].localeCompare(b[0])});
        profileB_ = profileB_.sort(function(a,b){return a[0].localeCompare(b[0])});
        
        for (let i = 0; i < profileA_.length; i++) {
            for (let j = 0; j < profileA_[0].length; j++) {
                if (profileA_[i][j] != profileB_[i][j])
                    return false;
                }
            }
        return true;
        },
        
    _checkProfilePossible: function(profile) {
        for (let i = 2; i < profile.length; i++) {
            let outputFound = false;
            for (let j = 0; j < this.outputs.length; j++) {
                if (this.outputs[j][4] == profile[i][0]) {
                    if (this.outputs[j][7]['display-name'].unpack() != profile[i][1])
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
        
    _getCurrentProfile: function() {
        let profile = new Array();
        
        profile.push('Unnamed');
        profile.push(false);
        
        for (let i = 0; i < this.outputs.length; i++) {
            let crtcIndex = this._getCrtcIndex(this.outputs[i][2]);
            if (crtcIndex == -1)
                continue;
            let modeData = this._getDataFromMode(this.crtcs[crtcIndex][6]);
            
            let width = modeData[0];
            let height = modeData[1];
            let refreshRate = modeData[2];
            let x = this.crtcs[crtcIndex][2];
            let y = this.crtcs[crtcIndex][3];
            let transform = this.crtcs[crtcIndex][7];
            let name = this.outputs[i][4];
            let displayName = this.outputs[i][7]['display-name'].unpack();
            let primary = this.outputs[i][7]['primary'].unpack();
            
            let rotation = this.rotationMapping['xrandr'][0];
            let rotationIndex = this.rotationMapping['wayland'].indexOf(transform);
            if (rotationIndex != -1)
                rotation = this.rotationMapping['xrandr'][rotationIndex];
                
            let iOutput = new Array();
            iOutput.push(name);
            iOutput.push(displayName);
            iOutput.push(x);
            iOutput.push(y);
            iOutput.push(width);
            iOutput.push(height);
            iOutput.push(refreshRate);
            iOutput.push(rotation);
            iOutput.push(primary);
            
           	profile.push(iOutput);
        }
        return profile;
        },
        
    _getCrtcIndex: function(crtc) {
        let crtcIndex = -1;
        for (let i = 0; i < this.crtcs.length; i++) {
            if (this.crtcs[i][0] == crtc) {
                crtcIndex = i;
                break;
                }
            }
        return crtcIndex;
        },
        
    _getModeFromData: function(width, height, refreshRate, iOutput) {
        let mode = -1;
        for (let i = 0; i < this.modes.length; i++) {
            if (this.outputs[iOutput][5].indexOf(this.modes[i][0]) != -1 && this.modes[i][2] == width && this.modes[i][3] == height && Math.round(this.modes[i][4]) == refreshRate) {
                mode = this.modes[i][0];
                break;
                }
            }
        return mode;
        },
        
    _getDataFromMode: function(mode) {
        let width = 0;
        let height = 0;
        let refreshRate = 0;
        
        for (let i = 0; i < this.modes.length; i++) {
            if (this.modes[i][0] == mode) {
                width = this.modes[i][2];
                height = this.modes[i][3];
                refreshRate = Math.round(this.modes[i][4]);
                break;
                }
            }
        return [width, height, refreshRate];
        }
    });    
    
    
let _displayProfileManager;

function init() {
    Convenience.initTranslations("display-profile-manager");
    }
    
function enable() {
    if (Main.panel.statusArea.aggregateMenu) {
        _displayProfileManager = new DisplayProfileManager2();
        let position = Main.panel.statusArea.aggregateMenu.menu.numMenuItems - 2;
        Main.panel.statusArea.aggregateMenu.menu.addMenuItem(_displayProfileManager, position);
        }
    else {
        _displayProfileManager = new DisplayProfileManager();
        Main.panel.addToStatusArea('display-profile-manager', _displayProfileManager);
        }
    }
    
function disable() {
    _displayProfileManager.cleanup();
    _displayProfileManager.destroy();
    }
    
