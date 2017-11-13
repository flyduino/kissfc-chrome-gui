'use strict';

CONTENT.esc_flasher = {

};

var escFirmwares = [];
var escFirmwareMap = {};
var escDetected = "";

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
            var timeout = (actPage == (self.pages.length-1) ? 2000 : 100);
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
                            if (escDetected == "") {
                                escDetected = info.escInfo[i].type.replace(/\s/g, '').toUpperCase().trim();
                                console.log("Esc: " + escDetected);
                            }
                            var li = $("<li/>").html((i+1)+": " + info.escInfo[i].type + " " + info.escInfo[i].version + " "+$.i18n("text.sn")+" " + info.escInfo[i].SN);
                        } else {
                            var li = $("<li/>").html((i+1)+": --");
                        }
                        $("#escInfo").append(li);
                        if (kissProtocol.data[kissProtocol.GET_SETTINGS].ver>108) {
                            $(".escSettings tbody tr:nth-child("+(i+1)+")").show();
                            if (info.escInfo[i] !== undefined) {
                                if (info.escInfo[i].Settings[0] == 1) $(".direction").eq(i).prop("checked", true);
                                if (info.escInfo[i].Settings[1] == 1) $(".3d").eq(i).prop("checked", true);
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
        
        var selectedPort = String($('#port').val());
       
        if ((selectedPort == KISSFC_WIFI) || (selectedPort == ANDROID_OTG_SERIAL)) {
            $("#select_file").hide();
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
        
        $("#fw_version").on("change", function() {
            var asset = escFirmwareMap[$("#fc_type").val()][$(this).val()];
            $("#fw_notes").text(asset.info);
            $("#file_info").html("");
            $("#flash").hide();
            $("#status").hide();
        });
        
        $("#fc_type").on("change", function() {
            var value = escFirmwareMap[$(this).val()];
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
            var asset = escFirmwareMap[$("#fc_type").val()][$("#fw_version").val()];
            var url = asset.url;
            console.log("Loading "+ url);
            $("#file_info").html("");
            $("#flash").hide();
            $("#status").hide();
            
            $.get(url, function(intel_hex) {
                console.log("Loaded ESC hex file");
                self.pages = parseBootloaderHexFile(intel_hex);

                $("#loader2").hide();
                
                if (self.pages!==undefined) {
                    console.log("HEX OS OK " + self.pages.length + " blocks loaded");
                    $("#file_info").html($.i18n("text.esc-flasher-loaded", self.pages.length, url));
                    $("#flash").show();
                } else {
                    console.log("Corrupted esc firmware file");
                    $("#file_info").html($.i18n("text.esc-flasher-invalid-firmware"));
                    $("#flash").hide();
                }
            });
        });
        
        $("#download_file").on("click", function() {
           $("#file_info").html("");
           $("#flash").hide();
           escFirmwares = [];
           $("#remote_fw").hide();
           $("#loader1").show();
           loadGithubReleases("https://api.github.com/repos/flyduino/kissesc-firmware/releases", function(data) {
               $("#loader1").hide();
               console.log("DONE");
               console.log(data);
               $("#remote_fw").show();
               escFirmwareMap = {};
               $.each(data, function(index, release) {
                   console.log("Processing firmware: " + release.name);
                   $.each(release.assets, function(index2, asset) {
                       if (asset.name.endsWith(".hex")) {
                           console.log("Processing asset: " + asset.name);
                           var p = asset.name.indexOf("_");
                           var board = asset.name.substr(0, p).toUpperCase().trim();
                           console.log("Board: " + board);
                           if (escFirmwareMap[board]==undefined) {
                               escFirmwareMap[board] = [];
                           }
                           var file = {
                                   release: release.name,
                                   date: release.created_at,
                                   url: asset.browser_download_url,
                                   size: asset.size,
                                   info: release.body
                           }
                           escFirmwareMap[board].push(file);
                       }
                   });
                   $("#fc_type").empty();
                   $("#fw_version").empty();
                   
                   $.each(escFirmwareMap, function( board, assets ) {
                      var add = true;
                      if (escDetected != "" && board != escDetected) add = false; 
                      var escBoardNames = {
                              'KISS32A' : "Kiss Racing 32A ESC",
                              'KISS24A' : "Kiss Racing 24A ESC",
                              'KISS16A' : "Kiss AIOv2 ESC",
                              'KISS8A'  : "Kiss AIOv1 ESC"
                      };
                      if (add) $("#fc_type").append("<option value='"+board+"'>"+board+" - " +escBoardNames[board] + "</option>");
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
            
              $("#status").show().html("");
              $("#flash").addClass('disabled');
              $("#select_file").addClass('disabled');
              $("#download_file").addClass('disabled');
              $("#download_url").addClass('disabled');
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
                        $("#menu").hide();
                        $(".navigation-menu-button").hide(); // hide menu during flashing
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
            escDetected = "";
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