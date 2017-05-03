/*
    Purpose behind the request object in the serial layer:
    Due to special condition that can happen -> user requests to connect but serial.connect is taking too long, so he clicks disconnect/cancel.
    In this case the disconnect routine would fail (since no connection is open), but even though that the UI is idle now, the .connect callback could fire
    since .connect routine finally managed to open the port. This would leave the app in a weird state since we didn't want to connect "anymore".

    Request object contains boolean canceled flag which will be raised when user clicks disconnect while connection didn't open.
    If user clicks on connect again, new request object will bre created in the .connect routine, and if port opens for the previous request, the sequence
    will be stopped due to the canceled flag being raised, and this connection will be automatatically closed in the background.

    The only remaining question that arises while using such approach is "what should we do when user wants to connect again to the same port while
    previous request didn't fulfill", if this becomes a problem in some specific case, ill have a look.
*/
'use strict';

var chromeSerial = {
    request:         null,
    connectionId:    false,
    bitrate:         0,
    bytesReceived:   0,
    bytesSent:       0,
    failed:          0,

    transmitting:    false,
    outputBuffer:    [],

    connect: function (path, options, callback) {
        var self = this;

        var request = {
            path:           path,
            options:        options,
            callback:       callback,
            fulfilled:      false,
            canceled:       false
        };

        // expose request object reference to the serial layer so .disconnect routine can interact with the flags
        self.request = request;

        chrome.serial.connect(request.path, request.options, function (connectionInfo) {
            if (chrome.runtime.lastError) {
                console.log(chrome.runtime.lastError.message);
            }

            if (connectionInfo && !request.canceled) {
                self.connectionId = connectionInfo.connectionId;
                self.bitrate = connectionInfo.bitrate;
                self.bytesReceived = 0;
                self.bytesSent = 0;
                self.failed = 0;
                request.fulfilled = true;

                self.onReceive.addListener(function logBytesReceived(info) {
                    self.bytesReceived += info.data.byteLength;
                    self.dump('->', info.data);
                });

                self.onReceiveError.addListener(function watchForOnReceiveErrors(info) {
                    console.log(info);

                    switch (info.error) {
                        case 'system_error': // we might be able to recover from this one
                            if (!self.failed++) {
                                chrome.serial.setPaused(self.connectionId, false, function () {
                                    self.getInfo(function (info) {
                                        if (info) {
                                            if (!info.paused) {
                                                console.log('SERIAL: Connection recovered from last onReceiveError');

                                                self.failed = 0;
                                            } else {
                                                console.log('SERIAL: Connection did not recover from last onReceiveError, disconnecting');

                                                if (GUI.connectedTo || GUI.connectingTo) {
                                                    $('a.connect').click();
                                                } else {
                                                    self.disconnect();
                                                }
                                            }
                                        } else {
                                            if (chrome.runtime.lastError) {
                                                console.log(chrome.runtime.lastError.message);
                                            }
                                        }
                                    });
                                });
                            }
                            break;
                        case 'timeout':
                            // TODO
                            break;
                        case 'device_lost':
                            // TODO
                            break;
                        case 'disconnected':
                            // TODO
                            break;
                    }
                });

                console.log('SERIAL: Connection opened with ID: ' + connectionInfo.connectionId + ', Baud: ' + connectionInfo.bitrate);

                if (request.callback) request.callback(connectionInfo);
            } else if (connectionInfo && request.canceled) {
                // connection opened, but this connect sequence was canceled
                // we will disconnect without triggering any callbacks
                console.log('SERIAL: Connection opened with ID: ' + connectionInfo.connectionId + ', but request was canceled, disconnecting');

                // some bluetooth dongles/dongle drivers really doesn't like to be closed instantly, adding a small delay
                setTimeout(function initialization() {
                    chrome.serial.disconnect(connectionInfo.connectionId, function (result) {
                        // TODO maybe we should do something?
                    });
                }, 150);
            } else if (!connectionInfo && request.canceled) {
                // connection didn't open and sequence was canceled, so we will do nothing
                console.log('SERIAL: Connection didn\'t open and request was canceled');
                // TODO maybe we should do something?
            } else {
                // connection didn't open and request was not canceled
                console.log('SERIAL: Failed to open serial port');
                if (request.callback) request.callback(false);
            }
        });
    },
    disconnect: function (callback) {
        var self = this;

        if (self.connectionId) {
            self.emptyOutputBuffer();

            // remove listeners
            for (var i = (self.onReceive.listeners.length - 1); i >= 0; i--) {
                self.onReceive.removeListener(self.onReceive.listeners[i]);
            }

            for (var i = (self.onReceiveError.listeners.length - 1); i >= 0; i--) {
                self.onReceiveError.removeListener(self.onReceiveError.listeners[i]);
            }

            chrome.serial.disconnect(self.connectionId, function (result) {
                if (chrome.runtime.lastError) {
                    console.log(chrome.runtime.lastError.message);
                }

                if (result) {
                    console.log('SERIAL: Connection with ID: ' + self.connectionId + ' closed, Sent: ' + self.bytesSent + ' bytes, Received: ' + self.bytesReceived + ' bytes');
                } else {
                    console.log('SERIAL: Failed to close connection with ID: ' + self.connectionId + ' closed, Sent: ' + self.bytesSent + ' bytes, Received: ' + self.bytesReceived + ' bytes');
                }

                self.connectionId = false;
                self.bitrate = 0;

                if (callback) callback(result);
            });
        } else {
            // connection wasn't opened, so we won't try to close anything
            // instead we will rise canceled flag which will prevent connect from continueing further after being canceled
            self.request.canceled = true;
        }
    },
    getDevices: function (callback) {
        chrome.serial.getDevices(function (devicesArray) {
            var devices = [];
            devicesArray.forEach(function (device) {
                devices.push(device.path);
            });

            callback(devices);
        });
    },
    getInfo: function (callback) {
        chrome.serial.getInfo(this.connectionId, callback);
    },
    getControlSignals: function (callback) {
        chrome.serial.getControlSignals(this.connectionId, callback);
    },
    setControlSignals: function (signals, callback) {
        chrome.serial.setControlSignals(this.connectionId, signals, callback);
    },
    send: function (data, callback) {
        var self = this;
        self.outputBuffer.push({'data': data, 'callback': callback});

        function send() {
            // store inside separate variables in case array gets destroyed
            var data = self.outputBuffer[0].data,
                callback = self.outputBuffer[0].callback;

            self.dump('<-', data);
            
            if (self.connectionId) {
                chrome.serial.send(self.connectionId, data, function (sendInfo) {
                    // track sent bytes for statistics
                    
                    if (typeof sendInfo !== 'undefined') {
                    
                        self.bytesSent += sendInfo.bytesSent;

                        // fire callback
                        if (callback) callback(sendInfo);

                        // remove data for current transmission form the buffer
                        self.outputBuffer.shift();

                        // if there is any data in the queue fire send immediately, otherwise stop trasmitting
                        if (self.outputBuffer.length) {
                            // keep the buffer withing reasonable limits
                            if (self.outputBuffer.length > 100) {
                                var counter = 0;

                                while (self.outputBuffer.length > 100) {
                                    self.outputBuffer.pop();
                                    counter++;
                                }

                                console.log('SERIAL: Send buffer overflowing, dropped: ' + counter + ' entries');
                            }

                            send();
                        } else {
                            self.transmitting = false;
                        }
                    }
                });
            }
        }

        if (!self.transmitting) {
            self.transmitting = true;
            send();
        }
    },
    onReceive: {
        listeners: [],

        addListener: function (functionReference) {
            chrome.serial.onReceive.addListener(functionReference);
            this.listeners.push(functionReference);
        },
        removeListener: function (functionReference) {
            for (var i = (this.listeners.length - 1); i >= 0; i--) {
                if (this.listeners[i] == functionReference) {
                    chrome.serial.onReceive.removeListener(functionReference);

                    this.listeners.splice(i, 1);
                    break;
                }
            }
        }
    },
    onReceiveError: {
        listeners: [],

        addListener: function (functionReference) {
            chrome.serial.onReceiveError.addListener(functionReference);
            this.listeners.push(functionReference);
        },
        removeListener: function (functionReference) {
            for (var i = (this.listeners.length - 1); i >= 0; i--) {
                if (this.listeners[i] == functionReference) {
                    chrome.serial.onReceiveError.removeListener(functionReference);

                    this.listeners.splice(i, 1);
                    break;
                }
            }
        }
    },
    emptyOutputBuffer: function () {
        this.outputBuffer = [];
        this.transmitting = false;
    },
    byteToHex: function(byte) {
        var hexChar = ["0", "1", "2", "3", "4", "5", "6", "7","8", "9", "A", "B", "C", "D", "E", "F"];
        return hexChar[(byte >> 4) & 0x0f] + hexChar[byte & 0x0f];
    },
    wordToHex: function(byte) {
        return this.byteToHex(byte>>8 & 0xff)+this.byteToHex(byte & 0xff);
    },
    dump: function(direction, data) {
       /* var view = new Uint8Array(data);
        var line = '';
        for (var i = 0; i < view.length; i++) {
            if (i%16==0) {
                if (i>0) console.log(line);
                line=direction + ' ' + this.wordToHex(i) + ': ';
            }
            line +=  this.byteToHex(view[i]) + ' ';
         }
        console.log(line);*/
    }
};