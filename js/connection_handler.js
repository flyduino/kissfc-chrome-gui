'use strict';

$(document).ready(function() {
    $('#portArea a.connect').click(function() {
            var selectedPort = String($('#port').val());

            if (selectedPort != '0') {
                
                if ((selectedPort == KISSFC_WIFI) || (selectedPort == ANDROID_OTG_SERIAL)) {
                    $("li[data-name='esc_flasher']").hide();
                } else {
                    $("li[data-name='esc_flasher']").show();
                }
                
                if (selectedPort == KISSFC_WIFI) {
                    $("li[data-name='wifi']").show();
                } else {
                    $("li[data-name='wifi']").hide();
                }

                if (GUI.state == "CONNECT") {
                    GUI.switchToConnecting();
                    console.log('Connecting to: ' + selectedPort);
                    GUI.connectingTo = selectedPort;
                    serialDevice = getSerialDriverForPort(selectedPort);
                    serialDevice.connect(selectedPort, {
                        bitrate : 115200
                    }, connected);
                } else {
                    GUI.switchToConnect();
                    GUI.timeoutKillAll();
                    GUI.intervalKillAll();
                    GUI.contentSwitchCleanup();
                    GUI.contentSwitchInProgress = false;
                    kissProtocol.removePendingRequests();
                    serialDevice.disconnect(function() {
                        kissProtocol.disconnectCleanup();
                        disconnected();
                        GUI.connectedTo = false;
                        if (GUI.activeContent != 'firmware') {
                            $('#content').empty();
                            // load welcome content
                            CONTENT.welcome.initialize();
                        }
                    });
                }
            }
    });

    function connected(openInfo) {
        if (openInfo) {
            // update connectedTo
            GUI.connectedTo = GUI.connectingTo;

            // reset connectingTo
            GUI.connectingTo = false;

            // save selected port with chrome.storage if the port differs
            if (typeof chromeSerial !== 'undefined') {
                chrome.storage.local.get('lastUsedPort', function(result) {
                    if (result.lastUsedPort) {
                        if (result.lastUsedPort != GUI.connectedTo) {
                            // last used port doesn't match the one found in
                            // local db, we will store the new one
                            chrome.storage.local.set({
                                'lastUsedPort' : GUI.connectedTo
                            });
                        }
                    } else {
                        // variable isn't stored yet, saving
                        chrome.storage.local.set({
                            'lastUsedPort' : GUI.connectedTo
                        });
                    }
                });
            }

            GUI.switchToDisconnect();

            kissProtocol.init();

            // start reading
            serialDevice.onReceive.addListener(function(info) {
                kissProtocol.read(info);
            });

            CONTENT.configuration.initialize();
        } else {
            console.log('Failed to open serial port');

            GUI.switchToConnect();
        }
    }

    function disconnected(result) {
        if (result) { // All went as expected
        } else { // Something went wrong
        }
    }
});
