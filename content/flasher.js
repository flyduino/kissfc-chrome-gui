'use strict';

var usbDevices = {
	    STM32DFU: {'vendorId': 1155, 'productId': 57105}
};

CONTENT.flasher = {

};

CONTENT.flasher.initialize = function(callback) {
    var self = this;
    
    self.parsed_hex = false;

    if (GUI.activeContent != 'flasher') {
        GUI.activeContent = 'flasher';
    }

    $('#content').load("./content/flasher.html", htmlLoaded);

    function htmlLoaded() {

    	$("#select_file").on("click", function() {
    		  chrome.fileSystem.chooseEntry({type: 'openFile', accepts: [{extensions: ['hex']}]}, function (fileEntry) {
                  if (chrome.runtime.lastError) {
                      console.error(chrome.runtime.lastError.message);
                      return;
                  }

                  chrome.fileSystem.getDisplayPath(fileEntry, function (path) {
                      console.log('Loading firmware from: ' + path);
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
                                    	  console.log("HEX OS OK " + self.parsed_hex.bytes_total + " bytes");
                                         // $('a.flash').removeClass('disabled');

                                          //$('span.progressLabel').text('Loaded Local Firmware: (' + parsed_hex.bytes_total + ' bytes)');
                                      } else {
                                          //$('span.progressLabel').text(chrome.i18n.getMessage('firmwareFlasherHexCorrupted'));
                                    	  console.log("Corrupted firmware file");
                                      }
                         
                              }
                          };
                          reader.readAsText(file);
                      });
                  });
              });
    	});
    	
    	
    	$("#flash").on("click", function() {
    		  console.log("Removing device protection");
    		  STM32DFU.connect(usbDevices.STM32DFU, self.parsed_hex, {read_unprotect: true}, function() {
    			  console.log("Lets wait a bit for device reenumeration.");
    			  setTimeout(function() {
    				  console.log("Flashing");
        			  STM32DFU.connect(usbDevices.STM32DFU, self.parsed_hex, {read_unprotect: false, erase_chip: true});
    			  }, 3000);
    		  });
    	});
    }
 
};


CONTENT.flasher.resizeChart = function() {
}

CONTENT.flasher.cleanup = function(callback) {
    if (callback) callback();
};