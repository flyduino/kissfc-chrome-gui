'use strict';

var CONTENT = {}; // filled by individual content js file

var GUI = {
    connectingTo : false,
    connectedTo : false,
    activeContent : null,
    contentSwitchInProgress : false,
    intervalArray : [],
    timeoutArray : [],
    state : "CONNECT"
};

GUI.intervalAdd = function(name, code, interval, first) {
    var data = {
        'name' : name,
        'timer' : null,
        'code' : code,
        'interval' : interval,
        'fired' : 0,
        'paused' : false
    };

    if (first == true) {
        code(); // execute code

        data.fired++; // increment counter
    }

    data.timer = setInterval(function() {
        code(); // execute code

        data.fired++; // increment counter
    }, interval);

    this.intervalArray.push(data); // push to primary interval array

    return data;
};

GUI.intervalRemove = function(name) {
    for (var i = 0; i < this.intervalArray.length; i++) {
        if (this.intervalArray[i].name == name) {
            clearInterval(this.intervalArray[i].timer); // stop timer

            this.intervalArray.splice(i, 1); // remove element/object from
            // array

            return true;
        }
    }

    return false;
};

GUI.intervalKillAll = function(keepArray) {
    var self = this;
    var timersKilled = 0;

    for (var i = (this.intervalArray.length - 1); i >= 0; i--) { // reverse
        // iteration
        var keep = false;
        if (keepArray) { // only run through the array if it exists
            keepArray.forEach(function(name) {
                if (self.intervalArray[i].name == name) {
                    keep = true;
                }
            });
        }

        if (!keep) {
            clearInterval(this.intervalArray[i].timer); // stop timer

            this.intervalArray.splice(i, 1); // remove element/object from
            // array

            timersKilled++;
        }
    }

    return timersKilled;
};

GUI.timeoutAdd = function(name, code, timeout) {
    var self = this;
    var data = {
        'name' : name,
        'timer' : null,
        'timeout' : timeout
    };

    // start timer with "cleaning" callback
    data.timer = setTimeout(function() {
        code(); // execute code

        // remove object from array
        var index = self.timeoutArray.indexOf(data);
        if (index > -1)
            self.timeoutArray.splice(index, 1);
    }, timeout);

    this.timeoutArray.push(data); // push to primary timeout array

    return data;
};

GUI.timeoutRemove = function(name) {
    for (var i = 0; i < this.timeoutArray.length; i++) {
        if (this.timeoutArray[i].name == name) {
            clearTimeout(this.timeoutArray[i].timer); // stop timer

            this.timeoutArray.splice(i, 1); // remove element/object from array

            return true;
        }
    }

    return false;
};

GUI.timeoutKillAll = function() {
    var timersKilled = 0;

    for (var i = 0; i < this.timeoutArray.length; i++) {
        clearTimeout(this.timeoutArray[i].timer); // stop timer

        timersKilled++;
    }

    this.timeoutArray = []; // drop objects

    return timersKilled;
};

GUI.contentSwitchCleanup = function(callback) {
    GUI.intervalKillAll(); // all intervals (mostly data pulling) needs to be
    // removed on tab switch

    CONTENT[this.activeContent].cleanup(callback);
};

GUI.switchContent = function(newContent, callback) {
    if (GUI.activeContent != newContent) {
        console.log('Switching content to ' + newContent);
        
        $('#navigation li').removeClass('selected');
        $("#navigation li[data-name='"+newContent+"']").addClass('selected')
        
        GUI.activeContent = newContent;
        kissProtocol.clearPendingRequests(function() {
            callback();
        });
    } else {
        callback();
    }
}

GUI.load = function(url, callback) {
    $('#content').animate({
        scrollTop: 0
    }, 700);
    $('#content').load(url, function() {
 
        callback();
        $("*", "#content").i18n();
    });
}

GUI.switchToConnect = function() {
    // set button to connect
    // unlock port select
    $('#port').prop('disabled', false);
    $('a.connect').text($.i18n('menu.connect'));
    $('a.connect').removeClass('active');
    $('#navigation li:not([data-name="welcome"])').removeClass('unlocked');
    $('#navigation').show();
    GUI.state = "CONNECT";
}

GUI.switchToConnecting = function() {
    // set button to connecting
    $('#port').prop('disabled', true);
    $('a.connect').text($.i18n("menu.connecting"));
    GUI.state = "CONNECTING";
}

GUI.switchToDisconnect = function() {
    // set button to disconnect
    $('a.connect').text($.i18n("menu.disconnect")).addClass('active');
    $('#navigation li').addClass('unlocked');
    GUI.state = "DISCONNECT";
}
