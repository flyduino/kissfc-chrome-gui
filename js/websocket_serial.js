'use strict';

var KISS_WIFI_ADDRESS="192.168.4.1";

$.get("http://kiss.local/", function(data) {
    KISS_WIFI_ADDRESS="kiss.local";
    $("#wifi").attr("href", "http://kiss.local/");
})

var websocketSerial = {
    request:         null,
    bytesReceived:   0,
    bytesSent:       0,
    failed:          0,
    ws:                 null,
    transmitting:    false,
    outputBuffer:    [],
    closeCallback:   false,
    
    onConnect : function(self, socket) {
        self.ws = socket;
        self.ws.binaryType = 'arraybuffer';
        self.ws.onmessage = function (evt) { 
            var received_msg = evt.data;
              for (var i = (self.onReceive.listeners.length - 1); i >= 0; i--) {
                  self.onReceive.listeners[i]({data:evt.data}); 
              } 
        };
                
        self.ws.onclose = function() { 
               console.log("Connection is closed..."); 
               if (self.closeCallback) self.closeCallback({});
        };
        
        if (!self.request.canceled) {
            self.bytesReceived = 0;
            self.bytesSent = 0;
            self.failed = 0;
            self.request.fulfilled = true;
            self.onReceive.addListener(function logBytesReceived(info) {
                self.bytesReceived += info.data.byteLength;
                self.dump('->', info.data);
            });
            if (self.request.callback) self.request.callback({});
        } else if (self.request.canceled) {
           setTimeout(function initialization() {
                self.ws.close();
            }, 150);
        } 
    },

    connect: function (path, options, callback) {
        var self = this;
        var request = {
            path:           path,
            options:        options,
            callback:       callback,
            fulfilled:      false,
            canceled:       false,
            binary : false
        };
        self.request = request;
        var url = "ws://"+KISS_WIFI_ADDRESS+":81/";
        console.log("Connecting to " + url);
        var ws1 = new WebSocket(url);
            ws1.onopen = function() {
            self.onConnect(self, ws1);
        };
        ws1.onerror = function(e) {
            console.log("Connection ERROR occured");
            GUI.switchToConnect();
        };    
    },
    disconnect: function (callback) {
        var self = this;

        if (self.ws) {
            self.emptyOutputBuffer();
            // remove listeners
            for (var i = (self.onReceive.listeners.length - 1); i >= 0; i--) {
                self.onReceive.removeListener(self.onReceive.listeners[i]);
            }
            for (var i = (self.onReceiveError.listeners.length - 1); i >= 0; i--) {
                self.onReceiveError.removeListener(self.onReceiveError.listeners[i]);
            }
            self.closeCallback = callback;
            self.ws.close();

        } else {
            // connection wasn't opened, so we won't try to close anything
            // instead we will rise canceled flag which will prevent connect from continueing further after being canceled
            self.request.canceled = true;
        }
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
        var self = this;
        self.outputBuffer.push({'data': data, 'callback': callback});

        function send() {
            // store inside separate variables in case array gets destroyed
            var data = self.outputBuffer[0].data,
                callback = self.outputBuffer[0].callback;

            self.dump('<-', data);
            
            if (self.ws) {
                if (self.request.binary) {
                    self.ws.send(data, { binary: true });
                } else {
                    var str = self.bytesToHexString(data);
                    self.ws.send(str);
                }
                self.bytesSent += data.length; 
                if (callback) callback({});
                self.outputBuffer.shift();
                if (self.outputBuffer.length) {
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
        }
        if (!self.transmitting) {
            self.transmitting = true;
            send();
        }
    },
    onReceive: {
        listeners: [],
        addListener: function (functionReference) {
            this.listeners.push(functionReference);
        },
        removeListener: function (functionReference) {
            for (var i = (this.listeners.length - 1); i >= 0; i--) {
                if (this.listeners[i] == functionReference) {
                    this.listeners.splice(i, 1);
                    break;
                }
            }
        }
    },
    onReceiveError: {
        listeners: [],
        addListener: function (functionReference) {
            this.listeners.push(functionReference);
        },
        removeListener: function (functionReference) {
            for (var i = (this.listeners.length - 1); i >= 0; i--) {
                if (this.listeners[i] == functionReference) {
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
    bytesToHexString: function toHexString(data) {
        var view = new Uint8Array(data);
        var line = '';
        for (var i = 0; i < view.length; i++) line +=  this.byteToHex(view[i]);
        return line;
    },
    dump: function(direction, data) {
        /*var view = new Uint8Array(data);
        var line = '';
        for (var i = 0; i < view.length; i++) {
            if (i%16==0) {
                if (i>0) console.log(line);
                line=direction + ' ' + this.wordToHex(i) + ': ';
            }
            line +=  this.byteToHex(view[i]) + ' ';
         }
        console.log(line); */
    }
};