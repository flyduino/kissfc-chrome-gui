'use strict';

var MIN_CONFIG_VERSION = 108; // this gui can manage versions in this range
var MAX_CONFIG_VERSION = 108;

$(document).ready(function() {
    PortHandler.initialize();
    CONTENT.welcome.initialize();

    $('#navigation li').click(function() {
        var self = this;
        var content = $(self).attr('data-name');

        $("#navigation").removeClass("active-menu");

        function content_ready() {
            GUI.contentSwitchInProgress = false;
        }

        if ($(self).hasClass('unlocked') && GUI.activeContent != content) {
            GUI.contentSwitchInProgress = true;
            GUI.contentSwitchCleanup(function() {
                CONTENT[content].initialize();
            });
        }
    });

    $("#mobile-menu").on("click", function() {
        $(".layout-sidebar").toggleClass("visible");
        $(".layout-block").toggleClass("visible");
    });

    $(".layout-block").on("click", function() {
        $("#mobile-menu").click();
    });
});

Number.prototype.clamp = function(min, max) {
    return Math.min(Math.max(this, min), max);
};
