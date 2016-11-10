'use strict';

CONTENT.esc_flasher = {

};

CONTENT.esc_flasher.initialize = function(callback) {
    var self = this;
    
    self.pages = []; 
    self.flasherAvailable = false;
    self.pollEscInfo = false;

    GUI.switchContent('esc_flasher', function() {
         $('#content').load("./content/esc_flasher.html", htmlLoaded);
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
            $("#status").html("SUCCESS!");
            $(".esc-flasher-complete").show();
            serialDevice.disconnect();
            return;
        } else {
            var percentage = 100-100*(actPage/self.pages.length);
              $("#status").html("Progress: " + Math.floor(percentage + 0.5)+"%");
            console.log('Sending block ' + (actPage + 1));
            Write(self.pages[actPage]);
            var timeout = (actPage == (self.pages.length-1) ? 2000 : 500);
            setTimeout(function() { WritePage(actPage-1); }, timeout);
        }
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
                            var li = $("<li/>").html("#"+(i+1)+": Firmware Version: " + info.escInfo[i].type + " " + info.escInfo[i].version + " | S/N: " + info.escInfo[i].SN);
                        } else {
                            var li = $("<li/>").html("#"+(i+1)+": --");
                        }
                        $("#escInfo").append(li);
                    }
                }
            });
        } 
        if (GUI.activeContent == 'esc_flasher') {
            // TODO: May be give up after 2 * escCount seconds.
            setTimeout(function() { pollEscInfo(); }, 2000);
        }
    }

    function htmlLoaded() {
        $("#escInfoDiv").hide();
        
        $(".warning-button").on("click", function() {
            kissProtocol.send(kissProtocol.GET_SETTINGS, [0x30], function() {
                $(".esc-flasher-disclaimer").hide();
                if (kissProtocol.data[kissProtocol.GET_SETTINGS]['ver'] > 103) {
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
                                    $("#file_info").html("Loaded " +  self.pages.length + " blocks from " + path);
                                    $("#flash").show();
                                  } else {
                                      console.log("Corrupted esc firmware file");
                                    $("#file_info").html("Selected esc firmware file is not suitable for flashing");
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
    };
}

CONTENT.esc_flasher.cleanup = function(callback) {
    if (callback) callback();
};