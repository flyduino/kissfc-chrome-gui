'use strict';

var usbDevices = {
    STM32DFU : {
        'vendorId' : 1155,
        'productId' : 57105
    }
};

var firmwares = [];
var firmwareMap = {};

var boardNames = {
        'KISSCC' : "Kiss AIO Flight ciontroller",
        'KISSFC' : "Kiss Flight controller"
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
                $("#navigation").show();
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
        $("a.navigation-menu-button").hide();
        $("#navigation").hide();
        checkDFU();
              
        $("#fw_version").on("change", function() {
            var asset = firmwareMap[$("#fc_type").val()][$(this).val()];
            $("#fw_notes").text(asset.info);
            $("#file_info").html("");
            $("#flash").hide();
            $("#status").hide();
        });
        
        $("#fc_type").on("change", function() {
            var value = firmwareMap[$(this).val()];
            console.log(value);
            $("#fw_version").empty();
            $.each(value, function( index, asset ) {
                $("#fw_version").append("<option value='"+index+"'>"+asset.release+" ("+ asset.size + " bytes)</option>");
            });
            $("#fw_version").trigger("change");
            $("#file_info").html("");
            $("#flash").hide();
            $("#status").hide();
        });
        
        $("#download_url").on("click", function() {
            $("#loader2").show();
            var asset = firmwareMap[$("#fc_type").val()][$("#fw_version").val()];
            var url = asset.url;
            console.log("Loading "+ url);
            $("#file_info").html("");
            $("#flash").hide();
            $("#status").hide();
            
            $.get(url, function(intel_hex) {
                self.parsed_hex = read_hex_file(intel_hex);
                $("#loader2").hide();

                if (self.parsed_hex) {
                    console.log("HEX OS OK " + self.parsed_hex.bytes_total + " bytes");
                    $("#file_info").html($.i18n("text.fc-flasher-loaded", self.parsed_hex.bytes_total, url));
                    $("#flash").show();
                } else {
                    console.log("Corrupted firmware file");
                    $("#file_info").html($.i18n("text.fc-flasher-invalid-firmware"));
                    $("#flash").hide();
                }
            });
        });
        
        $("#download_file").on("click", function() {
           $("#file_info").html("");
           $("#flash").hide();
           firmwares = [];
           $("#remote_fw").hide();
           $("#loader1").show();
           loadGithubReleases("https://api.github.com/repos/flyduino/kissfc-firmware/releases", function(data) {
               $("#loader1").hide();
               console.log("DONE");
               console.log(data);
               $("#remote_fw").show();
               firmwareMap = {};
               $.each(data, function(index, release) {
                   console.log("Processing firmware: " + release.name);
                   $.each(release.assets, function(index2, asset) {
                       if (asset.name.endsWith(".hex")) {
                           console.log("Processing asset: " + asset.name);
                           var p = asset.name.indexOf("-");
                           var board = asset.name.substr(0, p).toUpperCase().trim();
                           console.log("Board: " + board);
                           if (firmwareMap[board]==undefined) {
                               firmwareMap[board] = [];
                           }
                           var file = {
                                   release: release.name,
                                   date: release.created_at,
                                   url: asset.browser_download_url,
                                   size: asset.size,
                                   info: release.body
                           }
                           firmwareMap[board].push(file);
                       }
                   });
                   $("#fc_type").empty();
                   $("#fw_version").empty();
                   
                   $.each(firmwareMap, function( board, assets ) {
                      $("#fc_type").append("<option value='"+board+"'>"+board+" - " +boardNames[board] + "</option>");
                   });
                   $("#fc_type").trigger("change");
               });
           })
           
        });
        
        $("#select_file").on("click", function() {
            $("#remote_fw").hide();
            $("#file_info").html("");
            $("#flash").hide();
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
            };
        });

        $("#flash").on("click", function() {
            if (!$(this).hasClass('disabled')) {
                $("#portArea").children().addClass('flashing-in-progress');
                $("#status").show().html("");
                $("#flash").addClass('disabled');
                $("#select_file").addClass('disabled');
                $("#download_file").addClass('disabled');
                $("#download_url").addClass('disabled');
                
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
                            $("#download_file").removeClass('disabled');
                            $("#download_url").removeClass('disabled');
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
