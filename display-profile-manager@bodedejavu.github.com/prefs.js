/*
author: Paul Bodenbenner <paul.bodenbenner@gmail.com>
*/


const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;
const Lang = imports.lang;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Parser = Me.imports.parser;


const SETTINGS_KEY_PROFILES = 'profiles';
const SETTINGS_KEY_CURRENT_PROFILE = 'current-profile';
const SETTINGS_KEY_EXPERT_MODE = 'expert-mode';


const ProfilesSettingsWidget = new GObject.Class({
    Name: 'DisplayProfileManager.ProfilesSettingsWidget',
    GTypeName: 'ProfilesSettingsWidget',
    Extends: Gtk.Box,
    
    _init: function() {
        this.parent({orientation: Gtk.Orientation.VERTICAL, border_width: 10});
        
        this._settings = Convenience.getSettings();
        
        let text;
        let profileStringCurrent = this._settings.get_string(SETTINGS_KEY_CURRENT_PROFILE);
        if (!profileStringCurrent) {
            text = 'Error: Could not detect current screen configuration. Extension seems not to be running.';
            let label = new Gtk.Label({label: text, xalign: 0, margin_bottom: 10});
            this.add(label);
            }
        else {
            let label1 = new Gtk.Label({label: '<b>Create Profile</b>', use_markup: true, xalign: 0, margin_bottom: 10});
            
            text = 'Set up your screen configuration in the "Displays Settings" dialog. By pressing the button below your configuration will be saved as a profile. In the "Manage Profiles" section you can modify your stored profiles.';
            let label2 = new Gtk.Label({label: text, use_markup: true, xalign: 0, margin_left:20, margin_bottom: 10});
            label2.set_line_wrap(true);
            
            let button = new Gtk.Button({label: 'Create a profile with current screen configuration', margin_left:20, margin_bottom: 10});
            button.connect('clicked', Lang.bind(this, this._addProfile));
            
            let label3 = new Gtk.Label({label: '<b>Manage Profiles</b>', use_markup: true, xalign: 0, margin_bottom: 10});
            
            text = 'The character "|" must not be used in the entry fields, except in the "Outputs" entries where it seperates the properties.\nPlease use the "Expert Mode" only if you know what you are doing.';
            let label4 = new Gtk.Label({label: text, use_markup: true, xalign: 0, margin_left:20, margin_bottom: 10});
            label4.set_line_wrap(true);
            
            let isExpert = this._settings.get_boolean(SETTINGS_KEY_EXPERT_MODE);
            let checkButton = new Gtk.CheckButton({label:'Expert Mode', active: isExpert, margin_left:20, margin_bottom: 10});
            checkButton.connect('toggled', Lang.bind(this, this._changeExpertMode));
            
            this.add(label1);
            this.add(label2);
            this.add(button);
            this.add(label3);
            this.add(label4);
            this.add(checkButton);
            
            let profilesString = this._settings.get_string(SETTINGS_KEY_PROFILES);
            this._profiles = Parser.getProfilesFromString(profilesString);
            
            this._refreshGui(false);
            }
        },
        
    _addProfile: function(obj) {
        let profileStringCurrent = this._settings.get_string(SETTINGS_KEY_CURRENT_PROFILE);
        let profileCurrent = Parser.getProfileFromString(profileStringCurrent);
        this._profiles.push(profileCurrent);
        
        this._saveProfile();
        this._refreshGui(true);
        },
        
    _buttonCmd: function(obj, i, j) {
        if (j == 0) {
            let profileTemp = this._profiles[i];
            this._profiles[i] = this._profiles[i+1];
            this._profiles[i+1] = profileTemp;
            }
        else if (j == 1) {
            let profileTemp = this._profiles[i];
            this._profiles[i] = this._profiles[i-1];
            this._profiles[i-1] = profileTemp;
            }
        else if (j == 2) {
            this._profiles.splice(i, 1);
            }
            
        this._saveProfile();
        this._refreshGui(true);
        },
        
    _changeExpertMode: function(obj) {
        let isExpert = obj.get_active();
        this._settings.set_boolean(SETTINGS_KEY_EXPERT_MODE, isExpert);
        
        this._refreshGui(true);
        },
        
    _changeProfile: function(obj, i, j) {
        let item = obj.get_text();
        
        this._profiles[i][j] = Parser.getProfileItemFromString(item, j);
        this._saveProfile();
        },
        
    _saveProfile: function() {
        let profilesString = Parser.getProfilesAsString(this._profiles);
       	this._settings.set_string(SETTINGS_KEY_PROFILES, profilesString);
        },
        
    _refreshGui: function(withReset) {
        if (withReset == true)
            this.remove(this._gridProfiles);
        this._gridProfiles = this._createGridProfiles();
        this.add(this._gridProfiles);
        },
        
    _createGridProfiles: function() {
        let grid = new Gtk.Grid({margin_left: 20});
        
        if (this._profiles.length > 0) {
            let isExpert = this._settings.get_boolean(SETTINGS_KEY_EXPERT_MODE, isExpert);
            
           	let iEntry;
           	let iGrid;
           	let iLabel;
           	let iButton;
           	let buttonsText = new Array('Down', 'Up', 'Del');
           	let buttonsMargin = new Array(5, 0, 5);
           	let labelsText = new Array('Profile Name', 'Clone', 'Outputs (Name | Display Name | X | Y | Width | Height | Refresh Rate | Rotation | Primary)');
           	let itemString;
           	
            for (let i = 0; i < labelsText.length; i++) {
                iLabel = new Gtk.Label({label: labelsText[i], margin_bottom: 5});
                grid.attach(iLabel, i+1, 0, 1, 1);
                }
                
            for (let i = 0; i < this._profiles.length; i++) {
                iLabel = new Gtk.Label({label: (i+1).toString() + '.', xalign: 0, margin_right: 5});
                grid.attach(iLabel, 0, i+1, 1, 1);
                
                itemString = Parser.getProfileItemAsString(this._profiles[i][0], 0);
                iEntry = new Gtk.Entry({margin_right: 5});
                iEntry.set_text(itemString);
                iEntry.connect('changed', Lang.bind(this, this._changeProfile, i, 0));
                iEntry.set_width_chars(15);
                grid.attach(iEntry, 1, i+1, 1, 1);
                
                itemString = Parser.getProfileItemAsString(this._profiles[i][1], 1);
                iEntry = new Gtk.Entry({sensitive: isExpert});
                iEntry.set_text(itemString);
                iEntry.connect('changed', Lang.bind(this, this._changeProfile, i, 1));
                iEntry.set_width_chars(5);
                grid.attach(iEntry, 2, i+1, 1, 1);
                
                iGrid = new Gtk.Grid();
                for (let j = 2; j < this._profiles[i].length; j++) {
                    itemString = Parser.getProfileItemAsString(this._profiles[i][j], j);
                    iEntry = new Gtk.Entry({hexpand: true, sensitive: isExpert});
                    iEntry.set_text(itemString);
            		iEntry.connect('changed', Lang.bind(this, this._changeProfile, i, j));
                    iGrid.attach(iEntry, j-2, 0, 1, 1);
                    }
                grid.attach(iGrid, 3, i+1, 1, 1);
                
                iGrid = new Gtk.Grid();
                for (let j = 0; j < buttonsText.length; j++) {
                    iButton = new Gtk.Button({label: buttonsText[j], margin_left: buttonsMargin[j]});
                    iButton.connect('clicked', Lang.bind(this, this._buttonCmd, i, j));
                    if ((j == 0 && i == this._profiles.length-1) || (j == 1 && i == 0))
                        iButton.set_sensitive(false);
                    iGrid.attach(iButton, j, 0, 1, 1);
                    }
                grid.attach(iGrid, 4, i+1, 1, 1);
                }
            }
            
        grid.show_all();
        return grid
    }
    });
    
    
function init() {
    }
    
function buildPrefsWidget() {
    let widget = new ProfilesSettingsWidget();
    widget.show_all();
    return widget;
    }
    
