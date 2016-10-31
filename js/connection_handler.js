'use strict';

$(document).ready(function () {
    $('#portArea a.connect').click(function () {
        if (GUI.connectLock != true) {
            var clicks = $(this).data('clicks');
            var selectedPort = String($('#port').val());

            if (selectedPort != '0') {
                if (!clicks) {
                    console.log('Connecting to: ' + selectedPort);
                    GUI.connectingTo = selectedPort;

                    // lock port select while we are connecting / connected
                    $('#port').prop('disabled', true);
                    $('a.connect').text('Connecting');

                    serialDevice = getSerialDriverForPort(selectedPort);
                    
                    serialDevice.connect(selectedPort, {bitrate: 115200}, connected);
                } else {
                    GUI.timeoutKillAll();
                    GUI.intervalKillAll();
                    GUI.contentSwitchCleanup();
                    GUI.contentSwitchInProgress = false;

                    serialDevice.disconnect(disconnected);
                    kissProtocol.disconnectCleanup();

                    GUI.connectedTo = false;

                    // unlock port select
                    $('#port').prop('disabled', false);

                    // reset connect / disconnect button
                    $(this).text('Connect');
                    $(this).removeClass('active');

                    $('#navigation li:not([data-name="welcome"])').removeClass('unlocked');


                    if (GUI.activeContent != 'firmware') {
                        $('#content').empty();
                        // load welcome content
                        CONTENT.welcome.initialize();
                    }
                }

                $(this).data("clicks", !clicks);
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
            chrome.storage.local.get('lastUsedPort', function (result) {
                if (result.lastUsedPort) {
                    if (result.lastUsedPort != GUI.connectedTo) {
                        // last used port doesn't match the one found in local db, we will store the new one
                        chrome.storage.local.set({'lastUsedPort': GUI.connectedTo});
                    }
                } else {
                    // variable isn't stored yet, saving
                    chrome.storage.local.set({'lastUsedPort': GUI.connectedTo});
                }
            });
            }

            $('a.connect').text('Disconnect').addClass('active');

            // start reading
            serialDevice.onReceive.addListener(function (info) {
                kissProtocol.read(info);
            });

            CONTENT.configuration.initialize();

            // TODO disconnect after 10 seconds with error if we don't get valid data
            /*
            GUI.timeoutAdd('connecting', function () {
                console.log('Error: Config not received, closing connection...');

                $('a.connect').trigger('click');
            }, 10000);
            */

            // unlock navigation
            $('#navigation li').addClass('unlocked');
        } else {
            console.log('Failed to open serial port');

            $('a.connect').text('Connect');
            $('a.connect').removeClass('active');

            // unlock port select
            $('#port').prop('disabled', false);

            // reset data
            $('a.connect').data("clicks", false);
        }
    }

    function disconnected(result) {
        if (result) { // All went as expected
        } else { // Something went wrong
        }
    }
});