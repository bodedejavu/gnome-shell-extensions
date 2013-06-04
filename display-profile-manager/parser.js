/*
author: Paul Bodenbenner <paul.bodenbenner@gmail.com>
*/


const DELIMITER_PROFILES = '|||'
const DELIMITER_OUTPUTS = '||'
const DELIMITER_OUTPUT_PROPERTIES = '|'


function isTrueOrFalse(trueFalseString) {
    return (trueFalseString == 'true');
    }
    
function getProfileItemFromString(itemString, j) {
    let item;
    
    if (j == 0) {
        item = itemString.trim();
        }
    else if (j == 1) {
        item = this.isTrueOrFalse(itemString.trim());
        }
    else {
        item = new Array();
        let itemOutputProperties = itemString.split(DELIMITER_OUTPUT_PROPERTIES);
        for (let k = 0; k < itemOutputProperties.length; k++) {
            if (k == 0 || k == 1)
                item.push(itemOutputProperties[k].trim());
            else if (k == 8)
                item.push(this.isTrueOrFalse(itemOutputProperties[k].trim()));
            else
                item.push(parseInt((itemOutputProperties[k].trim())));
            }
        }
        
    return item;
    }
    
function getProfileFromString(profileString) {
    let profile = new Array();
    
    if (profileString) {
        let profileOutputs = profileString.split(DELIMITER_OUTPUTS);
        for (let j = 0; j < profileOutputs.length; j++) {
            profile.push(this.getProfileItemFromString(profileOutputs[j], j));
            }
        }
        
    return profile;
    }
    
function getProfilesFromString(profilesString) {
    let profiles = new Array();
    
    if (profilesString) {
        let profilesProfiles = profilesString.split(DELIMITER_PROFILES);
        for (let i = 0; i < profilesProfiles.length; i++) {
            profiles.push(this.getProfileFromString(profilesProfiles[i]));
            }
        }
        
    return profiles;
    }
    
function getProfileItemAsString(item, j) {
    let itemString;
    
    if (j == 0) {
        itemString = item;
        }
    else if (j == 1) {
        itemString = item.toString();
        }
    else {
        itemString = '';
        for (let k = 0; k < item.length; k++) {
            if (k == 0 || k == 1)
                itemString += item[k] + DELIMITER_OUTPUT_PROPERTIES;
            else
                itemString += item[k].toString() + DELIMITER_OUTPUT_PROPERTIES;
            }
        itemString = itemString.substring(0, itemString.length-DELIMITER_OUTPUT_PROPERTIES.length);
        }
        
    return itemString;
    }
    
function getProfileAsString(profile) {
    let profileString = '';
    
    if (profile) {
        for (let j = 0; j < profile.length; j++) {
            profileString += this.getProfileItemAsString(profile[j], j) + DELIMITER_OUTPUTS;
            }
        profileString = profileString.substring(0, profileString.length-DELIMITER_OUTPUTS.length);
        }
        
    return profileString;
    }
    
function getProfilesAsString(profiles) {
    let profilesString = '';
    
    if (profiles) {
        for (let i = 0; i < profiles.length; i++) {
            profilesString += this.getProfileAsString(profiles[i]) + DELIMITER_PROFILES;
            }
        profilesString = profilesString.substring(0, profilesString.length-DELIMITER_PROFILES.length);
        }
        
    return profilesString;
    }
    
