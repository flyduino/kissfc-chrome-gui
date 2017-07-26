'use strict';

function startApplication() {
    var applicationStartTime = new Date().getTime();

    chrome.app.window.create('main.html', {
        id : 'main-window',
        frame : 'chrome',
        innerBounds : {
            minWidth : 850,
            minHeight : 650
        }
    }, function(createdWindow) {
        createdWindow.onClosed.addListener(function() {
            var connectionId = createdWindow.contentWindow.serialDevice.connectionId;

            if (connectionId) {
                chrome.serialDevice.disconnect(connectionId, function(result) {
                    console.log('SERIAL: Connection closed - ' + result);
                });
            }
        });
    });
}

chrome.app.runtime.onLaunched.addListener(startApplication);

chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason == 'update') {
        var previousVersionArr = details.previousVersion.split('.'), currentVersionArr = chrome.runtime.getManifest().version.split('.');

        // only fire up notification sequence when one of the major version
        // numbers changed
        if (currentVersionArr[0] > previousVersionArr[0] || currentVersionArr[1] > previousVersionArr[1]) {
            var manifest = chrome.runtime.getManifest();
            var options = {
                priority : 0,
                type : 'basic',
                title : manifest.name,
                message : 'Application just updated to version: ' + manifest.version,
                iconUrl : '/images/icon_128.png',
                buttons : [ {
                    'title' : 'Click here to start the application'
                } ]
            };

            chrome.notifications.create('update', options, function(notificationId) {
                // empty
            });
        }
    }
});

chrome.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex) {
    if (notificationId == 'update')
        startApplication();
});
