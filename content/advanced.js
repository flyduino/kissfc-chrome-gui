'use strict';


var seriallookUpTable = ['KissProtocoll/OSD', 'Logger', 'Receiver', 'VTX', 'ESC TLM', 'Runcam', 'VTX  + ESC TLM'];


CONTENT.advanced = {
    USER_PIDs: [],
    PRESET_PIDs: [],
};

CONTENT.advanced.initialize = function (callback) {
    var self = this;
    var settingsFilled = 0;

    GUI.switchContent('advanced', function () {
        kissProtocol.send(kissProtocol.GET_SETTINGS, [0x30], function () {
            GUI.load("./content/advanced.html", function () {
                htmlLoaded(kissProtocol.data[kissProtocol.GET_SETTINGS]);
            });
        });
    });

    function htmlLoaded(data) {
        validateBounds('#content input[type="number"]');

        $('input[name="mahAlarm"]').val(data['mahAlarm']);

        $('input[name="DB0"]').val(+data['DB'][0]);
        $('input[name="DB1"]').val(+data['DB'][1]);
        $('input[name="DB2"]').val(+data['DB'][2]);

        if (data['motorBuzzer']) {
            $('input[name="motorBuzzer"]').prop('checked', 1);
        }
        if (data['ver'] >= 109) { // remove serial vtx from 109..
            $("select[name='loggerConfig'] option[value='11']").remove();
            if (data['loggerConfig'] > 10) {
                data['loggerConfig'] = 0; // osd!
            }
            if (data['reverseMotors'] == "1") {
                $('input[name="reverseMotors"]').prop('checked', 1);
            }
            if (data['adaptiveFilter'] == "1") {
                $('input[name="adaptiveFilter"]').prop('checked', 1);
            }
            $('input[name="ledBrightness"]').val(+data['ledBrightness']);
        } else {
            $("select[name='vtxType'] option[value='3']").remove(); // no unify on 108
            $("#reverseMotors").hide();
            $("#AdaptiveFilter").hide();
            $("#ledBrightness").hide();
        }
        if (data['ver'] >= 111 && (data['CopterType'] == 7 || data['CopterType'] == 8)) {
            $("#reverseMotorsTitle").removeAttr("data-i18n"); // needs to be done clean
            $("#reverseMotorsTitle").text("Foward Motors 3D use");
            $("#reverseMotorsText").removeAttr("data-i18n");
            $("#reverseMotorsText").text("Use Forward Motors for bidirectional thrust");
        }
        if (data['ver'] >= 111) {
            $('input[name="SID"]').removeAttr("disabled");
            $('input[name="SID"]').val(data['setpointIntoD']);
        }

        if (data['loggerConfig'] > 0 && data['loggerConfig'] < 11)
            $("#loggerDebug").show();
        else
            $("#loggerDebug").hide();

        $('select[name="loggerConfig"]').val(data['loggerConfig']);

        $('select[name="vtxType"]').val(data['vtxType']);
        $('input[name="vtxPowerLow"]').val(+data['vtxPowerLow']);
        $('input[name="vtxPowerHigh"]').val(+data['vtxPowerHigh']);

        $('select[name="loggerConfig"]').on('change', function () {
            var tmp = +$(this).val();
            if (tmp < 11) {
                if (tmp > 0) {
                    $("#loggerDebug").show();
                } else {
                    $("#loggerDebug").hide();
                }
                if (data['ver'] == 108) {
                    if ($("select[name='vtxType']").val() == "2") {
                        $("select[name='vtxType']").val("0").trigger("change");
                    }
                }
            } else {
                $("#loggerDebug").hide();
            }
        });

        $('input[name="CBO0"]').val(+data['CBO'][0]);
        $('input[name="CBO1"]').val(+data['CBO'][1]);
        $('input[name="CBO2"]').val(+data['CBO'][2]);

        var cbo = false;
        $('input[name="CBO"]').removeAttr("disabled");
        if (+data['CBO'][0] != 0 || +data['CBO'][1] != 0 || +data['CBO'][2] != 0) {
            cbo = true;
        }

        console.log("CBO=" + cbo);
        $('input[name="CBO"]').prop('checked', cbo);
        if (cbo) {
            $('input[name="CBO0"]').removeAttr("disabled");
            $('input[name="CBO1"]').removeAttr("disabled");
            $('input[name="CBO2"]').removeAttr("disabled");
        } else {
            $('input[name="CBO0"]').prop('disabled', 'true');
            $('input[name="CBO1"]').prop('disabled', 'true');
            $('input[name="CBO2"]').prop('disabled', 'true');
        }

        $('input[name="CBO"]').on('change', function () {
            if ($('input[name="CBO"]').prop('checked')) {
                $('input[name="CBO0"]').removeAttr("disabled");
                $('input[name="CBO1"]').removeAttr("disabled");
                $('input[name="CBO2"]').removeAttr("disabled");
            } else {
                $('input[name="CBO0"]').prop('disabled', 'true');
                $('input[name="CBO1"]').prop('disabled', 'true');
                $('input[name="CBO2"]').prop('disabled', 'true');
            }
        });

        for (var i = 0; i < 64; i++) {
            $("select[name='lapTimerTransponderId']").append("<option value='" + i + "'>" + ((i == 0) ? '--' : i) + "</option>");
        }

        $("select[name='vtxChannel']").val(data['vtxChannel']);

        $('input[name="NFE0"]').removeAttr("disabled");
        $('input[name="NFCF0"]').removeAttr("disabled");
        $('input[name="NFCO0"]').removeAttr("disabled");
        $('input[name="NFE1"]').removeAttr("disabled");
        $('input[name="NFCF1"]').removeAttr("disabled");
        $('input[name="NFCO1"]').removeAttr("disabled");
        $('input[name="YCF"]').removeAttr("disabled");

        if (data['NFE'][0] == 1) {
            $('input[name="NFE0"]').prop('checked', 1);
            $('input[name="NFCF0"]').removeAttr("disabled");
            $('input[name="NFCO0"]').removeAttr("disabled");
        } else {
            $('input[name="NFCF0"]').prop("disabled", true);
            $('input[name="NFCO0"]').prop("disabled", true);
        }
        if (data['NFE'][1] == 1) {
            $('input[name="NFE1"]').prop('checked', 1);
            $('input[name="NFCF1"]').removeAttr("disabled");
            $('input[name="NFCO1"]').removeAttr("disabled");
        } else {
            $('input[name="NFCF1"]').prop("disabled", true);
            $('input[name="NFCO1"]').prop("disabled", true);
        }

        $('input[name="NFCF0"]').val(data['NFCF'][0]);
        $('input[name="NFCO0"]').val(data['NFCO'][0]);
        $('input[name="NFCF1"]').val(data['NFCF'][1]);
        $('input[name="NFCO1"]').val(data['NFCO'][1]);

        $('input[name="NFE0"]').on("change", function () {
            if ($('input[name="NFE0"]').prop('checked')) {
                $('input[name="NFCF0"]').removeAttr("disabled");
                $('input[name="NFCO0"]').removeAttr("disabled");
            } else {
                $('input[name="NFCF0"]').prop("disabled", true);
                $('input[name="NFCO0"]').prop("disabled", true);
            }
        });

        $('input[name="NFE1"]').on("change", function () {
            if ($('input[name="NFE1"]').prop('checked')) {
                $('input[name="NFCF1"]').removeAttr("disabled");
                $('input[name="NFCO1"]').removeAttr("disabled");
            } else {
                $('input[name="NFCF1"]').prop("disabled", true);
                $('input[name="NFCO1"]').prop("disabled", true);
            }
        });

        if (data['YawCfilter']) $('input[name="YCF"]').val(data['YawCfilter']);

        $("#dialogSerial").hide(); // hide dialog by default
        

        if (data['ver'] >= 109) {
            if (data['ver'] >= 114) {
                document.getElementById('loopD').innerHTML = ""; // remove looptime on >=114
            } else {
                // TODO clean this up
                kissProtocol.send(kissProtocol.GET_INFO, [0x21], function () {
                    var info = kissProtocol.data[kissProtocol.GET_INFO];
                    var FCinfo = info.firmvareVersion.split(/-/g);
                    if ((info.firmvareVersion.indexOf("KISSFC") != -1 && FCinfo[0].length < 7) || (info.firmvareVersion.indexOf("KISSCC") != -1 && FCinfo[0].length < 7)) {
                        $("select[name='loopTimeDivider'] option[value='8']").remove();
                    }
                });

                $('select[name="loopTimeDivider"]').val(data['loopTimeDivider']);
                $('select[name="loopTimeDivider"]').removeAttr("disabled");
            }
            $('select[name="yawlpf"]').removeAttr("disabled");
            $('select[name="yawlpf"]').val(data['yawLpF']);
            $('select[name="mainlpf"]').removeAttr("disabled");
            $('select[name="mainlpf"]').val(data['LPF']);
            $('select[name="Dlpf"]').removeAttr("disabled");
            $('select[name="Dlpf"]').val(data['DLpF']);
        }

        $('select[name="lapTimerTypeAndInterface"]').on("change", function () {
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

        if (data['ver'] >= 115) {
            var serialsFoundAndFunctions = []; //initialize serial count
            $('#serialnew').css('display', 'inline-block'); //unhide serial section
            $('input[name="CSC"]').removeAttr("disabled"); //make checkbox changeable

            kissProtocol.send(kissProtocol.GET_INFO, [0x21], function () { //TODO make this nicer
                var info = kissProtocol.data[kissProtocol.GET_INFO];
                var FCinfo = info.firmvareVersion.split(/-/g);
                if (FCinfo[0].length < 7 || info.firmvareVersion.indexOf("KISSFC") == -1) {
                    if (data['SerialSetup'] != 39845888) {
                        $('input[name="CSC"]').prop('checked', 1);
                        genSerials();
                    }
                }
                if (FCinfo[0].length < 9 || info.firmvareVersion.indexOf("KISSFC") == -1) {
                    if (data['SerialSetup'] != 39845888) {
                        $('input[name="CSC"]').prop('checked', 1);
                        genSerials();
                    }
                }
                if (FCinfo[0] == 'KISSFCV2F7') {
                    if (data['SerialSetup'] != 33947648) {
                        $('input[name="CSC"]').prop('checked', 1);
                        genSerials();
                    }
                }
            });



            $("select[name='loggerConfig'] option[value='0']").html("disabled");
            document.getElementById('newserial').innerHTML = "";

            $('input[name="CSC"]').on('change', function () {
                if ($('input[name="CSC"]').prop('checked') ? 1 : 0 == 1) {
                    $("#dialogSerial").dialog();
                    genSerials();
                } else {
                    document.getElementById('newserial').innerHTML = "";
                    kissProtocol.send(kissProtocol.GET_INFO, [0x21], function () { //TODO make this nicer
                        var info = kissProtocol.data[kissProtocol.GET_INFO];
                        var FCinfo = info.firmvareVersion.split(/-/g);
                        if (FCinfo[0].length < 7 || info.firmvareVersion.indexOf("KISSFC") == -1) {
                            data['SerialSetup'] = 39845888;
                        }
                        if (FCinfo[0].length < 9 || info.firmvareVersion.indexOf("KISSFC") == -1) {
                            data['SerialSetup'] = 39845888;
                        }
                        if (FCinfo[0] == 'KISSFCV2F7') {
                            data['SerialSetup'] = 33947648;
                        }
                    });
                }

                //
            });

            function genSerials() {

                var serialNumber = 0;

                for (i = 0; i < 8; i++) {
                    if ((data['SerialPortAllowed'] >> (7 - i)) & 0x01) {
                        serialsFoundAndFunctions[i] = (data['SerialSetup'] >> (28 - (serialNumber * 4))) & 0x0F;
                        serialNumber++;
                    }
                }
                document.getElementById('newserial').innerHTML = "";

                for (var Serial in serialsFoundAndFunctions) {
                    var NewTR = document.createElement('dl');
                    var NewSerial = document.createElement('dt');
                    NewSerial.innerHTML = 'Serial ' + Serial
                    var SerialFunction = document.createElement('dd');
                    var NewSelect = document.createElement('select');
                    if ($('input[name="CSC"]').prop('checked') ? 1 : 0 == 1) {
                        NewSelect.disabled = false;
                    } else {
                        NewSelect.disabled = true;
                    }

                    NewSelect.id = 'serial_' + Serial;
                    NewSelect.onchange = function () {
                        serialsFoundAndFunctions[this.id.replace(/serial_/, '')] = this.value;
                        gen32BitValOutOfSerialFunctions()
                    }
                    for (i = 0; i < seriallookUpTable.length; i++) {
                        var newOption = document.createElement('option');
                        newOption.value = i;
                        newOption.innerHTML = seriallookUpTable[i]
                        if (i == serialsFoundAndFunctions[Serial])
                            newOption.setAttribute("selected", "selected");
                        NewSelect.appendChild(newOption);
                    }
                    SerialFunction.appendChild(NewSelect);
                    NewTR.appendChild(NewSerial);
                    NewTR.appendChild(SerialFunction);
                    document.getElementById('newserial').appendChild(NewTR);
                }
            }

            //genSerials();

            function gen32BitValOutOfSerialFunctions() {
                data['SerialSetup'] = 0;
                var bitShiftCounter = 28;
                for (var Serial in serialsFoundAndFunctions) {
                    data['SerialSetup'] += serialsFoundAndFunctions[Serial] << bitShiftCounter;
                    bitShiftCounter -= 4;
                }
                genSerials();
            }
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


        $('input[name="vbatAlarm"]').val(data['vbatAlarm']);

        $('#colorPicker').minicolors({
            format: 'rgb',
            change: function (value, opacity) {
                var rgb = value.slice(4, -1).replace(/\s+/g, '');
                var found = false;
                $('select[name="RGBSelector"] > option').each(function () {
                    if (this.value == rgb) {
                        $('select[name="RGBSelector"]').val(this.value);
                        found = true;
                    }
                });
                if (!found)
                    $('select[name="RGBSelector"]').val('');
                $('input[name="RGB"]').val(rgb);
            },
            hide: function () {

            },
            show: function () {

            }
        });
        var rgb = data['RGB'][0] + ',' + data['RGB'][1] + ',' + data['RGB'][2];
        $('input[name="RGB"]').val(rgb);
        $('#colorPicker').minicolors('value', {
            color: 'rgb(' + rgb + ')',
            opacity: 1,
            position: 'bottom right'
        });
        $('select[name="RGBSelector"] > option').each(function () {
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


        $('select[name="RGBSelector"]').on('change', function () {
            if (this.value !== '') {
                $('input[name="RGB"]').val(this.value);
            } else {
                // custom
                $('input[name="RGB"]').val('10,20,30');
            }
            var rgb = $('input[name="RGB"]').val();
            $('#colorPicker').minicolors('value', {
                color: 'rgb(' + rgb + ')',
                opacity: 1
            });
        });

        $('select[name="vtxType"]').on('change', function () {
            if (this.value == "0") {
                $(".vtx_opts").hide();
                if (data['ver'] == 108) {
                    if ($("#loggerConfig").val() == "11") {
                        $("#loggerConfig").val("0").trigger("change");
                    }
                }
            } else {
                if (data['ver'] == 108) {
                    if (this.value == "2") {
                        $("#loggerConfig").val("11").trigger("change");
                    } else {
                        $("#loggerConfig").val("0").trigger("change");
                    }
                }
                $(".vtx_opts").show();
            }
        });

        if (data.lipoConnected == 1) {
            $(".unsafe").addClass("unsafe_active");
        } else {
            $(".unsafe").removeClass("unsafe_active");
        }
        $(".unsafe_active").prop('disabled', true);

        $("input,select").on("change", function () {
            contentChange();
        });

        settingsFilled = 1;


        function grabData() {
            data['BoardRotation'] = 0;
            if ($('input[name="CBO"]').prop('checked') ? 1 : 0 == 1) {
                data['CBO'][0] = parseInt($('input[name="CBO0"]').val());
                data['CBO'][1] = parseInt($('input[name="CBO1"]').val());
                data['CBO'][2] = parseInt($('input[name="CBO2"]').val());
            } else {
                data['CBO'] = [0, 0, 0];
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

            data['NFE'][0] = $('input[name="NFE0"]').prop('checked') ? 1 : 0;
            data['NFCF'][0] = $('input[name="NFCF0"]').val();
            data['NFCO'][0] = $('input[name="NFCO0"]').val();
            data['NFE'][1] = $('input[name="NFE1"]').prop('checked') ? 1 : 0;
            data['NFCF'][1] = $('input[name="NFCF1"]').val();
            data['NFCO'][1] = $('input[name="NFCO1"]').val();

            data['YawCfilter'] = $('input[name="YCF"]').val();
            data['vtxType'] = parseInt($('select[name="vtxType"]').val());
            data['vtxPowerLow'] = $('input[name="vtxPowerLow"]').val();
            data['vtxPowerHigh'] = $('input[name="vtxPowerHigh"]').val();
            data['vtxChannel'] = parseInt($('select[name="vtxChannel"]').val());

            data['mahAlarm'] = parseInt($('input[name="mahAlarm"]').val());

            data['DB'][0] = parseInt($('input[name="DB0"]').val());
            data['DB'][1] = parseInt($('input[name="DB1"]').val());
            data['DB'][2] = parseInt($('input[name="DB2"]').val());

            data['loopTimeDivider'] = parseInt($('select[name="loopTimeDivider"]').val());
            data['yawLpF'] = parseInt($('select[name="yawlpf"]').val());
            data['DLpF'] = parseInt($('select[name="Dlpf"]').val());
            data['LPF'] = parseInt($('select[name="mainlpf"]').val());
            data['setpointIntoD'] = parseInt($('input[name="SID"]').val());

            if ($('input[name="motorBuzzer"]').prop('checked') ? 1 : 0 == 1) {
                data['motorBuzzer'] = 1;
            } else {
                data['motorBuzzer'] = 0;
            }

            if ($('input[name="reverseMotors"]').prop('checked') ? 1 : 0 == 1) {
                data['reverseMotors'] = 1;
            } else {
                data['reverseMotors'] = 0;
            }

            if ($('input[name="adaptiveFilter"]').prop('checked') ? 1 : 0 == 1) {
                data['adaptiveFilter'] = 1;
            } else {
                data['adaptiveFilter'] = 0;
            }
            data['ledBrightness'] = +$('input[name="ledBrightness"]').val();
        }

        function contentChange() {
            if (settingsFilled) {
                $('#save').addClass("saveAct");
            }
        }

        if (!data['isActive']) {
            $.ajax({
                url: 'http://ultraesc.de/KISSFC/getActivation/index.php?SN=' + MCUid + '&VER=' + data['ver'],
                cache: false,
                dataType: "text",
                success: function (key) {
                    console.log('Got activation code ' + key);
                    data['actKey'] = parseInt(key);
                },
                error: function () {
                    console.log('getting activation code failed');
                    data['actKey'] = 0;
                }

            });
        }


        $('#save').on('click', function () {
            grabData();
            $('#save').removeClass("saveAct");
            kissProtocol.send(kissProtocol.SET_SETTINGS, kissProtocol.preparePacket(kissProtocol.SET_SETTINGS, kissProtocol.data[kissProtocol.GET_SETTINGS]));
            if (!data['isActive']) {
                kissProtocol.send(kissProtocol.GET_SETTINGS, [0x30], function () {
                    GUI.load("./content/advanced.html", function () {
                        htmlLoaded(kissProtocol.data[kissProtocol.GET_SETTINGS]);
                    });
                });
            }
        });
    }
};

CONTENT.advanced.cleanup = function (callback) {
    if (callback)
        callback();
};
