'use strict';

CONTENT.welcome = {};

CONTENT.welcome.initialize = function (callback) {
    var self = this;
    
    GUI.switchContent('welcome', function() {
     	$('#content').load("./content/welcome.html", htmlLoaded);
    });
   
    function checkDFU() {
    	 chrome.usb.getDevices(usbDevices.STM32DFU, function (result) {
 	        if (result.length) {
 	        	$("#portArea").hide();
 	        	GUI.contentSwitchInProgress = true;
 	            GUI.contentSwitchCleanup(function () {
 	                CONTENT['flasher'].initialize();
 	            });
 	        } else {
 	        	if (GUI.activeContent == 'welcome')  {
 	        		setTimeout(checkDFU, 2000);
 	        		$("#portArea").show();
 	        	}
 	        }
 	    });
    }

    function htmlLoaded() {
    	checkDFU();
    }
};

CONTENT.welcome.cleanup = function (callback) {
    if (callback) callback();
};