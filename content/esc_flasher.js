'use strict';

CONTENT.esc_flasher = {

};

CONTENT.esc_flasher.initialize = function(callback) {
    var self = this;
    
    self.pages = []; 
    self.flasherAvailable = false;

    if (GUI.activeContent != 'esc_flasher') {
        GUI.activeContent = 'esc_flasher';
    }

    $('#content').load("./content/esc_flasher.html", htmlLoaded);

	function Write(data) {
		var bufferOut = new ArrayBuffer(data.length);
    	var bufferView = new Uint8Array(bufferOut);
    	bufferView.set(data, 0);	
		serial.send(bufferOut, function(a) {
			console.log("Callback called");
			console.log(a);
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
			serial.disconnect();
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

    function htmlLoaded() {
    	
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
    	      $("#status").html("");
    		  $("#flash").addClass('disabled');
    		  $("#select_file").addClass('disabled');
    		  self.flasherAvailable = false;
			  console.log('Setting KISS FC to ESC write mode');
			  var flasherAvailable = false;
			  serial.onReceive.addListener(Read);
			  Write([65]);
			  console.log('Waiting for FC');
			  setTimeout(function() {
			  	  serial.onReceive.removeListener(Read);
			  	  if (self.flasherAvailable) {
			  	  	console.log("Flasher available, lets flash");
			  	  	$("#portArea").children().hide();
			  	    WritePage(self.pages.length-1);	   
			  	  } else {
			  	  	console.log('got no answer. check your com port selection and see if you have the lastest KISSFC version.');
			  	  	$("#status").html("FAILURE: No response from FC!");
			  	  }
			  }, 2000);
    		}
    	});
	};
}

CONTENT.esc_flasher.cleanup = function(callback) {
    if (callback) callback();
};