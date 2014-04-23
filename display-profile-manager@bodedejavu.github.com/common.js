/*
author: Paul Bodenbenner <paul.bodenbenner@gmail.com>
*/


const SETTINGS_KEY_PROFILES = 'profiles';
const SETTINGS_KEY_CURRENT_PROFILE = 'current-profile';
const SETTINGS_KEY_EXPERT_MODE = 'expert-mode';
const SETTINGS_KEY_SHOW_PROFILE_DESCRIPTION = 'show-profile-description';
const SETTINGS_KEY_SHOW_DISPLAYS_SETTINGS = 'show-displays-settings';
const SETTINGS_KEY_SHOW_DISPLAY_PROFILE_MANAGER_SETTINGS = 'show-display-profile-manager-settings';
const SETTINGS_KEY_KEYBINDING_PROFILE = 'keybinding-profile-';


function _compareProfiles(profileA, profileB) {
    if (profileA.length != profileB.length || profileA[1] != profileB[1])
        return false;
        
    let profileA_ = profileA.slice(2);
    let profileB_ = profileB.slice(2);
    
    profileA_ = profileA_.sort(function(a,b){return a[0].localeCompare(b[0])});
    profileB_ = profileB_.sort(function(a,b){return a[0].localeCompare(b[0])});
    
    for (let i = 0; i < profileA_.length; i++) {
        for (let j = 0; j < profileA_[0].length; j++) {
            //if (profileA_[i][j] != profileB_[i][j])
            if ((j == 1 && profileA_[i][j].toLowerCase() != profileB_[i][j].toLowerCase()) || (j != 1 && profileA_[i][j] != profileB_[i][j]))
                return false;
            }
        }
    return true;
    }
    
