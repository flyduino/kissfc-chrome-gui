'use strict';

CONTENT.advanced = {
    USER_PIDs: [],
    PRESET_PIDs: [],
};

CONTENT.advanced.initialize = function(callback) {
    var self = this;

    if (GUI.activeContent != 'advanced') {
        GUI.activeContent = 'advanced';
    }

    kissProtocol.send(kissProtocol.GET_SETTINGS, [0x30], function() {
        $('#content').load("./content/advanced.html", function() {
            htmlLoaded(kissProtocol.data[kissProtocol.GET_SETTINGS]);
        });
    });
 
    function htmlLoaded(data) {
        validateBounds('#content input[type="text"]');
        var settingsFilled = 0;
        
        
        	if (data['loggerConfig']>0) {
        		$("#loggerDebug").show();
        	} else {
        		$("#loggerDebug").hide();
        	}
        
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

		var cbo = false;
			$('input[name="CBO"]').removeAttr("disabled");
			if (+data['CBO'][0]!=0 || +data['CBO'][1]!=0 || +data['CBO'][2]!=0) {
				cbo = true;
			}
			$('input[name="CBO"]').prop('checked', cbo);
			if (cbo) {
				 $('input[name="CBO0"]').removeAttr("disabled");
           	 	 $('input[name="CBO1"]').removeAttr("disabled");
            	 $('input[name="CBO2"]').removeAttr("disabled");
			}

        if (data['BatteryInfluence'] || data['CustomTPAInfluence'] || cbo) {
            document.body.style.overflow = "scroll";
        }
        
        $('input[name^="BP"]').on("input", function() {
        	contentChange();
        });
        
        $('input[name^="LV"]').on("input", function() {
        	contentChange();
        });
        
        for (var i=0; i<64; i++) {
        	$("select[name='lapTimerTransponderId']").append("<option value='"+i+"'>"+((i==0)? '--' : i)+"</option>");
        }
        
        $('input[name^="lapTimer"]').on("change", function() {
        	contentChange();
        });
        
        $('select[name="lapTimerTypeAndInterface"]').on("change", function() {
        	if ($(this).val()==0) $("select[name='lapTimerTransponderId']").hide();
        	else $("select[name='lapTimerTransponderId']").show();
        });
        
        if (data.CopterType>3) {
        	if (data.lapTimerTypeAndInterface==18 || data.lapTimerTypeAndInterface==19) {
        		data.lapTimerTypeAndInterface=0;
        	}
        	$("select[name='lapTimerTypeAndInterface'] option[value='18']").remove();
        	$("select[name='lapTimerTypeAndInterface'] option[value='19']").remove();
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
        var SSID='KISS-';
        for (var i = 8; i < 12; i++) {
            if (data['SN'][i] < 16) { MCUid += '0'; SSID += '0' }
            MCUid += data['SN'][i].toString(16).toUpperCase();
            SSID += data['SN'][i].toString(16).toUpperCase();
        }

        $(".ssid").text('SSID: ' + SSID);
        $('select[name="lapTimerTransponderId"]').val(data.lapTimerTransponderId);
        $('select[name="lapTimerTypeAndInterface"]').val(data.lapTimerTypeAndInterface);
        
    	if (data.lapTimerTypeAndInterface==0) {
    		$("select[name='lapTimerTransponderId']").hide();
    	} else {
    		$("select[name='lapTimerTransponderId']").show();
    	}
    	
    	$('input[name="wifiPassword"]').val(data['wifiPassword']);
    	$('select[name="loggerDebugVariables"]').val(data['loggerDebugVariables']);
        
    	  
        $('input[name="wifiPassword"]').on("change", function() {
        	contentChange();
        });
    	
        $('select[name="loggerDebugVariables"]').on("change", function() {
        	contentChange();
        });
    	
        function grabData() {
            // uav type and receiver
            data['BoardRotation'] = 0;

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
            
          	if ($('input[name="CBO"]').prop('checked') ? 1 : 0 == 1) {
            	data['CBO'][0] = parseInt($('input[name="CBO0"]').val());
            	data['CBO'][1] = parseInt($('input[name="CBO1"]').val());
            	data['CBO'][2] = parseInt($('input[name="CBO2"]').val());
            } else {
           	 	data['CBO'] = [0, 0, 0];
            }
          	data['lapTimerTypeAndInterface'] = parseInt($('select[name="lapTimerTypeAndInterface"]').val());
        	data['lapTimerTransponderId'] = parseInt($('select[name="lapTimerTransponderId"]').val());
        	
        	data['wifiPassword'] = $('input[name="wifiPassword"]').val();
        	data['loggerDebugVariables'] = parseInt($('select[name="loggerDebugVariables"]').val());
        	
        }
        settingsFilled = 1;

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

        $('#save').on('click', function() {
            grabData();
            $('#save').removeClass("saveAct");
            kissProtocol.send(kissProtocol.SET_SETTINGS, kissProtocol.preparePacket(kissProtocol.SET_SETTINGS, kissProtocol.data[kissProtocol.GET_SETTINGS]));
            if (!data['isActive']) {
            	 kissProtocol.send(kissProtocol.GET_SETTINGS, [0x30], function() {
            	        $('#content').load("./content/advanced.html", function() {
            	            htmlLoaded(kissProtocol.data[kissProtocol.GET_SETTINGS]);
            	        });
            	 });
            }
        });
       
    }
};

CONTENT.advanced.cleanup = function(callback) {
    if (callback) callback();
};