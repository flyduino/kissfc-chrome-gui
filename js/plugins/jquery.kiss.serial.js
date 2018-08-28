(function ($) {
    var PLUGIN_NAME = 'kiss.serial',
        pluginData = function (obj) {
            return obj.data(PLUGIN_NAME);
        };

    var privateMethods = {
        build: function (self) {
            var data = pluginData(self);
            var c = "";
            c += '<dt class="kiss-serial-function">Serial ' + data.name + '</dt>';
            c += '<dd class="kiss-serial-function">';

            c += '<select class="kiss-serial-mode unsafe">';
            c += '<option value="0" data-i18n="serialtype.0">KissProtocol/OSD</option>';
            c += '<option value="1" data-i18n="serialtype.1">Logger</option>';
            c += '<option value="2" data-i18n="serialtype.2">Receiver</option>';
            c += '<option value="3" data-i18n="serialtype.3">VTX</option>';
            c += '<option value="4" data-i18n="serialtype.4">ESC TLM</option>';
            c += '<option value="5" data-i18n="serialtype.5">Runcam</option>';
            c += '<option value="6" data-i18n="serialtype.5">VTX + ESC TLM</option>';
            c += '</select></dd>';
            self.append(c);

            $("select", self).on("change", function () {
                data.value = parseInt($(".kiss-serial-mode", self).val());
                privateMethods.changeModeState(self);
            });
            if (data.change !== undefined) $("select", self).on("change", data.change);
            privateMethods.changeValue(self);
        },
        changeValue: function (self) {
            var data = pluginData(self);
            if (data.value !== undefined) {
                $(".kiss-serial-mode", self).val(data.value);
                privateMethods.changeModeState(self);
            }
        },
        changeModeState: function (self) {
            var data = pluginData(self);
            if (data.value == 0xf) $(".kiss-serial-mode", self).hide();
            else $(".kiss-serial-mode", self).show();
        }
    };

    var publicMethods = {
        init: function (options) {
            return this.each(function () {
                var self = $(this),
                    data = pluginData(self);
                if (!data) {
                    self.data(PLUGIN_NAME, $.extend(true, {
                        name: '',
                        serial: 0,
                        value: 0
                    }, options));
                    data = pluginData(self);
                }
                privateMethods.build(self);

            });
        },
        destroy: function () {
            return this.each(function () {
                $(this).removeData(PLUGIN_NAME);
            });
        },
        value: function () {
            var self = $(this),
                data = pluginData(self);
            return data.value;
        },
        setValue: function (newValue) {
            var self = $(this);
            var data = pluginData(self);
            data.value = newValue;
            privateMethods.changeValue(self);
        },
    };

    $.fn.kissSerial = function (method) {
        if (publicMethods[method]) {
            return publicMethods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return publicMethods.init.apply(this, arguments);
        } else {
            $.error('Method [' + method + '] not available in $.kissSerial');
        }
    };
})(jQuery);