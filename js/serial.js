'use strict';

var ANDROID_OTG_SERIAL = "Android OTG USB",
    KISSFC_WIFI = "KISSFC WIFI";

var serial;

function getAvailableSerialDevices(callback) {
	 var devices = [];

     if (typeof websocketSerial !== 'undefined') {
        devices.push(KISSFC_WIFI);
     }
     
     if (typeof androidOTGSerial !== 'undefined') {
        devices.push(ANDROID_OTG_SERIAL);
     }
     
     if (typeof chromeSerial !== 'undefined') {
	    chromeSerial.getDevices(function(chromeDevices) {
		    for (var i=0; i<chromeDevices.length; i++)  devices.push(chromeDevices[i]);
            if (callback) callback(devices);
	    });
	 } else {
	    if (callback) callback(devices);
	 }
}

function getSerialDriverForPort(selectedPort) {
	if (selectedPort === KISSFC_WIFI && (typeof websocketSerial !== 'undefined')) {
		return websocketSerial;
	} else if (selectedPort === ANDROID_OTG_SERIAL && (typeof androidOTGSerial !== 'undefined')) {
		return androidOTGSerial;
	} else if (typeof chromeSerial !== 'undefined') {
		return chromeSerial;
	} else {
	    console.log("Unable to map " + selectedPort + " to the serial driver");
	    return null;
	}
}