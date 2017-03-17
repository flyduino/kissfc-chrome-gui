'use strict';

var PortHandler = new function() {
    this.mainTimeoutReference;
    this.initialPorts = false;

    this.portDetectedCallbacks = [];
    this.portRemovedCallbacks = [];
}

PortHandler.initialize = function() {
    // start listening, check after 250ms
    this.check();
};

PortHandler.check = function() {
    var self = this;

    getAvailableSerialDevices(function(currentPorts) {
        // port got removed or initialPorts wasn't initialized yet
        if (self.arrayDifference(self.initialPorts, currentPorts).length > 0 || !self.initialPorts) {
            var removedPorts = self.arrayDifference(self.initialPorts, currentPorts);

            if (self.initialPorts != false) {
                if (removedPorts.length > 1) {
                    console.log('PortHandler - Removed: ' + removedPorts);
                } else {
                    console.log('PortHandler - Removed: ' + removedPorts[0]);
                }
            }

            // disconnect "UI" if necessary
            // Keep in mind that this routine can not fire during atmega32u4
            // reboot procedure !!!
            if (GUI.connectedTo) {
                for (var i = 0; i < removedPorts.length; i++) {
                    if (removedPorts[i] == GUI.connectedTo) {
                        $('a.connect').click();
                    }
                }
                if (GUI.activeContent == 'esc_flasher') {
                    $("#portArea").children().removeClass('flashing-in-progress');
                    $('a.connect').text($.i18n("menu.connect"));
                    GUI.contentSwitchInProgress = true;
                    GUI.contentSwitchCleanup(function() {
                        CONTENT['welcome'].initialize();
                    });
                }
            }

            self.updatePortSelect(currentPorts);

            // trigger callbacks (only after initialization)
            if (self.initialPorts) {
                for (var i = (self.portRemovedCallbacks.length - 1); i >= 0; i--) {
                    var obj = self.portRemovedCallbacks[i];

                    // remove timeout
                    clearTimeout(obj.timer);

                    // trigger callback
                    obj.code(removedPorts);

                    // remove object from array
                    var index = self.portRemovedCallbacks.indexOf(obj);
                    if (index > -1)
                        self.portRemovedCallbacks.splice(index, 1);
                }
            }

            // auto-select last used port (only during initialization)
            if (!self.initialPorts) {
                if (typeof chromeSerial !== 'undefined') {
                    chrome.storage.local.get('lastUsedPort', function(result) {
                        // if lastUsedPort was set, we try to select it
                        if (result.lastUsedPort) {
                            currentPorts.forEach(function(port) {
                                if (port == result.lastUsedPort) {
                                    console.log('Selecting last used port: ' + result.lastUsedPort);

                                    $('#port').val(result.lastUsedPort);
                                }
                            });
                        } else {
                            console.log('Last used port wasn\'t saved "yet", auto-select disabled.');
                        }
                    });
                }
            }

            if (!self.initialPorts) {
                // initialize
                self.initialPorts = currentPorts;
            } else {
                for (var i = 0; i < removedPorts.length; i++) {
                    self.initialPorts.splice(self.initialPorts.indexOf(removedPorts[i]), 1);
                }
            }
        }

        // new port detected
        var newPorts = self.arrayDifference(currentPorts, self.initialPorts);

        if (newPorts.length) {
            if (newPorts.length > 1) {
                console.log('PortHandler - Found: ' + newPorts);
            } else {
                console.log('PortHandler - Found: ' + newPorts[0]);
            }

            self.updatePortSelect(currentPorts);

            // select / highlight new port, if connected -> select connected
            // port
            if (!GUI.connectedTo) {
                $('#port').val(newPorts[0]);
            } else {
                $('#port').val(GUI.connectedTo);
            }

            // trigger callbacks
            for (var i = (self.portDetectedCallbacks.length - 1); i >= 0; i--) {
                var obj = self.portDetectedCallbacks[i];

                // remove timeout
                clearTimeout(obj.timer);

                // trigger callback
                obj.code(newPorts);

                // remove object from array
                var index = self.portDetectedCallbacks.indexOf(obj);
                if (index > -1)
                    self.portDetectedCallbacks.splice(index, 1);
            }

            self.initialPorts = currentPorts;
        }

        self.mainTimeoutReference = setTimeout(function() {
            self.check();
        }, 2000);
    });
};

PortHandler.updatePortSelect = function(ports) {
    $('#port').html(''); // drop previous one

    if (ports.length > 0) {
        for (var i = 0; i < ports.length; i++) {
            $('#port').append($("<option/>", {
                value : ports[i],
                text : ports[i]
            }));
        }
    } else {
        $('#port').append($("<option/>", {
            value : 0,
            text : 'No Ports'
        }));
    }
};

PortHandler.portDetected = function(name, code, timeout, ignoreTimeout) {
    var self = this;
    var obj = {
        'name' : name,
        'code' : code,
        'timeout' : (timeout) ? timeout : 10000
    };

    if (!ignoreTimeout) {
        obj.timer = setTimeout(function() {
            console.log('PortHandler - timeout - ' + obj.name);

            // trigger callback
            code(false);

            // remove object from array
            var index = self.portDetectedCallbacks.indexOf(obj);
            if (index > -1)
                self.portDetectedCallbacks.splice(index, 1);
        }, (timeout) ? timeout : 10000);
    } else {
        obj.timer = false;
        obj.timeout = false;
    }

    this.portDetectedCallbacks.push(obj);

    return obj;
};

PortHandler.portRemoved = function(name, code, timeout, ignoreTimeout) {
    var self = this;
    var obj = {
        'name' : name,
        'code' : code,
        'timeout' : (timeout) ? timeout : 10000
    };

    if (!ignoreTimeout) {
        obj.timer = setTimeout(function() {
            console.log('PortHandler - timeout - ' + obj.name);

            // trigger callback
            code(false);

            // remove object from array
            var index = self.portRemovedCallbacks.indexOf(obj);
            if (index > -1)
                self.portRemovedCallbacks.splice(index, 1);
        }, (timeout) ? timeout : 10000);
    } else {
        obj.timer = false;
        obj.timeout = false;
    }

    this.portRemovedCallbacks.push(obj);

    return obj;
};

// accepting single level array with "value" as key
PortHandler.arrayDifference = function(firstArray, secondArray) {
    var cloneArray = [];

    // create hardcopy
    for (var i = 0; i < firstArray.length; i++) {
        cloneArray.push(firstArray[i]);
    }

    for (var i = 0; i < secondArray.length; i++) {
        if (cloneArray.indexOf(secondArray[i]) != -1) {
            cloneArray.splice(cloneArray.indexOf(secondArray[i]), 1);
        }
    }

    return cloneArray;
};

PortHandler.flushCallbacks = function() {
    var killed = 0;

    for (var i = this.portDetectedCallbacks.length - 1; i >= 0; i--) {
        if (this.portDetectedCallbacks[i].timer)
            clearTimeout(this.portDetectedCallbacks[i].timer);
        this.portDetectedCallbacks.splice(i, 1);

        killed++;
    }

    for (var i = this.portRemovedCallbacks.length - 1; i >= 0; i--) {
        if (this.portRemovedCallbacks[i].timer)
            clearTimeout(this.portRemovedCallbacks[i].timer);
        this.portRemovedCallbacks.splice(i, 1);

        killed++;
    }

    return killed;
};
