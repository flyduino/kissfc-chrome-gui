'use strict';

var androidOTGSerial = {
    request: null,
    connectionId: false,
    bitrate: 0,
    bytesReceived: 0,
    bytesSent: 0,
    failed: 0,

    transmitting: false,
    outputBuffer: [],

    request_permissions: function(success, error) {
        serial.requestPermission({
            vid: '0483',
            pid: '5740'
        }, success, function(message) {
            // Fallback to default serial ports
            serial.requestPermission(success, error);
        });
    },

    connect: function(path, options, callback) {
        var self = this;

        var request = {
            path: path,
            options: options,
            callback: callback,
            fulfilled: false,
            canceled: false
        };

        // expose request object reference to the serial layer so .disconnect routine can interact with the flags
        self.request = request;

        // Cordova options!
        var opts = {
            baudRate: request.options.bitrate,
            sleepOnPause: true
        }

        self.request_permissions(
            function success(message) {
                serial.open(opts, function success(message) {
                    console.log("Success: " + message);
                    if (!request.canceled) {
                        self.connectionId = 1;
                        self.bitrate = opts.bitrate;
                        self.bytesReceived = 0;
                        self.bytesSent = 0;
                        self.failed = 0;
                        request.fulfilled = true;

                        self.onReceive.addListener(function logBytesReceived(info) {
                            self.bytesReceived += info.data.byteLength;
                            console.log("logBytesReceived " + info.data.byteLength);
                        });

                        self.onReceiveError.addListener(function watchForOnReceiveErrors(info) {
                            console.error(info);
                        });

                        serial.registerReadCallback(
                            function success(data) {
                                var info = {
                                    connectionId: 1,
                                    data: data
                                };
                                self.onReceive.receiveData(info);
                            },
                            function error() {
                                new Error("Failed to register read callback");
                            });



                        var connectionInfo = {
                            connectionId: 1,
                            bitrate: opts.baudrate
                        }
                        console.log('SERIAL: Connection opened with ID: ' + connectionInfo.connectionId + ', Baud: ' + connectionInfo.bitrate);

                        if (request.callback) request.callback(connectionInfo);
                    } else if (connectionInfo && request.canceled) {
                        // connection opened, but this connect sequence was canceled
                        // we will disconnect without triggering any callbacks
                        console.log('SERIAL: Connection opened with ID: ' + connectionInfo.connectionId + ', but request was canceled, disconnecting');

                        // some bluetooth dongles/dongle drivers really doesn't like to be closed instantly, adding a small delay
                        //setTimeout(function initialization() {
                        //chrome.serial.disconnect(connectionInfo.connectionId, function (result) {
                        // TODO maybe we should do something?
                        //  });
                        //}, 150);
                    }
                }, function error(message) {
                    console.log("Error: " + message);
                    if (request.canceled) {
                        // connection didn't open and sequence was canceled, so we will do nothing
                        console.log('SERIAL: Connection didn\'t open and request was canceled');
                        // TODO maybe we should do something?
                    } else {
                        // connection didn't open and request was not canceled
                        console.log('SERIAL: Failed to open serial port');
                        if (request.callback) request.callback(false);
                    }
                });
                // Android
            },
            function error(message) {
                alert(message);
            }
        );



    },
    disconnect: function(callback) {
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
            serial.close(function success(message) {
                console.log('SERIAL: Connection with ID: ' + self.connectionId + ' closed, Sent: ' + self.bytesSent + ' bytes, Received: ' + self.bytesReceived + ' bytes');
                self.connectionId = false;
                self.bitrate = 0;
                if (callback) callback(true);
            }, function error(message) {
                console.log('SERIAL: Failed to close connection with ID: ' + self.connectionId + ' closed, Sent: ' + self.bytesSent + ' bytes, Received: ' + self.bytesReceived + ' bytes');
                self.connectionId = false;
                self.bitrate = 0;
                if (callback) callback(false);
            });
        } else {
            // connection wasn't opened, so we won't try to close anything
            // instead we will rise canceled flag which will prevent connect from continueing further after being canceled
            self.request.canceled = true;
        }
    },
    getDevices: function(callback) {
        var devices = [];
        devices.push("/dev/serial");
        callback(devices);
    },
    getInfo: function(callback) {
        if (callback) callback({});
    },
    getControlSignals: function(callback) {
        if (callback) callback({});
    },
    setControlSignals: function(signals, callback) {
        if (callback) callback({});
    },
    send: function(data, callback) {
        var self = this;
        self.outputBuffer.push({
            'data': data,
            'callback': callback
        });

        function send() {
            // store inside separate variables in case array gets destroyed
            var data = self.outputBuffer[0].data,
                callback = self.outputBuffer[0].callback;

            if (self.connectionId) {
                var buf = self.ab2string(data);
                serial.writeHex(buf, function success(message) {
                    // track sent bytes for statistics
                    var sendInfo = {
                            bytesSent: buf.length >> 1
                        } // Needed only for stats
                    console.log(sendInfo.bytesSent + " has been sent");
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
                }, function error(message) {
                    console.log("Error: " + message);
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

        addListener: function(functionReference) {
            this.listeners.push(functionReference);
        },
        removeListener: function(functionReference) {
            for (var i = (this.listeners.length - 1); i >= 0; i--) {
                if (this.listeners[i] == functionReference) {
                    this.listeners.splice(i, 1);
                    break;
                }
            }
        },
        receiveData: function(info) {
            if (info.data.byteLength > 0) {
                for (var i = (this.listeners.length - 1); i >= 0; i--) {
                    this.listeners[i](info);
                }
            }
        }
    },
    onReceiveError: {
        listeners: [],

        addListener: function(functionReference) {
            this.listeners.push(functionReference);
        },
        removeListener: function(functionReference) {
            for (var i = (this.listeners.length - 1); i >= 0; i--) {
                if (this.listeners[i] == functionReference) {
                    this.listeners.splice(i, 1);
                    break;
                }
            }
        },
        receiveError: function(data) {
            for (var i = (this.listeners.length - 1); i >= 0; i--) {
                this.listeners[i](data);
            }
        }
    },
    emptyOutputBuffer: function() {
        this.outputBuffer = [];
        this.transmitting = false;
    },
    ab2string: function(arr) {
        var ua = new Uint8Array(arr);
        var h = '';
        for (var i = 0; i < ua.length; i++) {
            var s = ua[i].toString(16);
            if (s.length == 1) s = '0' + s;
            h += s;
        }
        return h;
    }
};