'use strict';

CONTENT.welcome = {};

CONTENT.welcome.initialize = function (callback) {
    var self = this;

    GUI.switchContent('welcome', function () {
        GUI.load("./content/welcome.html", htmlLoaded);
    });

    function canDFU() {
        if (navigator.appVersion.indexOf("Win") != -1) return false; else return true;
    }

    function checkDFU() {
        if (dfuDetector) {
            chrome.usb.getDevices(usbDevices.STM32DFU, function (result) {
                if (result.length) {
                    GUI.contentSwitchInProgress = true;
                    GUI.contentSwitchCleanup(function () {
                        CONTENT['flasher'].initialize();
                    });
                } else {
                    if (GUI.activeContent == 'welcome') {
                        setTimeout(checkDFU, 2000);
                        $("#portArea").show();
                    }
                }
            });
        } else {
            setTimeout(checkDFU, 2000);
        }
    }

    function htmlLoaded() {
        dfuDetector = true;
        if (canDFU()) checkDFU();

        $("#language").val($.i18n.locale);
        $("#portArea").show();
        $('#menu').show();
        $(".navigation-menu-button").css("display", "");
        $('#gui_version').text("v"+chrome.runtime.getManifest().version);

        $("#language").on("change", function () {
            var lang = $(this).val();
            $.i18n.locale = lang;
            setLanguage(lang);
            changeLanguage();
        });
    }
};

CONTENT.welcome.cleanup = function (callback) {
    if (callback)
        callback();
};
