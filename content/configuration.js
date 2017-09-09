'use strict';

CONTENT.configuration = {
    USER_PIDs: [],
    PRESET_PIDs: [],
};

CONTENT.configuration.initialize = function(callback) {
    var self = this;

    GUI.switchContent('configuration', function() {
         kissProtocol.send(kissProtocol.GET_SETTINGS, [0x30], function() {
            GUI.load("./content/configuration.html", function() {
                  htmlLoaded(kissProtocol.data[kissProtocol.GET_SETTINGS])
            });
        });
     });

    function copyTextToClipboard(text) {
        var copyFrom = $('<textarea/>');
        copyFrom.text(text);
        $('body').append(copyFrom);
        copyFrom.select();
        document.execCommand('copy');
        copyFrom.remove();
    }

    function backupConfig() {
        var chosenFileEntry = null;

        var accepts = [{
            extensions: ['txt']
        }];

        chrome.fileSystem.chooseEntry({
            type: 'saveFile',
            suggestedName: 'kissfc-backup',
            accepts: accepts
        }, function(fileEntry) {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                return;
            }

            if (!fileEntry) {
                console.log('No file selected.');
                return;
            }

            chosenFileEntry = fileEntry;

            chrome.fileSystem.getDisplayPath(chosenFileEntry, function(path) {
                console.log('Export to file: ' + path);
            });

            chrome.fileSystem.getWritableEntry(chosenFileEntry, function(fileEntryWritable) {

                chrome.fileSystem.isWritableEntry(fileEntryWritable, function(isWritable) {
                    if (isWritable) {
                        chosenFileEntry = fileEntryWritable;
                        var config = kissProtocol.data[kissProtocol.GET_SETTINGS];
                        var json = JSON.stringify(config, function(k, v) {
                            if (k === 'buffer' || k === 'isActive' || k === 'actKey' || k === 'SN') {
                                return undefined;
                            } else {
                                return v;
                            }
                        });
                        var blob = new Blob([json], {
                            type: 'text/plain'
                        });

                        chosenFileEntry.createWriter(function(writer) {
                            writer.onerror = function(e) {
                                console.error(e);
                            };

                            var truncated = false;
                            writer.onwriteend = function() {
                                if (!truncated) {
                                    truncated = true;
                                    writer.truncate(blob.size);
                                    return;
                                }
                                console.log('Config has been exported');
                            };

                            writer.write(blob);
                        }, function(e) {
                            console.error(e);
                        });
                    } else {
                        console.log('Cannot write to read only file.');
                    }
                });
            });
        });
    };

    function restoreConfig(callback) {
        var chosenFileEntry = null;

        var accepts = [{
            extensions: ['txt']
        }];

        chrome.fileSystem.chooseEntry({
            type: 'openFile',
            accepts: accepts
        }, function(fileEntry) {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                return;
            }

            if (!fileEntry) {
                console.log('No file selected, restore aborted.');
                return;
            }

            chosenFileEntry = fileEntry;

            chrome.fileSystem.getDisplayPath(chosenFileEntry, function(path) {
                console.log('Import config from: ' + path);
            });

            chosenFileEntry.file(function(file) {
                var reader = new FileReader();

                reader.onprogress = function(e) {
                    if (e.total > 4096) {
                        console.log('File limit (4 KB) exceeded, aborting');
                        reader.abort();
                    }
                };

                reader.onloadend = function(e) {
                    if (e.total != 0 && e.total == e.loaded) {
                        console.log('Read OK');
                        try {
                            var json = JSON.parse(e.target.result);
                            if (callback) callback(json);
                        } catch (e) {
                            console.log('Wrong file');
                            return;
                        }
                    }
                };
                reader.readAsText(file);
            });
        });
    };

    function htmlLoaded(data) {
        validateBounds('#content input[type="number"]');
        var settingsFilled = 0;
        
        console.log("RECEIVED:");
        console.log(data);


        $('input[name="3dMode"]').removeAttr("disabled");
        
            kissProtocol.send(kissProtocol.GET_INFO, [0x21], function() {
                var info = kissProtocol.data[kissProtocol.GET_INFO];
                $('#version').text(info.firmvareVersion);
            });


            document.getElementById('ppmadd1').style.display = "inline";
            document.getElementById('ppmadd2').style.display = "inline";
            document.getElementById('mpxSRXL').style.display = "inline";
        

            document.getElementById('jrxbusb').style.display = "inline";
        
        if (data['vtxType']==0) {
            $('#aux5').hide();
            $('#aux6').hide();
            $('#aux7').hide();
        }
        if (data['ver'] < 109){
            $("select[name='outputMode'] option[value='6']").remove();
            $("select[name='outputMode'] option[value='7']").remove();
            $("select[name='lpf'] option[value='7']").remove();
        } else {
		kissProtocol.send(kissProtocol.GET_INFO, [0x21], function(){
			var info = kissProtocol.data[kissProtocol.GET_INFO];
			var FCinfo = info.firmvareVersion.split(/-/g);

			if(FCinfo[0].length < 7 || info.firmvareVersion.indexOf("KISSFC") == -1){
				$("select[name='outputMode'] option[value='6']").remove();
			}
			if(FCinfo[0].length < 9 || info.firmvareVersion.indexOf("KISSFC") == -1){
				$("select[name='outputMode'] option[value='7']").remove();
			}
			if (FCinfo[0]=='KISSFCV2F7') {
			    $("li[data-name='fc_flasher']").show();
			} else {
			    $("li[data-name='fc_flasher']").remove();
			}
		});
	}
        
        var MCUid = '';
        for (var i = 0; i < 4; i++) {
            if (data['SN'][i] < 16) MCUid += '0';
            MCUid += data['SN'][i].toString(16).toUpperCase();
        }
        MCUid += '-';
        for (var i = 4; i < 8; i++) {
            if (data['SN'][i] < 16) MCUid += '0';
            MCUid += data['SN'][i].toString(16).toUpperCase();
        }
        MCUid += '-';
        for (var i = 8; i < 12; i++) {
            if (data['SN'][i] < 16) MCUid += '0';
            MCUid += data['SN'][i].toString(16).toUpperCase();
        }

        var sntext = MCUid + ' (' + (data['isActive'] ? $.i18n('text.activated') : $.i18n('text.not-activated')) + ')';
        $('#SN').text(sntext);
        $('#SN2').text($.i18n("text.serial-number")+": " + MCUid);

        $('#SN').on('click', function(e) {
            copyTextToClipboard(MCUid);
            $('#SN').text($.i18n("text.serial-clipboard"));
            setTimeout(function() {
                $('#SN').text(sntext);
            }, 1000);
        });

        var mixerList = [{
            name: $.i18n("mixer.0")
        }, {
            name: $.i18n("mixer.1")
        }, {
            name: $.i18n("mixer.2")
        }, {
            name: $.i18n("mixer.3")
        }, {
            name: $.i18n("mixer.4")
        }, {
            name: $.i18n("mixer.5")
        }, {
            name: $.i18n("mixer.6")
        }];

        var mixer_list_e = $('select.mixer');
        for (var i = 0; i < mixerList.length; i++) {
            mixer_list_e.append('<option data-i18n="mixer.'+(i)+'" value="' + (i) + '">' + mixerList[i].name + '</option>');
        }

        mixer_list_e.on('change', function() {
            var val = parseInt($(this).val());
            contentChange();
            if (val==0) $(".tricopter").show(); else $(".tricopter").hide();
            $('.mixerPreview img').attr('src', './images/mixer/' + val +(data['reverseMotors']==0?'':'inv')+".png");
        });

        // apply configuration values to GUI elements
        // uav type and receiver
        mixer_list_e.val(data['CopterType']).change();
        $('.rxType').val(data['RXType']);

        $('.rxType').on('change', function() {
            contentChange();
        });

        // general settings
        $('input[name="minThrottle"]').val(data['MinThrottle16']);
        $('input[name="minThrottle"]').on('input', function() {
            contentChange();
        });
        $('input[name="maxThrottle"]').val(data['MaxThrottle16']);
        $('input[name="maxThrottle"]').on('input', function() {
            contentChange();
        });
        $('input[name="minCommand"]').val(data['MinCommand16']);
        $('input[name="minCommand"]').on('input', function() {
            contentChange();
        });
        $('input[name="midCommand"]').val(data['MidCommand16']);
        $('input[name="midCommand"]').on('input', function() {
            contentChange();
        });
        $('input[name="TYmid"]').val(data['TYmid16']);
        $('input[name="TYmid"]').on('input', function() {
            contentChange();
        });
        $('input[name="TYinv"]').prop('checked', data['TYinv8']);
        $('input[name="TYinv"]').on('input', function() {
            contentChange();
        });
        
        var outputMode = data['ESConeshot125'];

            $("#outputMode").val(outputMode);       
            $("#outputMode").on('change', function() {
                contentChange();
            });  
        

        $('input[name="failsaveseconds"]').val(data['failsaveseconds']);
        $('input[name="failsaveseconds"]').on('input', function() {
            contentChange();
        });


        $('input[name="3dMode"]').prop('checked', data['Active3DMode']);
        if (data['Active3DMode']) $("#aux4").show(); else $("#aux4").hide();
        $('input[name="3dMode"]').on('click', function() {
             if ($(this).prop('checked')) $("#aux4").show(); else $("#aux4").hide();
            contentChange();
        });

        // pid and rates
        // roll
        $('tr.roll input').eq(0).val(data['G_P'][0]);
        $('tr.roll input').eq(1).val(data['G_I'][0]);
        $('tr.roll input').eq(2).val(data['G_D'][0]);
        $('tr.roll input').eq(3).val(data['RC_Rate'][0]);
        $('tr.roll input').eq(4).val(data['RPY_Expo'][0]);
        $('tr.roll input').eq(5).val(data['RPY_Curve'][0]);
        for (var i = 0; i < 6; i++) {
            $('tr.roll input').eq(i).on('input', function() {
                contentChange();
            });
        }

        // pitch
        $('tr.pitch input').eq(0).val(data['G_P'][1]);
        $('tr.pitch input').eq(1).val(data['G_I'][1]);
        $('tr.pitch input').eq(2).val(data['G_D'][1]);
        $('tr.pitch input').eq(3).val(data['RC_Rate'][1]);
        $('tr.pitch input').eq(4).val(data['RPY_Expo'][1]);
        $('tr.pitch input').eq(5).val(data['RPY_Curve'][1]);
        for (var i = 0; i < 6; i++) {
            $('tr.pitch input').eq(i).on('input', function() {
                contentChange();
            });
        }

        // yaw
        $('tr.yaw input').eq(0).val(data['G_P'][2]);
        $('tr.yaw input').eq(1).val(data['G_I'][2]);
        $('tr.yaw input').eq(2).val(data['G_D'][2]);
        $('tr.yaw input').eq(3).val(data['RC_Rate'][2]);
        $('tr.yaw input').eq(4).val(data['RPY_Expo'][2]);
        $('tr.yaw input').eq(5).val(data['RPY_Curve'][2]);
        for (var i = 0; i < 6; i++) {
            $('tr.yaw input').eq(i).on('input', function() {
                contentChange();
            });
        }

        //TPA
        $('tr.TPA input').eq(0).val(data['TPA'][0]);
        $('tr.TPA input').eq(1).val(data['TPA'][1]);
        $('tr.TPA input').eq(2).val(data['TPA'][2]);
        for (var i = 0; i < 3; i++) {
            $('tr.TPA input').eq(i).on('input', function() {
                contentChange();
            });
        }

        // level
        $('tr.level input').eq(0).val(data['A_P']);
        $('tr.level input').eq(1).val(data['A_I']);
        $('tr.level input').eq(2).val(data['A_D']);
        $('tr.level input').eq(3).val(Math.round(data['maxAng']));
        
        for (var i = 0; i < 4; i++) {
            $('tr.level input').eq(i).on('input', function() {
                contentChange();
            });
        }

        $("#aux0").kissAux({ name: $.i18n("column.arm"),    
                             change: function() { contentChange(); },
                             value: data['AUX'][0]
                           });    
        $("#aux1").kissAux({ name: $.i18n("column.level"),  
                             change: function() { contentChange(); },
                             value: data['AUX'][1]
                           });    
        $("#aux2").kissAux({ name: $.i18n("column.buzzer"), 
                              change: function() { contentChange(); },
                              value: data['AUX'][2]
                            });    
        $("#aux3").kissAux({ name: $.i18n("column.led"),    
                             change: function() { contentChange(); },
                             knob: true,
                             value: data['AUX'][3]
                           });    
        $("#aux4").kissAux({ name: $.i18n("column.3d"),    
                             change: function() { contentChange(); },
                             value: data['AUX'][4]
                           });

        $("#aux5").kissAux({ name: $.i18n("column.vtx-power"),    
            change: function() { contentChange(); },
            knob: true,
            value: data['AUX'][5]
        });
        
        $("#aux6").kissAux({ name: $.i18n("column.vtx-band"),    
            change: function() { contentChange(); },
            value: data['AUX'][6]
        });
        
        $("#aux7").kissAux({ name: $.i18n("column.vtx-channel"),    
            change: function() { contentChange(); },
            value: data['AUX'][7]
        });
        
        if (data['ver'] > 108) {
            $("#aux8").kissAux({ name: $.i18n("column.turtle-mode"),    
                change: function() { contentChange(); },
                value: data['AUX'][8]
            });
        } else {
            $("#aux8").hide();
        }
        
        if (data['ver'] > 109) {
            $("#aux9").kissAux({ name: $.i18n("column.runcam"),    
                change: function() { contentChange(); },
                value: data['AUX'][9]
            });
            $("#aux10").kissAux({ name: $.i18n("column.led-brightness"),    
                change: function() { contentChange(); },
                value: data['AUX'][10],
                knob: true
            });
        } else {
            $("#aux9").hide();
            $("#aux10").hide();
        }
        
        if (data['ver'] < 109) {
            $('select[name="lpf"]').val(data['LPF']);
        } else {
            if (data['LPF'] == data['DLpF'] && data['LPF'] == data['yawLpF']){
                $('select[name="lpf"]').val(data['LPF']);
            } else {
                $('select[name="lpf"]').val(7);
            }
	}
        $('select[name="lpf"]').on('change', function() {
            contentChange();
        });
         
        // Temp fix
        if (typeof androidOTGSerial !== 'undefined') {
            $('#backup').hide();
            $('#restore').hide();
        }
        
        if (data.lipoConnected==1) {
            $(".unsafe").addClass("unsafe_active");
        } else {
            $(".unsafe").removeClass("unsafe_active");
        }
        $(".unsafe_active").prop('disabled', true);
        
//        $("input,select").on("change", function() {
//            contentChange(); 
//        });
        
        
           
        if (data['ver']>MAX_CONFIG_VERSION) {
            $("#navigation").hide();
            $("#upgrade_gui").kissWarning({});  
            $("#upgrade_gui").show();
        } else if (data['ver']<MIN_CONFIG_VERSION) {
            $("#navigation").hide();
            $("#downgrade_gui").kissWarning({});  
            $("#downgrade_gui").show();
        } else if (!data['isActive']) {
            $("#navigation").hide();
            
            $("#activation").kissWarning({
                title:$.i18n("title.warning"),
                button:$.i18n("button.activate"), 
                action: function() {
                    // Activation procedure
                    $(".button", "#activation").hide();
                    $.ajax({
                        url: 'http://ultraesc.de/KISSFC/getActivation/index.php?SN=' + MCUid + '&VER=' + data['ver'],
                        cache: false,
                        dataType: "text",
                        success: function(key) {
                            console.log('Got activation code ' + key);
                            data['actKey'] = parseInt(key);
                            kissProtocol.send(kissProtocol.SET_SETTINGS, kissProtocol.preparePacket(kissProtocol.SET_SETTINGS, kissProtocol.data[kissProtocol.GET_SETTINGS]));
                            kissProtocol.send(kissProtocol.GET_SETTINGS, [0x30], function() {
                                   $('#content').load("./content/configuration.html", function() {
                                       htmlLoaded(kissProtocol.data[kissProtocol.GET_SETTINGS]);
                                   });
                            });
                        },
                        error: function() {
                            $(".button", "#activation").show();
                            console.log('getting activation code failed');
                            data['actKey'] = 0;
                            $(".button", "#activation").text($.i18n("button.activation-failed"));
                        }
                    });
                }
            }); 
            $("#activation").show();
        } else {
            $("#navigation").show();
        }
              
        function grabData() {
            // uav type and receiver
            data['CopterType'] = parseInt($('select.mixer').val());
            data['RXType'] = parseInt($('.rxType').val());

            // general settings
            data['MinThrottle16'] = parseInt($('input[name="minThrottle"]').val());
            data['MaxThrottle16'] = parseInt($('input[name="maxThrottle"]').val());
            data['MinCommand16'] = parseInt($('input[name="minCommand"]').val());
            data['MidCommand16'] = parseInt($('input[name="midCommand"]').val());
            data['TYmid16'] = parseInt($('input[name="TYmid"]').val());
            data['TYinv8'] = parseInt($('input[name="TYinv"]').prop('checked') ? 1 : 0);
            
             var outputMode = 0;

                outputMode = parseInt($('select[name="outputMode"]').val());
                data['ESConeshot125'] = outputMode;
                data['ESConeshot42'] = 0;
           
            data['Active3DMode'] = parseInt($('input[name="3dMode"]').prop('checked') ? 1 : 0);
            data['failsaveseconds'] = parseInt($('input[name="failsaveseconds"]').val());
            data['BoardRotation'] = 0;

            // pid and rates
            // roll
            data['G_P'][0] = parseFloat($('tr.roll input').eq(0).val());
            data['G_I'][0] = parseFloat($('tr.roll input').eq(1).val());
            data['G_D'][0] = parseFloat($('tr.roll input').eq(2).val());
            data['RC_Rate'][0] = parseFloat($('tr.roll input').eq(3).val());
            data['RPY_Expo'][0] = parseFloat($('tr.roll input').eq(4).val());
            data['RPY_Curve'][0] = parseFloat($('tr.roll input').eq(5).val());

            // pitch
            data['G_P'][1] = parseFloat($('tr.pitch input').eq(0).val());
            data['G_I'][1] = parseFloat($('tr.pitch input').eq(1).val());
            data['G_D'][1] = parseFloat($('tr.pitch input').eq(2).val());
            data['RC_Rate'][1] = parseFloat($('tr.pitch input').eq(3).val());
            data['RPY_Expo'][1] = parseFloat($('tr.pitch input').eq(4).val());
            data['RPY_Curve'][1] = parseFloat($('tr.pitch input').eq(5).val());

            // yaw
            data['G_P'][2] = parseFloat($('tr.yaw input').eq(0).val());
            data['G_I'][2] = parseFloat($('tr.yaw input').eq(1).val());
            data['G_D'][2] = parseFloat($('tr.yaw input').eq(2).val());
            data['RC_Rate'][2] = parseFloat($('tr.yaw input').eq(3).val());
            data['RPY_Expo'][2] = parseFloat($('tr.yaw input').eq(4).val());
            data['RPY_Curve'][2] = parseFloat($('tr.yaw input').eq(5).val());

            // TPA
            data['TPA'][0] = parseFloat($('tr.TPA input').eq(0).val());
            data['TPA'][1] = parseFloat($('tr.TPA input').eq(1).val());
            data['TPA'][2] = parseFloat($('tr.TPA input').eq(2).val());

            // level
            data['A_P'] = parseFloat($('tr.level input').eq(0).val());
            data['A_I'] = parseFloat($('tr.level input').eq(1).val());
            data['A_D'] = parseFloat($('tr.level input').eq(2).val());
            data['maxAng'] = parseFloat($('tr.level input').eq(3).val());
	    
            if (data['ver'] < 109){
               data['LPF'] = parseInt($('select[name="lpf"]').val());
            } else {
                if (parseInt($('select[name="lpf"]').val()) != 7) {
                    data['LPF'] = parseInt($('select[name="lpf"]').val());
                    data['yawLpF'] = parseInt($('select[name="lpf"]').val());
                    data['DLpF'] = parseInt($('select[name="lpf"]').val());
                }
            }
            
            data['AUX'][0]=$("#aux0").kissAux('value');
            data['AUX'][1]=$("#aux1").kissAux('value');
            data['AUX'][2]=$("#aux2").kissAux('value');
            data['AUX'][3]=$("#aux3").kissAux('value');
            data['AUX'][4]=data['Active3DMode'] ? $("#aux4").kissAux('value') : 0;
            data['AUX'][5]=$("#aux5").kissAux('value');
            data['AUX'][6]=$("#aux6").kissAux('value');
            data['AUX'][7]=$("#aux7").kissAux('value');
            
            if (data['ver'] >108) {
                data['AUX'][8]=$("#aux8").kissAux('value');
            }
            
            if (data['ver'] >109) {
                data['AUX'][9]=$("#aux9").kissAux('value');
                data['AUX'][10]=$("#aux10").kissAux('value');
            }
        }
        settingsFilled = 1;

        function contentChange() {
            if (settingsFilled) {
                $('#save').addClass("saveAct");
            }    
        }

        $.ajax({
            url: 'http://ultraesc.de/PREPID/?getPIDs',
            cache: false,
            dataType: "text",
            success: function(data) {
                console.log('userPIDs request success');
                var uPIDSettings = data.split('[');
                for (var i = 1; i < uPIDSettings.length; i++) {
                    self.USER_PIDs[i] = [];
                    var udeteilSettings = uPIDSettings[i].split(',');
                    self.USER_PIDs[i]['name'] = [udeteilSettings[0]];
                    for (var y = 1; y < udeteilSettings.length; y++) {
                        var uDetailValue = udeteilSettings[y].split(':');
                        self.USER_PIDs[i][uDetailValue[0]] = uDetailValue[1];
                    }
                }
                var userPIDselect = $('#userSel');
                for (var i = 1; i < self.USER_PIDs.length; i++) {
                    var newSetName = String(self.USER_PIDs[i].name);
                    newSetName = newSetName.replace(/�/g, ':');
                    newSetName = newSetName.replace(/�/g, '[');
                    newSetName = newSetName.replace(/�/g, ']');
                    newSetName = newSetName.replace(/�/g, ',');
                    userPIDselect.append('<option value="' + i + '">' + newSetName + '</option>');
                }
            },
            error: function() {
                console.log('userPIDs request failed');
                $('#userSel').append('<option value="0">could not connect to server</option>');
            }

        });

        $.ajax({
            url: './PRESET_PID.txt',
            cache: false,
            dataType: "text",
            success: function(data) {
                console.log('presetPIDs request success');
                var PIDSettings = data.split('[');
                for (var i = 1; i < PIDSettings.length; i++) {
                    self.PRESET_PIDs[i] = [];
                    var deteilSettings = PIDSettings[i].split(',');
                    self.PRESET_PIDs[i]['name'] = [deteilSettings[0]];
                    for (var y = 1; y < deteilSettings.length; y++) {
                        var DetailValue = deteilSettings[y].split(':');
                        self.PRESET_PIDs[i][DetailValue[0]] = DetailValue[1];
                    }
                }
                var userPIDselect = $('#presetSel');
                for (var i = 1; i < self.PRESET_PIDs.length; i++) {
                    userPIDselect.append('<option value="' + i + '">' + self.PRESET_PIDs[i].name + '</option>');
                }
            },
            error: function() {
                console.log('presetPIDs request failed');
                $('#presetSel').append('<option value="0">could not load PESET_PID.txt</option>');
            }

        });

        if (!data['isActive']) {
            $.ajax({
                url: 'http://ultraesc.de/KISSFC/getActivation/index.php?SN=' + MCUid + '&VER=' + data['ver'],
                cache: false,
                dataType: "text",
                success: function(key) {
                    console.log('Got activation code ' + key);
                    data['actKey'] = parseInt(key);
                },
                error: function() {
                    console.log('getting activation code failed');
                    data['actKey'] = 0;
                }

            });
        }
        $('#prePID').change(function() {
            if (document.getElementById('prePID').value == 'preset') {
                document.getElementById('userSel').style.display = 'none';
                document.getElementById('presetSel').style.display = 'inline-block';
                if (document.getElementById('presetSel').value == 'Preset1') {
                    shareButton.innerHTML = 'share';
                }
            } else {
                document.getElementById('presetSel').style.display = 'none';
                document.getElementById('userSel').style.display = 'inline-block';
                shareButton.innerHTML = 'Use';
            }
        });
        $('#presetSel').change(function() {
            if (document.getElementById('presetSel').value == 'Preset1') {
                shareButton.innerHTML = 'share';
            } else {
                shareButton.innerHTML = 'use';
            }
        });
        $('#userSel').change(function() {
            shareButton.innerHTML = 'use';
        });

        $('#shareButton').click(function() {
            if (document.getElementById('shareButton').innerHTML == 'use') {
                var useVals = [];
                if (document.getElementById('prePID').value == 'preset') {
                    useVals = self.PRESET_PIDs[parseInt(document.getElementById('presetSel').value)];
                } else {
                    useVals = self.USER_PIDs[parseInt(document.getElementById('userSel').value)];
                }

                // roll
                $('tr.roll input').eq(0).val(useVals.PR);
                $('tr.roll input').eq(1).val(useVals.IR);
                $('tr.roll input').eq(2).val(useVals.DR);

                // pitch
                $('tr.pitch input').eq(0).val(useVals.PP);
                $('tr.pitch input').eq(1).val(useVals.IP);
                $('tr.pitch input').eq(2).val(useVals.DP);

                // yaw
                $('tr.yaw input').eq(0).val(useVals.PY);
                $('tr.yaw input').eq(1).val(useVals.IY);
                $('tr.yaw input').eq(2).val(useVals.DY);

                //TPA
                $('tr.TPA input').eq(0).val(useVals.TP);
                $('tr.TPA input').eq(1).val(useVals.TI);
                $('tr.TPA input').eq(2).val(useVals.TD);

                // level
                $('tr.level input').eq(0).val(useVals.LP);
                $('tr.level input').eq(1).val(useVals.LI);
                $('tr.level input').eq(2).val(useVals.LD);

                $('select[name="lpf"]').val(useVals.LPF);
                contentChange();
            } else {
                var GET_PIDdatas = '[name,';

                GET_PIDdatas += 'PR:' + parseFloat($('tr.roll input').eq(0).val()) + ',';
                GET_PIDdatas += 'PP:' + parseFloat($('tr.pitch input').eq(0).val()) + ',';
                GET_PIDdatas += 'PY:' + parseFloat($('tr.yaw input').eq(0).val()) + ',';

                GET_PIDdatas += 'IR:' + parseFloat($('tr.roll input').eq(1).val()) + ',';
                GET_PIDdatas += 'IP:' + parseFloat($('tr.pitch input').eq(1).val()) + ',';
                GET_PIDdatas += 'IY:' + parseFloat($('tr.yaw input').eq(1).val()) + ',';

                GET_PIDdatas += 'DR:' + parseFloat($('tr.roll input').eq(2).val()) + ',';
                GET_PIDdatas += 'DP:' + parseFloat($('tr.pitch input').eq(2).val()) + ',';
                GET_PIDdatas += 'DY:' + parseFloat($('tr.yaw input').eq(2).val()) + ',';

                GET_PIDdatas += 'LP:' + parseFloat($('tr.level input').eq(0).val()) + ',';
                GET_PIDdatas += 'LI:' + parseFloat($('tr.level input').eq(1).val()) + ',';
                GET_PIDdatas += 'LD:' + parseFloat($('tr.level input').eq(2).val()) + ',';

                GET_PIDdatas += 'TP:' + parseFloat($('tr.TPA input').eq(0).val()) + ',';
                GET_PIDdatas += 'TI:' + parseFloat($('tr.TPA input').eq(1).val()) + ',';
                GET_PIDdatas += 'TD:' + parseFloat($('tr.TPA input').eq(2).val()) + ',';

                GET_PIDdatas += 'LPF:' + parseInt($('select[name="lpf"]').val()) + ',';

                GET_PIDdatas += ']';
                window.open('http://ultraesc.de/PREPID/index.php?setPIDs=' + GET_PIDdatas, '_blank');

            }
        });

        $('#save').on('click', function() {
            grabData();
            $('#save').removeClass("saveAct");
            kissProtocol.send(kissProtocol.SET_SETTINGS, kissProtocol.preparePacket(kissProtocol.SET_SETTINGS, kissProtocol.data[kissProtocol.GET_SETTINGS]));
                 kissProtocol.send(kissProtocol.GET_SETTINGS, [0x30], function() {
                       GUI.load("./content/configuration.html", function() {
                            htmlLoaded(kissProtocol.data[kissProtocol.GET_SETTINGS]);
                        });
                 });
        });

        $('#backup').on('click', function() {
            grabData();
            backupConfig();
        });

        $('#restore').on('click', function() {
            restoreConfig(function(config) {
                GUI.load("./content/configuration.html", function() {
                    var v = +kissProtocol.data[kissProtocol.GET_SETTINGS]['ver'];
                    var tmp = $.extend({}, kissProtocol.data[kissProtocol.GET_SETTINGS], config);
                    kissProtocol.upgradeTo104(tmp);
                    tmp.ver = v; // fix version to one we get from FCs
                    kissProtocol.data[kissProtocol.GET_SETTINGS] = tmp;
                    htmlLoaded(kissProtocol.data[kissProtocol.GET_SETTINGS]);
                    contentChange();
                });
            });
        });
    }
};

CONTENT.configuration.cleanup = function(callback) {
    if (callback) callback();
};