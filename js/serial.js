'use strict';

var ANDROID_OTG_SERIAL = "USB OTG", KISSFC_WIFI = "KISS WIFI";

var serialDevice;

function getAvailableSerialDevices(callback) {
    var devices = [];

    if (typeof chromeSerial !== 'undefined') {
        chromeSerial.getDevices(function(chromeDevices) {
            for (var i = 0; i < chromeDevices.length; i++) devices.push(chromeDevices[i]);
            if (typeof androidOTGSerial !== 'undefined') devices.push(ANDROID_OTG_SERIAL);
            if (typeof websocketSerial !== 'undefined') devices.push(KISSFC_WIFI);
            if (callback) callback(devices);
        });
    } else {
        if (typeof androidOTGSerial !== 'undefined') devices.push(ANDROID_OTG_SERIAL);
        if (typeof websocketSerial !== 'undefined') devices.push(KISSFC_WIFI);
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
