'use strict';

CONTENT.advanced = {
    USER_PIDs : [],
    PRESET_PIDs : [],
};

CONTENT.advanced.initialize = function(callback) {
    var self = this;

    GUI.switchContent('advanced', function() {
        kissProtocol.send(kissProtocol.GET_SETTINGS, [ 0x30 ], function() {
            $('#content').load("./content/advanced.html", function() {
                htmlLoaded(kissProtocol.data[kissProtocol.GET_SETTINGS]);
            });
        });
    });

    function htmlLoaded(data) {
        validateBounds('#content input[type="text"]');
        var settingsFilled = 0;

        if (data['ver'] > 102) {
            $('select[name="loggerConfig"]').removeAttr("disabled");
        }
        
        if (data['ver'] > 106) {
            $('#vtx').show();
            $('input[name="mahAlarm"]').val(data['mahAlarm']);
            $('input[name="mahAlarm"]').removeAttr("disabled");
            
        } else {
            $("select[name='loggerConfig'] option[value='11']").remove();
        }
   
        if (data['loggerConfig'] > 0 && data['loggerConfig'] < 11)
            $("#loggerDebug").show();
        else
            $("#loggerDebug").hide();

        $('select[name="loggerConfig"]').val(data['loggerConfig']);
        
        $('select[name="vtxType"]').val(data['vtxType']);
        $('input[name="vtxPowerLow"]').val(+data['vtxPowerLow']);
        $('input[name="vtxPowerHigh"]').val(+data['vtxPowerHigh']);
        
        $('select[name="loggerConfig"]').on('change', function() {
            if ((+$(this).val() > 0) && ( (+$(this).val() < 11))) {
                $("#loggerDebug").show();
                //$('#vtx').hide();
            }    
            else {
                $("#loggerDebug").hide();
                //if (data['ver'] > 106) {
                  //  if (+$(this).val() == 11) {
                        //$('#vtx').show();
                   // }
                //} 
            }
            contentChange();
        });

        $('input[name="CBO0"]').val(+data['CBO'][0]);
        $('input[name="CBO1"]').val(+data['CBO'][1]);
        $('input[name="CBO2"]').val(+data['CBO'][2]);
        $('input[name="CBO"]').on('change', function() {
            contentChange();
            if (parseInt($('input[name="CBO"]').prop('checked') ? 1 : 0) == 1) {
                $('input[name="CBO0"]').removeAttr("disabled");
                $('input[name="CBO1"]').removeAttr("disabled");
                $('input[name="CBO2"]').removeAttr("disabled");
            } else {
                $('input[name="CBO0"]').attr('disabled', 'true');
                $('input[name="CBO1"]').attr('disabled', 'true');
                $('input[name="CBO2"]').attr('disabled', 'true');
            }
        });
        var cbo = false;
        $('input[name="CBO"]').removeAttr("disabled");
        if (+data['CBO'][0] != 0 || +data['CBO'][1] != 0 || +data['CBO'][2] != 0) {
            cbo = true;
        }
        $('input[name="CBO"]').prop('checked', cbo);
        if (cbo) {
            $('input[name="CBO0"]').removeAttr("disabled");
            $('input[name="CBO1"]').removeAttr("disabled");
            $('input[name="CBO2"]').removeAttr("disabled");
        }

        /*
         * if (cbo) { document.body.style.overflow = "scroll"; }
         */

        for (var i = 0; i < 64; i++) {
            $("select[name='lapTimerTransponderId']").append("<option value='" + i + "'>" + ((i == 0) ? '--' : i) + "</option>");
        }

        if (data['ver'] > 102) {
            $("select[name='vtxChannel']").val(data['vtxChannel']);
        }
        
        if (data['ver'] > 104) {
            $('input[name="NFE"]').removeAttr("disabled");
            $('input[name="NFCF"]').removeAttr("disabled");
            $('input[name="NFCO"]').removeAttr("disabled");
            $('input[name="YCF"]').removeAttr("disabled");

            if (data['NotchFilterEnable']) {
                $('input[name="NFE"]').prop('checked', 1);
                $('input[name="NFCF"]').val(data['NotchFilterCenter']);
                $('input[name="NFCO"]').val(data['NotchFilterCut']);
            }

            if (data['YawCfilter']) $('input[name="YCF"]').val(data['YawCfilter']);
        }

        $('input[name^="lapTimer"]').on("change", function() {
            contentChange();
        });

        $('select[name="lapTimerTypeAndInterface"]').on("change", function() {
            if ($(this).val() == 0)
                $("select[name='lapTimerTransponderId']").hide();
            else
                $("select[name='lapTimerTransponderId']").show();
        });

        if (data.CopterType > 3) {
            if (data.lapTimerTypeAndInterface == 18 || data.lapTimerTypeAndInterface == 19) {
                data.lapTimerTypeAndInterface = 0;
            }
            $("select[name='lapTimerTypeAndInterface'] option[value='18']").remove();
            $("select[name='lapTimerTypeAndInterface'] option[value='19']").remove();
        }

        var MCUid = '';
        for (var i = 0; i < 4; i++) {
            if (data['SN'][i] < 16)
                MCUid += '0';
            MCUid += data['SN'][i].toString(16).toUpperCase();
        }
        MCUid += '-';
        for (var i = 4; i < 8; i++) {
            if (data['SN'][i] < 16)
                MCUid += '0';
            MCUid += data['SN'][i].toString(16).toUpperCase();
        }
        MCUid += '-';
        var SSID = 'KISS-';
        for (var i = 8; i < 12; i++) {
            if (data['SN'][i] < 16) {
                MCUid += '0';
                SSID += '0'
            }
            MCUid += data['SN'][i].toString(16).toUpperCase();
            SSID += data['SN'][i].toString(16).toUpperCase();
        }

        $(".ssid").text(SSID);
        $('select[name="lapTimerTransponderId"]').val(data.lapTimerTransponderId);
        $('select[name="lapTimerTypeAndInterface"]').val(data.lapTimerTypeAndInterface);

        if (data.lapTimerTypeAndInterface == 0) {
            $("select[name='lapTimerTransponderId']").hide();
        } else {
            $("select[name='lapTimerTransponderId']").show();
        }

        $('select[name="loggerDebugVariables"]').val(data['loggerDebugVariables']);

        $('select[name="loggerDebugVariables"]').on("change", function() {
            contentChange();
        });
        
        if (data['ver'] > 103) {

            $('input[name="vbatAlarm"]').val(data['vbatAlarm']);
            $('input[name="vbatAlarm"]').removeAttr("disabled");

            $('#colorPicker').minicolors({
                format : 'rgb',
                change : function(value, opacity) {
                    var rgb = value.slice(4, -1).replace(/\s+/g, '');
                    var found = false;
                    $('select[name="RGBSelector"] > option').each(function() {
                        if (this.value == rgb) {
                            $('select[name="RGBSelector"]').val(this.value);
                            found = true;
                        }
                    });
                    if (!found)
                        $('select[name="RGBSelector"]').val('');
                    $('input[name="RGB"]').val(rgb);
                    contentChange();
                },
                hide : function() {
                    console.log('Hide event triggered!');
                },
                show : function() {
                    console.log('Show event triggered!');
                }
            });
            var rgb = data['RGB'][0] + ',' + data['RGB'][1] + ',' + data['RGB'][2];
            $('input[name="RGB"]').val(rgb);
            $('#colorPicker').minicolors('value', {
                color : 'rgb(' + rgb + ')',
                opacity : 1,
                position : 'bottom right'
            });
            $('select[name="RGBSelector"] > option').each(function() {
                if (this.value == rgb) {
                    $('select[name="RGBSelector"]').val(this.value);
                }
            });
            $('select[name="RGBSelector"]').removeAttr("disabled");
            
            if (data['vtxType'] == 0) {
                $(".vtx_opts").hide();
            } else {
                $(".vtx_opts").show();
            }
        }

        $('select[name="RGBSelector"]').on('change', function() {
            if (this.value !== '') {
                $('input[name="RGB"]').val(this.value);
            } else {
                // custom
                $('input[name="RGB"]').val('10,20,30');
            }
            var rgb = $('input[name="RGB"]').val();
            $('#colorPicker').minicolors('value', {
                color : 'rgb(' + rgb + ')',
                opacity : 1
            });
            contentChange();
        });
        
        $('select[name="vtxType"]').on('change', function() {
            if (this.value == "0") {
               $(".vtx_opts").hide();
               if ($("#loggerConfig").val()=="11") {
                   $("#loggerConfig").val("0");
               }
            } else {
                if (this.value=="2") {
                    $("#loggerConfig").val("11");
                }
                $(".vtx_opts").show();
            }
        });
        
        if (data.lipoConnected==1) {
            $(".unsafe").prop('disabled', true).addClass("unsafe_active");
        } else {
            $(".unsafe").prop('disabled', false).removeClass("unsafe_active");
        }

        function grabData() {
            data['BoardRotation'] = 0;
            if ($('input[name="CBO"]').prop('checked') ? 1 : 0 == 1) {
                data['CBO'][0] = parseInt($('input[name="CBO0"]').val());
                data['CBO'][1] = parseInt($('input[name="CBO1"]').val());
                data['CBO'][2] = parseInt($('input[name="CBO2"]').val());
            } else {
                data['CBO'] = [ 0, 0, 0 ];
            }
            data['lapTimerTypeAndInterface'] = parseInt($('select[name="lapTimerTypeAndInterface"]').val());
            data['lapTimerTransponderId'] = parseInt($('select[name="lapTimerTransponderId"]').val());
            data['loggerDebugVariables'] = parseInt($('select[name="loggerDebugVariables"]').val());
            data['loggerConfig'] = parseInt($('select[name="loggerConfig"]').val());

            var rgb = $('input[name="RGB"]').val();
            if (rgb == '')
                rgb = '0,0,0';
            var rgbArray = rgb.split(',');
            data['RGB'][0] = parseInt(rgbArray[0]);
            data['RGB'][1] = parseInt(rgbArray[1]);
            data['RGB'][2] = parseInt(rgbArray[2]);

            data['vbatAlarm'] = parseFloat($('input[name="vbatAlarm"]').val());

            if ($('input[name="NFE"]').prop('checked') ? 1 : 0 == 1) {
                data['NotchFilterEnable'] = 1;
            } else {
                data['NotchFilterEnable'] = 0;
            }
            data['NotchFilterCenter'] = $('input[name="NFCF"]').val();
            data['NotchFilterCut'] = $('input[name="NFCO"]').val();

            data['YawCfilter'] = $('input[name="YCF"]').val();
            data['vtxType'] =  parseInt($('select[name="vtxType"]').val());
            data['vtxPowerLow'] = $('input[name="vtxPowerLow"]').val();
            data['vtxPowerHigh'] = $('input[name="vtxPowerHigh"]').val();
            data['vtxChannel'] =  parseInt($('select[name="vtxChannel"]').val());
            
            data['mahAlarm'] = parseInt($('input[name="mahAlarm"]').val());
        }
        settingsFilled = 1;

        function contentChange() {
            if (settingsFilled) {
                $('#save').addClass("saveAct");
            }
        }

        if (!data['isActive']) {
            $.ajax({
                url : 'http://ultraesc.de/KISSFC/getActivation/index.php?SN=' + MCUid + '&VER=' + data['ver'],
                cache : false,
                dataType : "text",
                success : function(key) {
                    console.log('Got activation code ' + key);
                    data['actKey'] = parseInt(key);
                },
                error : function() {
                    console.log('getting activation code failed');
                    data['actKey'] = 0;
                }

            });
        }

        $('#save').on('click', function() {
            grabData();
            $('#save').removeClass("saveAct");
            kissProtocol.send(kissProtocol.SET_SETTINGS, kissProtocol.preparePacket(kissProtocol.SET_SETTINGS, kissProtocol.data[kissProtocol.GET_SETTINGS]));
            if (!data['isActive']) {
                kissProtocol.send(kissProtocol.GET_SETTINGS, [ 0x30 ], function() {
                    $('#content').load("./content/advanced.html", function() {
                        htmlLoaded(kissProtocol.data[kissProtocol.GET_SETTINGS]);
                    });
                });
            }
        });

    }
};

CONTENT.advanced.cleanup = function(callback) {
    if (callback)
        callback();
};
