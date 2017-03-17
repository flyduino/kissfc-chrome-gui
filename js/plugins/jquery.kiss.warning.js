(function($) {
	var PLUGIN_NAME = 'kiss.warning',
        pluginData = function(obj) {
            return obj.data(PLUGIN_NAME);
        };

    var privateMethods = {
    		build : function(self) {
    			var data = pluginData(self);
    			var body = $(self).html();
    			$(self).html("");
    			$(self).hide();
    			var c = "";
    			c+='<div class="kiss-warning-inner">';
    	        c+='<div class="title">'+data.title+'</div>';
    	        c+='<div class="body">'+body;
    	        if (data.button!=='') {
    	            c+='<a class="button" href="#">'+data.button+'</a>';
    	        }
    	        c+='</div>';
    	        
    	        self.addClass('kiss-warning');
    	        self.append(c);
    	        $(".button", self).on("click", data.action);
    		}
    };

    var publicMethods = {
        init : function(options) {
            return this.each(function() {
                var self = $(this),
                    data = pluginData(self);
                if (!data) {
                    self.data(PLUGIN_NAME, $.extend(true, {
                    	title: 'WARNING!!!',
                    	button: '',
                    	action: function() {
                    	    self.hide();
                    	}
                    }, options));
                    data = pluginData(self);
                }
                privateMethods.build(self);
            });
        },
        destroy : function() {
            return this.each(function() {
                $(this).removeData(PLUGIN_NAME);
            });
        },
    };

    $.fn.kissWarning = function(method) {
        if (publicMethods[method]) {
            return publicMethods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return publicMethods.init.apply(this, arguments);
        } else {
            $.error('Method [' +  method + '] not available in $.kissWarning');
        }
    };
})(jQuery);