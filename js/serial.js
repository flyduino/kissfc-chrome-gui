'use strict';

var ANDROID_OTG_SERIAL = "Android OTG USB";
/*
var serial = {
    connect: function (path, options, callback) {
    },
    disconnect: function (callback) {
    },
    getDevices: function (callback) {
    },
    getInfo: function (callback) {
    },
    getControlSignals: function (callback) {
    },
    setControlSignals: function (signals, callback) {
    },
    send: function (data, callback) {
    },
    onReceive: {
    },
    onReceiveError: {
    },
    emptyOutputBuffer: function () {
    }
};
*/

var serial = chromeSerial;

function getAvailableSerialDevices(callback) {
	 var devices = [];
	 chromeSerial.getDevices(function(chromeDevices) {
		 for (var i=0; i<chromeDevices.length; i++)  devices.push(chromeDevices[i]);
		 websocketSerial.getDevices(function(chromeDevices) {
			 for (var i=0; i<chromeDevices.length; i++)  devices.push(chromeDevices[i]);
			 if (callback!=null) callback(devices);
		 });
//		 devices.push(ANDROID_OTG_SERIAL);
		
	 });
	  
}

function getSerialDriverForPort(selectedPort) {
	if (selectedPort === KISSFC_WIFI) {
		return websocketSerial;
	} else if (selectedPort === ANDROID_OTG_SERIAL) {
		return androidOTGSerial;
	} else {
		return chromeSerial;
	}
}