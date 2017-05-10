'use strict';

CONTENT.esc_flasher = {

};

CONTENT.esc_flasher.initialize = function(callback) {
    var self = this;
    
    self.pages = []; 
    self.flasherAvailable = false;
    self.pollEscInfo = false;

    GUI.switchContent('esc_flasher', function() {
         GUI.load("./content/esc_flasher.html", htmlLoaded);
    });

    function Write(data) {
        var bufferOut = new ArrayBuffer(data.length);
        var bufferView = new Uint8Array(bufferOut);
        bufferView.set(data, 0);    
        serialDevice.send(bufferOut, function(a) {
        
        });
    }
    
    function Read(info) {
        if (info.data.byteLength>0) {
            var view = new Uint8Array(info.data);
            self.flasherAvailable = (view[0]==65);
        }
    }

    function WritePage(actPage) {
        if (actPage < 0) {
            var startApp = [83, 83, 83];
            Write(startApp);
            console.log('done.');
            $("#status").html($.i18n("text.esc-flasher-success"));
            $(".esc-flasher-complete").show();
            serialDevice.disconnect();
            return;
        } else {
            var percentage = 100-100*(actPage/self.pages.length);
            $("#status").html($.i18n("text.esc-flasher-progress", Math.floor(percentage + 0.5)));
            console.log('Sending block ' + (actPage + 1));
            Write(self.pages[actPage]);
            var timeout = (actPage == (self.pages.length-1) ? 2000 : 500);
            setTimeout(function() { WritePage(actPage-1); }, timeout);
        }
    }
    
    function contentChange() {
        $('#save').addClass("saveAct");
    }

    function pollEscInfo() {
        if (self.pollEscInfo) {
            $("#escInfoDiv").show();
        
            kissProtocol.send(kissProtocol.GET_INFO, [0x21], function() {
                var info = kissProtocol.data[kissProtocol.GET_INFO];
                $("#escInfo").empty();
                if (info['escInfoCount'] === undefined || info['escInfoCount']==0) {
                    self.pollEscInfo = false;
                } else {
                    $("#escInfoDiv").show();
                    for (var i=0; i<info.escInfoCount; i++) {
                        if (info.escInfo[i] !== undefined) { 
                            var li = $("<li/>").html((i+1)+": "+$.i18n("text.firmware-version")+" " + info.escInfo[i].type + " " + info.escInfo[i].version + " "+$.i18n("text.sn")+" " + info.escInfo[i].SN);
                        } else {
                            var li = $("<li/>").html((i+1)+": --");
                        }
                        $("#escInfo").append(li);
                        if (kissProtocol.data[kissProtocol.GET_SETTINGS].ver>108) {
                            $(".escSettings tbody tr:nth-child("+(i+1)+")").show();
			    if (info.escInfo[i] !== undefined) {
				if(info.escInfo[i].Settings[0] == 1) $(".direction").eq(i).prop("checked", true);
				if(info.escInfo[i].Settings[1] == 1) $(".3d").eq(i).prop("checked", true);
			    }
                        }
                    }
                }
            });
        } 
       
    }

    function htmlLoaded() {

        var data = kissProtocol.data[kissProtocol.GET_SETTINGS];
        if (data.lipoConnected==1) {
            if (data.ver>108) {
                $("#escSettingsDiv").show();
            }
            $("#escInfoDiv").show();
        }
        
        $(".warning-button").on("click", function() {
            kissProtocol.send(kissProtocol.GET_SETTINGS, [0x30], function() {
                $(".esc-flasher-disclaimer").hide();
                var data = kissProtocol.data[kissProtocol.GET_SETTINGS];
                if (data.lipoConnected==1) {
                    kissProtocol.send(kissProtocol.ESC_INFO, [0x22], function() { self.pollEscInfo = true; pollEscInfo(); });
                }
            });
        });
    
        $(".esc-flasher-disclaimer").show();
        
        $("#select_file").on("click", function() {
              if (!$(this).hasClass("disabled")) {
                  $("#status").html("");
                    chrome.fileSystem.chooseEntry({type: 'openFile', accepts: [{extensions: ['hex']}]}, function (fileEntry) {
                  if (chrome.runtime.lastError) {
                      console.error(chrome.runtime.lastError.message);
                      return;
                  }

                  chrome.fileSystem.getDisplayPath(fileEntry, function (path) {
                      console.log('Loading esc firmware from: ' + path);
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
                                  
                                  self.pages = parseBootloaderHexFile(intel_hex);
                                     
                                  if (self.pages!==undefined) {
                                    console.log("HEX OS OK " + self.pages.length + " blocks loaded");
                                    $("#file_info").html($.i18n("text.esc-flasher-loaded", self.pages.length, path));
                                    $("#flash").show();
                                  } else {
                                      console.log("Corrupted esc firmware file");
                                    $("#file_info").html($.i18n("text.esc-flasher-invalid-firmware"));
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
              self.pollEscInfo = false;
              $("#status").html("");
              $("#flash").addClass('disabled');
              $("#select_file").addClass('disabled');
              self.flasherAvailable = false;
              console.log('Setting KISS FC to ESC write mode');
              var flasherAvailable = false;
              serialDevice.onReceive.addListener(Read);
              Write([65]);
              console.log('Waiting for FC');
              setTimeout(function() {
                    serialDevice.onReceive.removeListener(Read);
                    if (self.flasherAvailable) {
                        console.log("Flasher available, lets flash");
                        $("#portArea").children().addClass('flashing-in-progress');
                      WritePage(self.pages.length-1);       
                    } else {
                        console.log('got no answer. check your com port selection and see if you have the lastest KISSFC version.');
                        $("#status").html("FAILURE: No response from FC!");
                    }
              }, 3000);
            }
        });
        
        $("input[type=checkbox]").on("change", function() {
            contentChange();
        })
        
        if (GUI.activeContent == 'esc_flasher') {
            // TODO: May be give up after 2 * escCount seconds.
            if (data.lipoConnected==1) { setTimeout(function() { pollEscInfo(); }, 2000) }
        }
        
        $("#save").on("click", function() {
            var escSettings = [0x10, 0x20, 0x30, 0x40, 0x50, 0x60]; // Make CS complex
            $(".direction").each(function(motor, elm) {
                escSettings[motor] += $(elm).is(':checked') ? 1 : 0;
            });
            $(".3d").each(function(motor, elm) {
                escSettings[motor] += $(elm).is(':checked') ? 2 : 0;
            });
            var tmp = {
               'buffer' : new ArrayBuffer(6),
               'escSettings' : escSettings
            };
            $('#save').removeClass("saveAct");
            kissProtocol.send(kissProtocol.SET_ESC_SETTINGS, kissProtocol.preparePacket(kissProtocol.SET_ESC_SETTINGS, tmp)); 
        });

    };
}

CONTENT.esc_flasher.cleanup = function(callback) {
    if (callback) callback();
};