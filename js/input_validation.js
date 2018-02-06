'use strict';

function validateBounds(selector) {
    var inputs = $(selector).not('.validation').not('.no_validation');
    inputs.each(function() {
        var input = $(this);
        input.addClass('validation');
    });


    // regular events
    inputs.on('keydown', function(e) {
        // whitelist all that we need for numeric control
        var whitelist = [ 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, // numpad
        // and
        // standard
        // number
        // keypad
        109, 189, // minus on numpad and in standard keyboard
        8, 46, 9, 44, 188, // backspace, delete, tab, coma
        190, 110, // decimal point
        37, 38, 39, 40, 13 // arrows and enter
        ];

        if (whitelist.indexOf(e.keyCode) == -1) {
            e.preventDefault();
        }
    });

    inputs.on('focus', function(e) {
        var element = $(this), val = element.val();

        if (!isNaN(val))
            element.data('previousValue', parseFloat(val));
    });

    inputs.on('blur', function(e) {
        var element = $(this), val = parseFloat(element.val()), precision = element.attr('data-precision');

        if (isNaN(val)) {
            val = element.data('previousValue');
            if (!isNaN(val)) {
                element.val(val);
            } else {
                return;
            }
        }

        if (precision) {
            element.val(val.toFixed(precision));
            // we could probably use an .trigger('input') here, with some smart
            // condition
        }
    });

    inputs.on('paste', function(e) {
        var element = $(this), val = parseFloat(e.originalEvent.clipboardData.getData('Text')), min = parseFloat(element.attr('min')), max = parseFloat(element.attr('max'));

        if (isNaN(val)) {
            element.val(element.data('previousValue'));
            e.preventDefault();
            return;
        }

        // only adjust minimal end if bound is set
        if (!isNaN(min)) {
            if (val < min) {
                element.val(min);
                e.preventDefault();
                return;
            }
        }

        // only adjust maximal end if bound is set
        if (!isNaN(max)) {
            if (val > max) {
                element.val(max);
                e.preventDefault();
                return;
            }
        }
    });

    inputs.on('input', function(e) {
        var element = $(this), val = parseFloat(element.val()), min = parseFloat(element.attr('min')), max = parseFloat(element.attr('max')), precision = parseInt(element.attr('data-precision'));

        if (isNaN(val)) {
            e.preventDefault();
            return false;
        }

        // only adjust minimal end if bound is set
        if (!isNaN(min)) {
            if (val < min) {
                element.val(min);
                val = min;
                return;
            }
        }

        // only adjust maximal end if bound is set
        if (!isNaN(max)) {
            if (val > max) {
                element.val(max);
                val = max;
                return;
            }
        }
    });
}
