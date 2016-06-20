'use strict';

CONTENT.welcome = {};

CONTENT.welcome.initialize = function (callback) {
    var self = this;
    
    if (GUI.activeContent != 'welcome') {
        GUI.activeContent = 'welcome';
    }

    $('#content').load("./content/welcome.html", htmlLoaded);

    function checkDFU() {
    	 chrome.usb.getDevices(usbDevices.STM32DFU, function (result) {
 	        if (result.length) {
 	           $("li[data-name='configuration']").hide();
 	           $("li[data-name='data_output']").hide();
 	           $("li[data-name='rates']").hide();
 	           $("li[data-name='tpa']").hide();
 	           $("#port").hide();
 	           $("a.connect").hide();
 	           $("li[data-name='flasher']").show();
 	           $("#info1").hide();
 	           $("#info2").show();
 	        } else {
 	        	if (GUI.activeContent == 'welcome') {
 	        	   setTimeout(checkDFU, 2000);
 	        	   $("li[data-name='configuration']").show();
 	 	           $("li[data-name='data_output']").show();
 	 	           $("li[data-name='rates']").show();
 	 	           $("li[data-name='tpa']").show();
 	 	           $("#port").show();
 	 	           $("a.connect").show();
 	 	           $("li[data-name='flasher']").hide();
 	 	           $("#info1").show();
 	 	           $("#info2").hide();
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