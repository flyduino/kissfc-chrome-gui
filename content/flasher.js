'use strict';

var usbDevices = {
    STM32DFU : {
        'vendorId' : 1155,
        'productId' : 57105
    }
};

CONTENT.flasher = {

};

CONTENT.flasher.initialize = function(callback) {
    var self = this;

    self.parsed_hex = false;

    GUI.switchContent('flasher', function() {
        GUI.load("./content/flasher.html", htmlLoaded);
    });

    function checkDFU() {
        chrome.usb.getDevices(usbDevices.STM32DFU, function(result) {
            if (result.length == 0) {
                $("#portArea").children().removeClass('flashing-in-progress');
                GUI.contentSwitchInProgress = true;
                GUI.contentSwitchCleanup(function() {
                    CONTENT['welcome'].initialize();
                });
            } else {
                if (GUI.activeContent == 'flasher')
                    setTimeout(checkDFU, 2000);
            }
        });
    }

    function htmlLoaded() {
        $("#portArea").children().addClass('flashing-in-progress');
        checkDFU();
        $("#select_file").on("click", function() {
            if (!$(this).hasClass("disabled")) {
                $("#status").html("");
                chrome.fileSystem.chooseEntry({
                    type : 'openFile',
                    accepts : [ {
                        extensions : [ 'hex' ]
                    } ]
                }, function(fileEntry) {
                    if (chrome.runtime.lastError) {
                        console.error(chrome.runtime.lastError.message);
                        return;
                    }

                    chrome.fileSystem.getDisplayPath(fileEntry, function(path) {
                        console.log('Loading firmware from: ' + path);
                        fileEntry.file(function(file) {
                            var reader = new FileReader();
                            reader.onprogress = function(e) {
                                if (e.total > 1048576) {
                                    console.log('File limit (1 MB) exceeded, aborting');
                                    reader.abort();
                                }
                            };
                            reader.onloadend = function(e) {
                                if (e.total != 0 && e.total == e.loaded) {
                                    console.log('File loaded');
                                    var intel_hex = e.target.result;
                                    self.parsed_hex = read_hex_file(intel_hex);

                                    if (self.parsed_hex) {
                                        console.log("HEX OS OK " + self.parsed_hex.bytes_total + " bytes");
                                        $("#file_info").html($.i18n("text.fc-flasher-loaded", self.parsed_hex.bytes_total, path));
                                        $("#flash").show();
                                    } else {
                                        console.log("Corrupted firmware file");
                                        $("#file_info").html($.i18n("text.fc-flasher-invalid-firmware"));
                                        $("#flash").hide();
                                    }
                                }
                            };
                            reader.readAsText(file);
                        });
                    });
                });
            }
            ;
        });

        $("#flash").on("click", function() {
            if (!$(this).hasClass('disabled')) {
                $("#portArea").children().addClass('flashing-in-progress');
                $("#status").html("");
                $("#flash").addClass('disabled');
                $("#select_file").addClass('disabled');
                $("#status").html("Removing device protection");
                self.success = false;
                STM32DFU.connect(usbDevices.STM32DFU, self.parsed_hex, {
                    read_unprotect : true,
                    event_handler : function(event) {
                    }
                }, function() {
                    $("#status").html($.i18n("text.fc-flasher-unprotect"));
                    setTimeout(function() {
                        $("#status").html($.i18n("text.fc-flasher-flashing")); //""Flashing the firmware");
                        self.success = false;
                        STM32DFU.connect(usbDevices.STM32DFU, self.parsed_hex, {
                            read_unprotect : false,
                            erase_chip : true,
                            event_handler : function(event) {
                                console.log(event);
                                if (event.type == "success") {
                                    $("#status").html($.i18n("text.fc-flasher-complete"));
                                } else if (event.type == "failure") {
                                    $("#status").html($.i18n("text.fc-flasher-failure", event.detail));
                                } else if (event.type == "progress") {
                                    $("#status").html($.i18n("text.fc-flasher-progress", Math.floor(event.detail + 0.5)));
                                }
                            }
                        }, function() {
                            $("#flash").removeClass('disabled');
                            $("#select_file").removeClass('disabled');
                        });
                    }, 5000);
                });
            }
        });
    }
    ;
}

CONTENT.flasher.resizeChart = function() {
}

CONTENT.flasher.cleanup = function(callback) {
    if (callback)
        callback();
};
