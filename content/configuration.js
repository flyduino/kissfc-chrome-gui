'use strict';

CONTENT.configuration = {
    USER_PIDs: [],
    PRESET_PIDs: [],
};

CONTENT.configuration.initialize = function(callback) {
    var self = this;

    if (GUI.activeContent != 'configuration') {
        GUI.activeContent = 'configuration';
    }

    kissProtocol.send(kissProtocol.GET_SETTINGS, [0x30], function() {
        $('#content').load("./content/configuration.html", function() {
            htmlLoaded(kissProtocol.data[kissProtocol.GET_SETTINGS]);
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
        validateBounds('#content input[type="text"]');
        var settingsFilled = 0;

        $("#SAC").on('click', function() {
            document.getElementById('AC').style.visibility = "visible";
            document.getElementById('SAC').style.display = "none";
            document.body.style.overflow = "scroll";
        });

        if (data['ver'] < 100) {
            $('#version').text('0.' + data['ver']);
        } else if (data['ver'] == 100) {
            $('#version').text((data['ver'] / 100) + '.00');
        } else {
            $('#version').text((data['ver'] / 100));
            $('input[name="3dMode"]').removeAttr("disabled");
            $('select[name="BoardRotation"]').removeAttr("disabled");
        }

        if (data['ver'] > 101) {
            document.getElementById('SAC').style.display = "inline";
            document.getElementById('ppmadd1').style.display = "inline";
            document.getElementById('ppmadd2').style.display = "inline";
            document.getElementById('mpxSRXL').style.display = "inline";
        }
        
        
        if (data['ver'] > 102) {
            $('select[name="loggerConfig"]').removeAttr("disabled");
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

  		var sntext = MCUid + ' (' + (data['isActive'] ? 'Activated' : 'Not Activated') + ')';
  		$('#SN').text(sntext);
 		$('#SN').on('click', function(e) {
			console.log("Copy to clipboard: " + MCUid);
			copyTextToClipboard(MCUid);
			$('#SN').text("Serial number has been copied to clipboard");
			setTimeout(function() {
				$('#SN').text(sntext);
			}, 1000);
		});

        var mixerList = [{
            name: 'Tricopter',
            image: '0.png'
        }, {
            name: 'Quad Plus',
            image: '1.png'
        }, {
            name: 'Quad X',
            image: '2.png'
        }, {
            name: 'Y4',
            image: '3.png'
        }, {
            name: 'Y6',
            image: '4.png'
        }, {
            name: 'Hexacopter Plus',
            image: '5.png'
        }, {
            name: 'Hexacopter X',
            image: '6.png'
        }];

        var mixer_list_e = $('select.mixer');
        for (var i = 0; i < mixerList.length; i++) {
            mixer_list_e.append('<option value="' + (i) + '">' + mixerList[i].name + '</option>');
        }

        mixer_list_e.on('change', function() {
            var val = parseInt($(this).val());
            contentChange();
            $('.mixerPreview img').attr('src', './images/mixer/' + mixerList[val].image);
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
        $('input[name="oneShot"]').prop('checked', data['ESConeshot125']);
        $('select[name="BoardRotation"]').val(data['BoardRotation']);
        $('select[name="BoardRotation"]').on('change', function() {
            contentChange();
        });

        $('input[name="failsaveseconds"]').val(data['failsaveseconds']);
        $('input[name="failsaveseconds"]').on('input', function() {
            contentChange();
        });

        $('input[name="oneShot"]').on('click', function() {
            contentChange();
            $('input[name="oneShot42"]').attr('checked', false);
        });
        $('input[name="oneShot42"]').prop('checked', data['ESConeshot42']);
        $('input[name="oneShot42"]').on('click', function() {
            contentChange();
            $('input[name="oneShot"]').attr('checked', false);
        });
        $('input[name="3dMode"]').prop('checked', data['Active3DMode']);
        $('input[name="3dMode"]').on('click', function() {
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

        // aux settings
        $('select[name="aux1"]').val(data['aux1Funk']);
        $('select[name="aux1"]').on('change', function() {
            contentChange();
        });
        $('select[name="aux2"]').val(data['aux2Funk']);
        $('select[name="aux2"]').on('change', function() {
            contentChange();
        });
        $('select[name="aux3"]').val(data['aux3Funk']);
        $('select[name="aux3"]').on('change', function() {
            contentChange();
        });
        $('select[name="aux4"]').val(data['aux4Funk']);
        $('select[name="aux4"]').on('change', function() {
            contentChange();
        });
        $('select[name="lpf"]').val(data['LPF']);
        $('select[name="lpf"]').on('change', function() {
            contentChange();
        });

        $('input[name="UCTI"]').on('change', function() {
        	contentChange();
            if (parseInt($('input[name="UCTI"]').prop('checked') ? 1 : 0) == 1) {
                $('input[name="BP1"]').removeAttr("disabled");
                $('input[name="BP2"]').removeAttr("disabled");
                $('input[name="BPI1"]').removeAttr("disabled");
                $('input[name="BPI2"]').removeAttr("disabled");
                $('input[name="BPI3"]').removeAttr("disabled");
                $('input[name="BPI4"]').removeAttr("disabled");
            } else {
                $('input[name="BP1"]').attr('disabled', 'true');
                $('input[name="BP2"]').attr('disabled', 'true');
                $('input[name="BPI1"]').attr('disabled', 'true');
                $('input[name="BPI2"]').attr('disabled', 'true');
                $('input[name="BPI3"]').attr('disabled', 'true');
                $('input[name="BPI4"]').attr('disabled', 'true');
            }
        });

        $('input[name="UCTI"]').prop('checked', data['CustomTPAInfluence']);
        if (data['CustomTPAInfluence']) {
            $('input[name="BP1"]').removeAttr("disabled");
            $('input[name="BP2"]').removeAttr("disabled");
            $('input[name="BPI1"]').removeAttr("disabled");
            $('input[name="BPI2"]').removeAttr("disabled");
            $('input[name="BPI3"]').removeAttr("disabled");
            $('input[name="BPI4"]').removeAttr("disabled");
        }
        $('input[name="BP1"]').val(data['TPABP1']);
        $('input[name="BP2"]').val(data['TPABP2']);
        $('input[name="BPI1"]').val(data['TPABPI1']);
        $('input[name="BPI2"]').val(data['TPABPI2']);
        $('input[name="BPI3"]').val(data['TPABPI3']);
        $('input[name="BPI4"]').val(data['TPABPI4']);


        $('input[name="UVPID"]').on('change', function() {
        	contentChange();
            if (parseInt($('input[name="UVPID"]').prop('checked') ? 1 : 0) == 1) {
                $('input[name="LV1"]').removeAttr("disabled");
                $('input[name="LV2"]').removeAttr("disabled");
                $('input[name="LV3"]').removeAttr("disabled");
                $('input[name="LVP1"]').removeAttr("disabled");
                $('input[name="LVP2"]').removeAttr("disabled");
                $('input[name="LVP3"]').removeAttr("disabled");
            } else {
                $('input[name="LV1"]').attr('disabled', 'true');
                $('input[name="LV2"]').attr('disabled', 'true');
                $('input[name="LV3"]').attr('disabled', 'true');
                $('input[name="LVP1"]').attr('disabled', 'true');
                $('input[name="LVP2"]').attr('disabled', 'true');
                $('input[name="LVP3"]').attr('disabled', 'true');
            }
        });

        $('input[name="UVPID"]').prop('checked', data['BatteryInfluence']);
        if (data['BatteryInfluence']) {
            $('input[name="LV1"]').removeAttr("disabled");
            $('input[name="LV2"]').removeAttr("disabled");
            $('input[name="LV3"]').removeAttr("disabled");
            $('input[name="LVP1"]').removeAttr("disabled");
            $('input[name="LVP2"]').removeAttr("disabled");
            $('input[name="LVP3"]').removeAttr("disabled");
        }
        $('input[name="LV1"]').val(data['voltage1']);
        $('input[name="LV2"]').val(data['voltage2']);
        $('input[name="LV3"]').val(data['voltage3']);
        $('input[name="LVP1"]').val(data['voltgePercent1']);
        $('input[name="LVP2"]').val(data['voltgePercent2']);
        $('input[name="LVP3"]').val(data['voltgePercent3']);

        if (data['BatteryInfluence'] || data['CustomTPAInfluence']) {
            document.getElementById('AC').style.visibility = "visible";
            document.getElementById('SAC').style.display = "none";
            document.body.style.overflow = "scroll";
        }
        
        $('input[name^="BP"]').on("input", function() {
        	contentChange();
        });
        
        $('input[name^="LV"]').on("input", function() {
        	contentChange();
        });

 		$('select[name="loggerConfig"]').val(data['loggerConfig']);
        $('select[name="loggerConfig"]').on('change', function() {
            contentChange();
        });
        
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
            data['ESConeshot125'] = parseInt($('input[name="oneShot"]').prop('checked') ? 1 : 0);
            data['ESConeshot42'] = parseInt($('input[name="oneShot42"]').prop('checked') ? 1 : 0);
            data['Active3DMode'] = parseInt($('input[name="3dMode"]').prop('checked') ? 1 : 0);
            data['Active3DMode'] = parseInt($('input[name="3dMode"]').prop('checked') ? 1 : 0);
            data['failsaveseconds'] = parseInt($('input[name="failsaveseconds"]').val());
            data['BoardRotation'] = parseInt($('select[name="BoardRotation"]').val());

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

            // aux settings
            data['aux1Funk'] = parseInt($('select[name="aux1"]').val());
            data['aux2Funk'] = parseInt($('select[name="aux2"]').val());
            data['aux3Funk'] = parseInt($('select[name="aux3"]').val());
            data['aux4Funk'] = parseInt($('select[name="aux4"]').val());
            data['LPF'] = parseInt($('select[name="lpf"]').val());

            data['CustomTPAInfluence'] = parseInt($('input[name="UCTI"]').prop('checked') ? 1 : 0);
            data['TPABP1'] = parseInt($('input[name="BP1"]').val());
            data['TPABP2'] = parseInt($('input[name="BP2"]').val());
            data['TPABPI1'] = parseInt($('input[name="BPI1"]').val());
            data['TPABPI2'] = parseInt($('input[name="BPI2"]').val());
            data['TPABPI3'] = parseInt($('input[name="BPI3"]').val());
            data['TPABPI4'] = parseInt($('input[name="BPI4"]').val());

            data['BatteryInfluence'] = parseInt($('input[name="UVPID"]').prop('checked') ? 1 : 0);
            data['voltage1'] = parseFloat($('input[name="LV1"]').val());
            data['voltage2'] = parseFloat($('input[name="LV2"]').val());
            data['voltage3'] = parseFloat($('input[name="LV3"]').val());
            data['voltgePercent1'] = parseInt($('input[name="LVP1"]').val());
            data['voltgePercent2'] = parseInt($('input[name="LVP2"]').val());
            data['voltgePercent3'] = parseInt($('input[name="LVP3"]').val());
            
            data['secret'] = 0;
            data['loggerConfig'] = parseInt($('select[name="loggerConfig"]').val());
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
                document.getElementById('presetSel').style.display = 'block';
                if (document.getElementById('presetSel').value == 'Preset1') {
                    shareButton.innerHTML = 'share';
                }
            } else {
                document.getElementById('presetSel').style.display = 'none';
                document.getElementById('userSel').style.display = 'block';
                shareButton.innerHTML = 'use';
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
            if (!data['isActive']) {
            	 kissProtocol.send(kissProtocol.GET_SETTINGS, [0x30], function() {
            	        $('#content').load("./content/configuration.html", function() {
            	            htmlLoaded(kissProtocol.data[kissProtocol.GET_SETTINGS]);
            	        });
            	 });
            }
        });

        $('#backup').on('click', function() {
            grabData();
            backupConfig();
        });

        $('#restore').on('click', function() {
            restoreConfig(function(config) {
                $('#content').load("./content/configuration.html", function() {
                	var tmp = $.extend({}, kissProtocol.data[kissProtocol.GET_SETTINGS], config);
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