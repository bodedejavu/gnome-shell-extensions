/*
author: Paul Bodenbenner <paul.bodenbenner@gmail.com>
*/


const DELIMITER_PROFILES = '|||'
const DELIMITER_OUTPUTS = '||'
const DELIMITER_OUTPUT_PROPERTIES = '|'


function isTrueOrFalse(trueFalseString) {
    return (trueFalseString == 'true');
    }
    
function getProfileFromString(profileString, parseDataTypes) {
    let profile = new Array();
    
    if (profileString) {
        let profileOutputs = profileString.split(DELIMITER_OUTPUTS);
        for (let j = 0; j < profileOutputs.length; j++) {
            if (parseDataTypes == false) {
                profile.push(profileOutputs[j]);
                }
            else {
                if (j==0) {
                    profile.push(profileOutputs[j]);
                    }
                else if (j==1) {
                    profile.push(this.isTrueOrFalse(profileOutputs[j]));
                    }
                else {
                    let iOutput = new Array();
                    let profileOutputProperties = profileOutputs[j].split(DELIMITER_OUTPUT_PROPERTIES);
                    for (let k = 0; k < profileOutputProperties.length; k++) {
                        if (k>=2 && k<=7) {
                            iOutput.push(parseInt(profileOutputProperties[k]));
                            }
                        else if (k==8) {
                            iOutput.push(this.isTrueOrFalse(profileOutputProperties[k]));
                            }
                        else {
                            iOutput.push(profileOutputProperties[k]);
                            }
                        }
                    profile.push(iOutput);
                    }
                }
            }
        }
        
    return profile;
    }
    
function getProfilesFromString(profilesString, parseDataTypes) {
    let profiles = new Array();
    
    if (profilesString) {
        let iProfile;
        let profilesProfiles = profilesString.split(DELIMITER_PROFILES);
        for (let i = 0; i < profilesProfiles.length; i++) {
            iProfile = this.getProfileFromString(profilesProfiles[i], parseDataTypes);
            profiles.push(iProfile);
            }
        }
        
    return profiles;
    }
    
function getProfileAsString(profile, parseDataTypes) {
    let profileString = '';
    
    if (profile) {
        for (let j = 0; j < profile.length; j++) {
            if (parseDataTypes == false) {
                if (j == 0) {
                    profileString += profile[j].trim() + DELIMITER_OUTPUTS;
                    }
                else if (j == 1) {
                    profileString += this.isTrueOrFalse(profile[j].trim()).toString() + DELIMITER_OUTPUTS;
                    }
                else if (j >= 2) {
                    let iProfileStringCleaned = '';
                    let profileOutputProperties = profile[j].split(DELIMITER_OUTPUT_PROPERTIES);
                    for (let i = 0; i < profileOutputProperties.length; i++) {
                        if (i == 8)
                            iProfileStringCleaned += this.isTrueOrFalse(profileOutputProperties[i].trim()).toString() + DELIMITER_OUTPUT_PROPERTIES;
                        else
                            iProfileStringCleaned += profileOutputProperties[i].trim() + DELIMITER_OUTPUT_PROPERTIES;
                        }
                    iProfileStringCleaned = iProfileStringCleaned.substring(0, iProfileStringCleaned.length-DELIMITER_OUTPUT_PROPERTIES.length);
                    profileString += iProfileStringCleaned + DELIMITER_OUTPUTS;
                    }
                }
            else {
                if (j == 0)
                    profileString += profile[j] + DELIMITER_OUTPUTS;
                else if (j == 1)
                    profileString += profile[j].toString() + DELIMITER_OUTPUTS;
                else if (j >= 2)
                    profileString += profile[j].join(DELIMITER_OUTPUT_PROPERTIES) + DELIMITER_OUTPUTS;
                }
            }
        profileString = profileString.substring(0, profileString.length-DELIMITER_OUTPUTS.length);
        }
        
    return profileString;
    }
    
function getProfilesAsString(profiles, parseDataTypes) {
    let profilesString = '';
    
    if (profiles) {
        for (let i = 0; i < profiles.length; i++) {
            profilesString += this.getProfileAsString(profiles[i], parseDataTypes);
            profilesString += DELIMITER_PROFILES;
            }
        profilesString = profilesString.substring(0, profilesString.length-DELIMITER_PROFILES.length);
        }
        
    return profilesString;
    }
    
