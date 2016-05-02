/**
 * To get started with your plugin rename file name from jquery.yuuri.yuuriPluginTemplate to jquery.yuuri.yourPluginName
 * and then in the file replace 'yuuriPluginTemplate' with yourPluginName.
 *
 * This is the template for the so called 'Boardplugin'. The board would be the page such as cashboard, dashboard, paymentsboard, goalsboard, etc.
 * (this template may be used for the 'normal' plugins as well, however this write up will treat it as a boardplugin)
 * The idea is to have all of the javascript tucked away in this plugin, sort of like a controller for the page.
 * All other plugins and dynamic elements would be registered with this main plugin, and the main plugin would listen to changes in other elements, and
 * notify the interested parties of those changes.
 * For example: cashboard plugin is listening to pagination plugin. Pagination plugin fires an event (starts with 'yjqp-' standing for yuuri jquery plugin),
 * and cashboard listens for that event, and once the event is caught, payment plugin is notified to change the page. Example of that is in the code below.
 * With this approach none of the elements (plugins) are tightly coupled and they can be even tested stand alone. None of the plugins should really know about the others,
 * except for the main board plugin.
 *
 * This template shows the basic structure to use when creating any plugin, not just board plugins.
 * There are privateMethods and publicMethods, and as usual private ones are accessible from within the plugin, and the public ones are
 * used to interact with the plugin.
 *
 * Thus, having a plugin named 'payments':
 *
 *    $('#idOfTheContainerForPaymentsToWhichThePluginIsAttached').payments({...});
 *
 *
 * and public method called 'value' would be called like this:
 *
 *
 *    $('#idOfTheContainerForPaymentsToWhichThePluginIsAttached').payments('value');
 *
 * same thing for setters:
 *
 *    $('#idOfTheContainerForPaymentsToWhichThePluginIsAttached').payments('updateValue', {...});
 *
 * Common functionality for most of the plugins would be combination of providing some dynamic value and receiving some value and refreshing the display.
 * So most likely there would be public methods such as:
 * 'value' to query the value
 * 'updateValue' to set new value
 * 'refresh' to rebuild the interface with new values
 *
 * Rest of the instructions are in the comments bellow marked with INFO, please remove them for real plugin.
 */
(function($) {
    // INFO: this is the unique identifier for the plugin under which key the data will be stored
    // so if the target element, div or input or whatever other element has more then one plugin, their data is
    // separated.
    var PLUGIN_NAME = 'yuuri.yuuriPluginTemplate',
    //  Always access the plugin data using function pluginData and passing the target element to which the plugin is attached:
    // var data = pluginData($('#idOfTheContainerForPaymentsToWhichThePluginIsAttached'));
        pluginData = function(obj) {
            return obj.data(PLUGIN_NAME);
        };

    // INFO: these are the private methods to use within the plugin.
    var privateMethods = {
    };

    var publicMethods = {
        // INFO: initialization method. If data is not defined, it is done here. All of the bindings are done here as well.
        init : function(options) {
            return this.each(function() {
                var self = $(this),
                    data = pluginData(self);

                if (!data) {
                    self.data(PLUGIN_NAME, $.extend(true, {
                    }, options));
                    data = pluginData(self);
                }

            });
        },
        destroy : function() {
            return this.each(function() {
                $(this).removeData(PLUGIN_NAME);
            });
        },
        // INFO: value, this is more for the element plugins
        value : function() {
            return pluginData($(this)).value;
        },
        // INFO: update value, this is more for the element plugins
        updateValue : function(newValue) {
            var data = pluginData($(this));

            //INFO: maybe we want all of it
            data.value = newValue;

            // or maybe specific stuff:
            data.value.val1 = newValue.something;
            data.value.val2 = newValue.oneMore;
        },
        // INFO: refresh, this is more for the element plugins
        refresh : function() {
            var data = pluginData($(this));

            // here we might want to just refresh the values
            $.byId(data.control1).val(data.value.val1);

            // or we might want to get stuff from server:
            $.post(data.url,
                data.value,
                function(result) {
                    if (result) {
                        // do something with the result
                    }
                }
            );

        }
    };

    $.fn.yuuriPluginTemplate = function(method) {
        if (publicMethods[method]) {
            return publicMethods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return publicMethods.init.apply(this, arguments);
        } else {
            $.error('Method [' +  method + '] not available in $.yuuriPluginTemplate');
        }
    };
})(jQuery);