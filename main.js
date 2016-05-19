'use strict';

$(document).ready(function () {
    PortHandler.initialize();
    CONTENT.welcome.initialize();

    $('#navigation li').click(function () {
        var self = this;
        var content = $(self).attr('data-name');

        function content_ready() {
            GUI.contentSwitchInProgress = false;
        }

        if ($(self).hasClass('unlocked') && GUI.activeContent != content) {
            GUI.contentSwitchInProgress = true;
            GUI.contentSwitchCleanup(function () {
                CONTENT[content].initialize();
            });
        }
    });
});

Number.prototype.clamp = function(min, max) {
    return Math.min(Math.max(this, min), max);
};