'use strict';

CONTENT.welcome = {};

CONTENT.welcome.initialize = function(callback) {
    var self = this;

    GUI.switchContent('welcome', function() {
        GUI.load("./content/welcome.html", htmlLoaded);
    });
    
    function canDFU() {
        if (navigator.appVersion.indexOf("Win")!=-1) return false; else return true;
    }

    function checkDFU() {
        chrome.usb.getDevices(usbDevices.STM32DFU, function(result) {
            if (result.length) {
                GUI.contentSwitchInProgress = true;
                GUI.contentSwitchCleanup(function() {
                    CONTENT['flasher'].initialize();
                });
            } else {
                if (GUI.activeContent == 'welcome') {
                    setTimeout(checkDFU, 2000);
                    $("#portArea").show();
                }
            }
        });
    }
    
    function htmlLoaded() {
        if (canDFU()) checkDFU();
        
        $('a[data-lang="'+$.i18n.locale+'"]').addClass('selected-language');
        
        $(".language").on("click", function() {
           var lang = $(this).data("lang");
           $.i18n.locale = lang;
           setLanguage(lang);
           changeLanguage();
           $('a[data-lang]').removeClass('selected-language');
           $('a[data-lang="'+$.i18n.locale+'"]').addClass('selected-language');
        });
    }
};

CONTENT.welcome.cleanup = function(callback) {
    if (callback)
        callback();
};
