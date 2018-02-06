'use strict';

CONTENT.fc_flasher = {

};

var fcFirmwares2 = [];
var fcFirmwareMap2 = {};
var BLOCK_SIZE = 2048;

var fcFlasherReadHandler =  function(info) {
    var self = CONTENT.fc_flasher;
    if (info.data.byteLength>0) {
        var view = new Uint8Array(info.data);
        if (self.rxState == 0) {
            if (view.length==5) {
                if (view[0]==81 && view[1]==255 && view[2]==255 && view[3]==125) {
                    if (view[4] != 0) self.flasherAvailable = true;
                }    
            }
        } else if (self.rxState == 1) { // receive page back
            for (var i=0; i<view.length; i++) self.receiveBuffer.push(view[i]);
            if (self.receiveBuffer.length >= (BLOCK_SIZE + 5)) {
                var matched = true;
                for (var i=0; i<(self.pages[self.curPage].length - 1); i++) {
                    if (self.pages[self.curPage][i] != self.receiveBuffer[i]) {
                        matched = false;
                        break;
                    }
                }
                if (self.receiveBuffer[BLOCK_SIZE + 5 -1] == 0) matched = false;
                if (matched) {
                    console.log("Packet accepted, lets flash it");
                    self.rxState = 2;
                    self.Write([81, 255, 255, 255, 0], 0);
                }
            }
        } else if (self.rxState == 2) {
            if (view.length==5) {
                if (view[0]==81 && view[1]==255 && view[2]==255 && view[3]==255 && view[4]!=0) {
                    if (self.retryTimeout!=null) clearTimeout(self.retryTimeout); 
                    self.curPage--;
                    self.retryCount = 0;
                    self.WritePage();
                }
            }    
        }
    }
}

CONTENT.fc_flasher.initialize = function(callback) {
    var self = this;
    self.receiveBuffer = [];
    self.pages = []; 
    self.curPage = 0;
    self.flasherAvailable = false;
    self.flashing = false;
    self.rxState = 0;
    self.timeout = null;
    self.retryCounter = 0;
    
    GUI.switchContent('fc_flasher', function() {
         GUI.load("./content/fc_flasher.html", htmlLoaded);
    });

    self.Write = function(data, offset) {
        var tmp = [];
        var i = offset;
        while (i<data.length && tmp.length<256) tmp.push(data[i++]);
        if (tmp.length > 0) {
            var bufferOut = new ArrayBuffer(tmp.length);
            var bufferView = new Uint8Array(bufferOut);
            bufferView.set(tmp);
            tmp = [];
            serialDevice.send(bufferOut, function(a) { 
                if (i<data.length) setTimeout(function() { self.Write(data, i) }, 50);
            });
        }
    }
    
    function alignHexBlocks(hex, blockSize) {
        var ret = [];
        if (hex.data.length > 0) {
            for (var block = 0; block<hex.data.length; block++) {
                var tailBytes = 0;
                if ((hex.data.length > 0) && ((block + 1) < hex.data.length))  tailBytes = hex.data[block + 1].address - hex.data[block].address - hex.data[block].data.length;
                ret.push.apply(ret, hex.data[block].data);
                for (var i=0; i<tailBytes; i++) ret.push(0xff);
            }
        }
        var oldSize = ret.length;
        var s = oldSize % blockSize;
        if (s > 0 && s < blockSize) {
            while (s < blockSize) { ret.push(0xff); s++ };
        }
        return ret;
    } 
    
    function parsePages(hex, blockSize) {
        self.pages = []
        var data = alignHexBlocks(self.parsed_hex, blockSize);
        for (var page=0; page<(data.length / blockSize); page++) {
            var flashBlock = []
            flashBlock.push(80); 
            flashBlock.push((page & 0xff));
            flashBlock.push((page>>8) & 0xff);
            flashBlock.push((page == ((data.length / blockSize)-1)) ? 0xff : 0);
            flashBlock = flashBlock.concat(data.slice(page * blockSize, (page + 1) * blockSize));
            flashBlock.push(0);
            self.pages.push(flashBlock);
        }
    }
    
    self.WritePage = function() {
        if (self.curPage < 0) {
            self.flashing = false;
            console.log('Done.');
            $("#status").html($.i18n("text.fc-flasher-success"));
            setTimeout(function() {
                $("#portArea").children().removeClass('flashing-in-progress');
                $("#menu").show();
                $(".navigation-menu-button").css('display','');
                $("li[data-name='configuration']").click();
            }, 3000);
            return;
        } else {
            self.receiveBuffer = [];
            self.flashing = true;
            var percentage = 100-100*(self.curPage/self.pages.length);
            $("#status").html($.i18n("text.fc-flasher-progress", Math.floor(percentage + 0.5)));
            self.rxState = 1;
            self.retryCount++;
            console.log("Flashing page " + (self.curPage + 1) + " retry " + self.retryCount);
            self.Write(self.pages[self.curPage], 0);
            self.retryTimeout = setTimeout(function() { 
                if (self.retryCount >= 3 ) {
                    console.log("Failed 3 times, aborting");
                    $("#status").html("FAILURE: No response from bootloader!");
                    resetUI();
                } else {
                    self.WritePage();
                }},  self.curPage == (self.pages.length-1) ? 5000 : 2000);
        }
    }
    
    function resetUI() {
        $("#flash").removeClass('disabled');
        $("#select_file").removeClass('disabled');
        $("#download_file").removeClass('disabled');
        $("#download_url").removeClass('disabled');
    }
   
    function htmlLoaded() {
        
        serialDevice.onReceive.removeListener(fcFlasherReadHandler);
        serialDevice.onReceive.addListener(fcFlasherReadHandler);
       
        var selectedPort = String($('#port').val());
       
        if ((selectedPort == KISSFC_WIFI) || (selectedPort == ANDROID_OTG_SERIAL)) {
            $("#select_file").hide();
        }
        
        $("#fw_version").on("change", function() {
            var asset = fcFirmwareMap2[$("#fc_type").val()][$(this).val()];
            $("#fw_notes").text(asset.info);
            $("#file_info").html("");
            $("#flash").hide();
            $("#status").hide();
        });
        
        $("#fc_type").on("change", function() {
            var value = fcFirmwareMap2[$(this).val()];
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
            var asset = fcFirmwareMap2[$("#fc_type").val()][$("#fw_version").val()];
            var url = asset.url;
            console.log("Loading "+ url);
            $("#file_info").html("");
            $("#flash").hide();
            $("#status").hide();
            
            $.get(url, function(intel_hex) {
                console.log("Loaded FC v2 hex file");
                self.parsed_hex = read_hex_file(intel_hex);

                $("#loader2").hide();
                if (self.parsed_hex) {
                    console.log("HEX OK " + self.parsed_hex.bytes_total + " bytes");
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
           fcFirmwares2 = [];
           $("#remote_fw").hide();
           $("#loader1").show();
           loadGithubReleases("https://api.github.com/repos/flyduino/kissfcv2-firmware/releases", function(data) {
               $("#loader1").hide();
               console.log("DONE");
               console.log(data);
               $("#remote_fw").show();
               fcFirmwareMap2 = {};
               $.each(data, function(index, release) {
                   console.log("Processing firmware: " + release.name);
                   $.each(release.assets, function(index2, asset) {
                       if (asset.name.endsWith(".hex")) {
                           console.log("Processing asset: " + asset.name);
                           var p = asset.name.indexOf("-");
                           var board = asset.name.substr(0, p).toUpperCase().trim();
                           console.log("Board: " + board);

                               if (fcFirmwareMap2[board]==undefined) {
                                   fcFirmwareMap2[board] = [];
                               }
                               var file = {
                                   release: release.name,
                                   date: release.created_at,
                                   url: asset.browser_download_url,
                                   size: asset.size,
                                   info: release.body
                               }
                               fcFirmwareMap2[board].push(file);
                       }
                   });
                   $("#fc_type").empty();
                   $("#fw_version").empty();
                   var fc2BoardNames = {
                           'KISSFCV2F7' : "Kiss FC v2 F7"
                   };
                   $.each(fcFirmwareMap2, function( board, assets ) {
                      var add = true;
                      if (add) $("#fc_type").append("<option value='"+board+"'>"+board+" - " +fc2BoardNames[board] + "</option>");
                   });
                   $("#fc_type").trigger("change");
               });
           })
           
        });
        
        $("#select_file").on("click", function() {
              if (!$(this).hasClass("disabled")) {
                  $("#status").html("");
                    chrome.fileSystem.chooseEntry({type: 'openFile', accepts: [{extensions: ['hex']}]}, function (fileEntry) {
                  if (chrome.runtime.lastError) {
                      console.error(chrome.runtime.lastError.message);
                      return;
                  }

                  chrome.fileSystem.getDisplayPath(fileEntry, function (path) {
                      console.log('Loading fc v2 firmware from: ' + path);
                      fileEntry.file(function (file) {
                          var reader = new FileReader();
                          reader.onprogress = function (e) {
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
                                      console.log("HEX OK " + self.parsed_hex.bytes_total + " bytes");
                                      $("#file_info").html($.i18n("text.fc-flasher-loaded", self.parsed_hex.bytes_total, path));
                                      $("#flash").show();
                                  } else {
                                      console.log("Corrupted firmware file");
                                      $("#file_info").html($.i18n("text.fc-flasher-invalid-firmware"));
                                      $("#flash").hide();
                                  }
                              }
                          }
                          reader.readAsText(file);
                      });
                  });
              });
              };
        });
        
        $("#flash").on("click", function() {
            if (!$(this).hasClass('disabled')) {
                
              self.flashing = false;
                
              // prepare data to flash 
              parsePages(self.parsed_hex, BLOCK_SIZE);
              
              console.log(self.pages);
            
              $("#status").show().html("");
              $("#flash").addClass('disabled');
              $("#select_file").addClass('disabled');
              $("#download_file").addClass('disabled');
              $("#download_url").addClass('disabled');

              self.flasherAvailable = false;
              
              console.log('Resetting FC...');
              self.Write([79, 72, 82, 69, 83, 69, 84], 0); // reset fc
              
              self.rxState = 0;
              console.log('Checking bootloader...');
              self.Write([81, 255, 255, 125, 0], 0);       // check bootloader
              
              console.log('Waiting for bootloader response');
              setTimeout(function() {
                    if (self.flasherAvailable) {
                        console.log("Bootloader available, lets flash");
                        $("#portArea").children().addClass('flashing-in-progress');
                        $("#menu").hide();
                        $(".navigation-menu-button").hide(); // hide menu during flashing
                        self.retryCount = 0;
                        self.curPage = self.pages.length - 1;
                        self.WritePage();       
                    } else {
                        console.log('got no answer. check your com port selection and see if you have the fc with bootloader.');
                        $("#status").html("FAILURE: No response from bootloader!");
                    }
              }, 2000); // wait for 2 sec
            }
        });
    };
}

CONTENT.fc_flasher.cleanup = function(callback) {
    console.log("cleanup flasher");
    serialDevice.onReceive.removeListener(fcFlasherReadHandler);
    if (callback) callback();
};