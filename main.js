'use strict';

const MIN_CONFIG_VERSION = 108; // this gui can manage versions in this range
const MAX_CONFIG_VERSION = 118;

function getLanguage(callback) {
    if (typeof chromeSerial !== 'undefined') {
        chrome.storage.local.get('language', function (result) {
            if (result.language !== undefined) {
                callback(result.language);
            } else {
                callback("en");
            }
        });
    } else {
        if (window.localStorage.getItem('language') !== undefined) {
            var lang = window.localStorage.getItem('language');
            if (lang == null) lang = "en";
            callback(lang);
        } else {
            callback("en");
        }
    }
}

function setLanguage(lang) {
    if (typeof chromeSerial !== 'undefined') {
        chrome.storage.local.set({
            'language': lang
        });
    } else {
        localStorage.setItem('language', lang);
    }
}

function changeLanguage() {
    getLanguage(function (lang) {
        console.log("Switching to " + lang);
        $.i18n({
            locale: lang
        });
        $.i18n.locale = lang;
        $.i18n().load('./i18n/' + lang + '.json', lang).done(
            function () {
                $("*").i18n();
            });
    });
}

function checkGithubRelease(currVersion) {

    $.get('https://api.github.com/repos/flyduino/kiss-gui/releases', function (releaseData) {
        console.log('Loaded release information from GitHub.');
        console.log('Latest release found: ' + releaseData[0].tag_name, ' parameter: ' + currVersion);
        if (semver.gt(releaseData[0].tag_name, currVersion)) {
            console.log('New version aviable!');
            $("#dialogGUIupdate").dialog();

        } else {
            $("#dialogGUIupdate").hide();
            console.log('Latest version!');
        }
    });

};

$(document).ready(function () {

    $.i18n.debug = true;

    changeLanguage();

    // Check for update
    checkGithubRelease(chrome.runtime.getManifest().version);

    PortHandler.initialize();
    CONTENT.welcome.initialize();
    $('#navigation li.external').hide();
    $('#navigation li:not(.external)').click(function () {
        var self = this;
        var content = $(self).attr('data-name');

        $("#navigation").removeClass("active-menu");

        function content_ready() {
            GUI.contentSwitchInProgress = false;
        }

        if ($(self).hasClass('unlocked') && GUI.activeContent != content) {
            GUI.contentSwitchInProgress = true;
            GUI.contentSwitchCleanup(function () {
                CONTENT[content].initialize();
            });
        }

    });

    $(".navigation-menu-button").on("click", function () {
        $("#navigation").toggleClass("active-menu");
    });
});

Number.prototype.clamp = function (min, max) {
    return Math.min(Math.max(this, min), max);
};