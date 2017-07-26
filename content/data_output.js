'use strict';

CONTENT.data_output = {
    graphData: []
};

CONTENT.data_output.initialize = function (callback) {
    var self = this;
    self.ESCTelemetry = 0;
    self.startedUIupdate = 0;
    self.updateTimeout;
    self.motorTestEnabled = false;
    self.requestTelemetry = true;
    self.imuInitialized = false;
    self.telemetry = {};
    
    GUI.switchContent('data_output', function() {
        kissProtocol.send(kissProtocol.GET_TELEMETRY, [0x20], function () {
            GUI.load("./content/data_output.html", htmlLoaded);
            });
    });
    
    function animateModel(timestamp) {
        if (GUI.activeContent == 'data_output') {
            requestAnimationFrame(animateModel);
            
            if (!self.lastTimestamp) {
                self.lastTimestamp = timestamp;
            }
            var frameTime = timestamp - self.lastTimestamp; 
            self.lastTimestamp = timestamp;
            if (!self.imuInitialized) {
                imuInit(1/60, 0.1);
                self.imuInitialized = true;
            } 
            
            if (frameTime>0) {  
                
                imuUpdate(+self.telemetry['GyroRaw'][0] * 2000 * Math.PI / 180, 
                          -self.telemetry['GyroRaw'][1] * 2000 * Math.PI / 180,  
                          +self.telemetry['GyroRaw'][2] * 2000 * Math.PI / 180,  
                          +self.telemetry['ACCRaw'][0], 
                          +self.telemetry['ACCRaw'][1], 
                          +self.telemetry['ACCRaw'][2]);
                
                $("#model").kissModel('reset');
                var axisRate = { 'roll' : 0, 'pitch': 0, 'yaw': 0};
                if (!isNaN(Quaternion[0]) && 
                    !isNaN(Quaternion[1]) &&
                    !isNaN(Quaternion[2]) &&
                    !isNaN(Quaternion[3])) {
                    var q = new THREE.Quaternion(Quaternion[0], Quaternion[1], Quaternion[2], Quaternion[3]);
                    var rotation = new THREE.Euler().setFromQuaternion(q, "XYZ" );
                    axisRate = { 'roll' : rotation.z, 'pitch': rotation.y, 'yaw': -rotation.x};
                } else {
                    imuInit(1/60, 0.1);
                }
                $("#model").kissModel('updateRate', axisRate);
                $("#model").kissModel('refresh');
            }
        }
    }


    function htmlLoaded() {
        // generate receiver bars
        var receiverNames = [$.i18n('column.throttle'), $.i18n('column.roll'), $.i18n('column.pitch'), $.i18n('column.yaw'), 'Aux 1', 'Aux 2', 'Aux 3', 'Aux 4'];
        var receiverContainer = $('.data_output .receiver .bars');
        var receiverFillArray = [];
        var receiverLabelArray = [];
        self.ESCTelemetry = 0;
        self.startedUIupdate = 0;
        window.clearTimeout(self.updateTimeout);
        self.requestTelemetry = true;

        for (var i = 0; i < receiverNames.length; i++) {
            var name = receiverNames[i];
        
            receiverContainer.append('\
                <ul>\
                    <li class="name">' + name + '</li>\
                    <li class="meter">\
                        <div class="meter-bar">\
                            <div class="label"></div>\
                            <div class="fill">\
                                <div class="label"></div>\
                            </div>\
                        </div>\
                    </li>\
                </ul>\
            ');
        }

        $('.meter .fill', receiverContainer).each(function () {
            receiverFillArray.push($(this));
        });

        $('.meter', receiverContainer).each(function () {
            receiverLabelArray.push($('.label' , this));
        });

        // generate motor bars
        var motorNames = ['PWM 1', 'PWM 2', 'PWM 3', 'PWM 4', 'PWM 5', 'PWM 6'];
        var motorContainer = $('.data_output .motors .bars');
        var motorFillArray = [];
        var motorLabelArray = [];

        for (var i = 0; i < motorNames.length; i++) {
            var name = motorNames[i];

            motorContainer.append('\
                <ul>\
                    <li class="name">' + name + '</li>\
                    <li class="motor">\
                        <div class="meter-bar">\
                            <div class="label"></div>\
                            <div class="fill">\
                                <div class="label"></div>\
                            </div>\
                        </div>\
                    </li>\
                    <li class="test"><input style="display:none" type="checkbox" class="motor-test" value="'+i+'"></li> \
                </ul>\
            ');
        }

        $('.motor .fill', motorContainer).each(function () {
            motorFillArray.push($(this));
        });

        $('.motor', motorContainer).each(function () {
            motorLabelArray.push($('.label' , this));
        });
        
        if (kissProtocol.data[kissProtocol.GET_SETTINGS].ver<102) {
            $(".motor-test-button").hide();
        }
        
        $(".motor-test").on('change', function() {
             if (self.motorTestEnabled) {
                  var motorTest = [0, 0, 0, 0, 0, 0];
                 $(".motor-test").each(function(motor, elm) {
                     motorTest[motor] = $(elm).is(':checked') ? 1 : 0;
                 });
                 var tmp = {
                    'buffer' : new ArrayBuffer(7),
                    'motorTestEnabled': 1,
                    'motorTest' : motorTest
                 };
                kissProtocol.send(kissProtocol.MOTOR_TEST, kissProtocol.preparePacket(kissProtocol.MOTOR_TEST, tmp));
            }
        });

        $('.motor-test-enabled').on('change', function() {
            $(".motor-test").prop('checked', false);
            self.motorTestEnabled = this.checked;
            if (self.motorTestEnabled) {
                $(".motor-test").first().trigger('change');
            } else {
                $(".motor-test").prop("disabled", true); 
                var tmp = {
                    'buffer' : new ArrayBuffer(7),
                    'motorTestEnabled': 0,
                    'motorTest' : [0,0,0,0,0,0]
                 };
                kissProtocol.send(kissProtocol.MOTOR_TEST, kissProtocol.preparePacket(kissProtocol.MOTOR_TEST, tmp));
            }
        });

        $(".motor-test-button").on("click", function() {
            $(".motor-test-disclaimer").show();
        });
        
        $(".warning-button").on("click", function() {
            $(".motor-test-button").hide();
            $(".motor-test").show();
            $(".motor-test-enabled").show();
            $("#motorTestTitle span").first().text($.i18n('text.enable-motor-test'));
            $(".motor-test-disclaimer").hide();
        });

        self.barResize = function () {
            var containerWidth = $('.meter:first', receiverContainer).width(),
                labelWidth = $('.meter .label:first', receiverContainer).width(),
                margin = (containerWidth / 2) - (labelWidth / 2);

            for (var i = 0; i < receiverLabelArray.length; i++) {
                receiverLabelArray[i].css('margin-left', margin);
            }

            for (var i = 0; i < motorLabelArray.length; i++) {
                motorLabelArray[i].css('margin-left', margin);
            }
        };

        $(window).on('resize', self.barResize).resize(); // trigger so labels
                                                            // get correctly
                                                            // aligned on
                                                            // creation

        $('a.reset_model').click(function() {
            self.imuInitialized = false;
        });
        
        $('a.calibrateAccelerometer').click(function () {
            var config = kissProtocol.data[kissProtocol.GET_SETTINGS];
            var data = kissProtocol.data[kissProtocol.GET_TELEMETRY];
            
            self.requestTelemetry = false;

            // not a correct way to do it
            config['ACCZero'][0] = (data['ACCRaw'][0]) * 1000;
            config['ACCZero'][1] = (data['ACCRaw'][1]) * 1000;
            config['ACCZero'][2] = (data['ACCRaw'][2] - 1.0) * 1000;

            kissProtocol.send(kissProtocol.SET_SETTINGS, kissProtocol.preparePacket(kissProtocol.SET_SETTINGS, kissProtocol.data[kissProtocol.GET_SETTINGS]), function() {
                self.requestTelemetry = true;
                fastDataPoll();
            });
        });

        var legendItems = $('dl.legend dd');
        var otherItems = $('dl.otherValues dd')
        var meterScale = {'min': 800, 'max': 2200};
        
        function updateUI() {
            var data = kissProtocol.data[kissProtocol.GET_TELEMETRY];
            
        var useGraphData = parseInt($('select[name="graphTitle"]').val());
        
        if(/*
             * data && (data['ESC_Telemetrie0'][1] != 0 ||
             * data['ESC_Telemetrie0'][0] != 0) &&
             */ !self.ESCTelemetry){
            self.ESCTelemetry = 1;
            $('select[name="graphTitle"]').html('<option value="0" data-i18n="telemetry.0">Gyro &amp; ACC Data:</option><option value="1" data-i18n="telemetry.1">ESC Temperatures:</option><option id="ESCTelemetrie" value="2" data-i18n="telemetry.2">ESC Voltanges:</option><option value="3" data-i18n="telemetry.3">ESC Currents:</option><option value="4" data-i18n="telemetry.4">ESC used A/h</option><option value="5" data-i18n="telemetry.5">ESC E-RpM / 1000</option><option value="6" data-i18n="telemetry.6">ESC TLM Stats</option>').children().i18n();
        }
        if(!data){
            if (GUI.activeContent == 'data_output') self.updateTimeout = window.setTimeout(function(){updateUI();},5); 
            return;
        }
        
        if (data['RXcommands'][0]<1020 && self.motorTestEnabled) {
            $(".motor-test").prop("disabled", false); 
        } else {
            $(".motor-test").prop("disabled", true); 
        }
        
        if (useGraphData == 0){
            $('#graph1').text($.i18n('legend.1'));
            $('#graph2').text($.i18n('legend.2'));
            $('#graph3').text($.i18n('legend.3'));
            $('#graph4').text($.i18n('legend.4'));
            $('#graph5').text($.i18n('legend.5'));
            $('#graph6').text($.i18n('legend.6'));
        } else if(useGraphData == 6){
            $('#graph1').text($.i18n('legend.7'));
            $('#graph2').text($.i18n('legend.8'));
            $('#graph3').text($.i18n('legend.9'));
            $('#graph4').text($.i18n('legend.10'));
            $('#graph5').text($.i18n('legend.11'));
            $('#graph6').text($.i18n('legend.12'));
        } else{
            $('#graph1').text($.i18n('legend.13'));
            $('#graph2').text($.i18n('legend.14'));
            $('#graph3').text($.i18n('legend.15'));
            $('#graph4').text($.i18n('legend.16'));
            $('#graph5').text($.i18n('legend.17'));
            $('#graph6').text($.i18n('legend.18'));         
        }
        $('#idle').text(data['idleTime']+' %');
        $('#Vbat').text((data['LiPoVolt']*10).toFixed(2)+' v');

            // update bars with latest data
        var  receiverLabelArrayLength = receiverLabelArray.length;
            for (var i = 0; i < receiverLabelArrayLength; i++) {
                receiverFillArray[i].css('width', ((data['RXcommands'][i] - meterScale.min) / (meterScale.max - meterScale.min) * 100).clamp(0, 100) + '%');
                receiverLabelArray[i].text(data['RXcommands'][i]);
            }
        var motorLabelArrayLength = motorLabelArray.length;
            for (var i = 0; i < motorLabelArrayLength; i++) {
                motorFillArray[i].css('width', ((data['PWMOutVals'][i] - meterScale.min) / (meterScale.max - meterScale.min) * 100).clamp(0, 100) + '%');
                motorLabelArray[i].text(data['PWMOutVals'][i]);
            }

        // other
        if (data['mode'] == 0) $("#omode").text($.i18n('text.acro'));
        else if (data['mode'] == 1) $("#omode").text($.i18n('text.level'));
        else if (data['mode'] == 2) $("#omode").text($.i18n('text.3D'));
        else $("#omode").text(data['mode']);
    
        if (data['Armed'] == 0) $("#ostatus").text($.i18n('text.disarmed'));
        else if(data['Armed'] == 1) $("#ostatus").text($.i18n('text.armed'));
        else $("#ostatus").text(data['Armed']);
    
        $("#oanglex").text((data['angle'][0]*10).toFixed(2));
        $("#oangley").text((data['angle'][1]*10).toFixed(2));
        $("#oanglez").text((data['angle'][2]*10).toFixed(2));
        
        
        if (data['Armed'] == 0) {
            $(".motor-test-enabled").prop("disabled", false); 
        } else {
            $(".motor-test-enabled").prop("disabled", true); 
        } 
        
        // build sample block
        var sampleBlock = [];
        
        var midscale = 1.5;
        
            // update legend
        switch(useGraphData){
        case 0:
            legendItems.eq(0).text(data['GyroRaw'][0].toFixed(3));
            legendItems.eq(1).text(data['GyroRaw'][1].toFixed(3));
            legendItems.eq(2).text(data['GyroRaw'][2].toFixed(3));
            legendItems.eq(3).text(data['ACCRaw'][0].toFixed(3));
            legendItems.eq(4).text(data['ACCRaw'][1].toFixed(3));
            legendItems.eq(5).text(data['ACCRaw'][2].toFixed(3));
            
            for (var i = 0; i < 3; i++) {
                        sampleBlock.push(data['GyroRaw'][i]*4*(self.motorTestEnabled ? 100 : 1)); // to
                                                                                                    // have
                                                                                                    // it
                                                                                                    // more
                                                                                                    // visible
                        sampleBlock.push(data['ACCRaw'][i]);
            if(i == 0){
                if(data['GyroRaw'][i]*2000 >  parseInt($('#gxmax').text())) $('#gxmax').text(data['GyroRaw'][i]*2000);
                if(data['GyroRaw'][i]*2000 <  parseInt($('#gxmin').text())) $('#gxmin').text(data['GyroRaw'][i]*2000);
            }
            if(i == 1){
                if(data['GyroRaw'][i]*2000 >  parseInt($('#gymax').text())) $('#gymax').text(data['GyroRaw'][i]*2000);
                if(data['GyroRaw'][i]*2000 <  parseInt($('#gymin').text())) $('#gymin').text(data['GyroRaw'][i]*2000);
            }
            if(i == 2){
                if(data['GyroRaw'][i]*2000 >  parseInt($('#gzmax').text())) $('#gzmax').text(data['GyroRaw'][i]*2000);
                if(data['GyroRaw'][i]*2000 <  parseInt($('#gzmin').text())) $('#gzmin').text(data['GyroRaw'][i]*2000);
            }
                    }
            
        break;
        case 1:
            legendItems.eq(0).text(data['ESC_Telemetrie0'][0].toFixed(3));
            legendItems.eq(1).text(data['ESC_Telemetrie1'][0].toFixed(3));
            legendItems.eq(2).text(data['ESC_Telemetrie2'][0].toFixed(3));
            legendItems.eq(3).text(data['ESC_Telemetrie3'][0].toFixed(3));
            legendItems.eq(4).text(data['ESC_Telemetrie4'][0].toFixed(3));
            legendItems.eq(5).text(data['ESC_Telemetrie5'][0].toFixed(3));
            sampleBlock.push((data['ESC_Telemetrie0'][0]/35)-midscale);
            sampleBlock.push((data['ESC_Telemetrie3'][0]/35)-midscale);
            sampleBlock.push((data['ESC_Telemetrie1'][0]/35)-midscale);
            sampleBlock.push((data['ESC_Telemetrie4'][0]/35)-midscale);
            sampleBlock.push((data['ESC_Telemetrie2'][0]/35)-midscale);
            sampleBlock.push((data['ESC_Telemetrie5'][0]/35)-midscale);
        break;
        case 2:
            legendItems.eq(0).text((data['ESC_Telemetrie0'][1]/100).toFixed(3));
            legendItems.eq(1).text((data['ESC_Telemetrie1'][1]/100).toFixed(3));
            legendItems.eq(2).text((data['ESC_Telemetrie2'][1]/100).toFixed(3));
            legendItems.eq(3).text((data['ESC_Telemetrie3'][1]/100).toFixed(3));
            legendItems.eq(4).text((data['ESC_Telemetrie4'][1]/100).toFixed(3));
            legendItems.eq(5).text((data['ESC_Telemetrie5'][1]/100).toFixed(3));
            sampleBlock.push((data['ESC_Telemetrie0'][1]/1000)-midscale);
            sampleBlock.push((data['ESC_Telemetrie3'][1]/1000)-midscale);
            sampleBlock.push((data['ESC_Telemetrie1'][1]/1000)-midscale);
            sampleBlock.push((data['ESC_Telemetrie4'][1]/1000)-midscale);
            sampleBlock.push((data['ESC_Telemetrie2'][1]/1000)-midscale);
            sampleBlock.push((data['ESC_Telemetrie5'][1]/1000)-midscale);
        break;
        case 3:
            legendItems.eq(0).text((data['ESC_Telemetrie0'][2]/100).toFixed(3));
            legendItems.eq(1).text((data['ESC_Telemetrie1'][2]/100).toFixed(3));
            legendItems.eq(2).text((data['ESC_Telemetrie2'][2]/100).toFixed(3));
            legendItems.eq(3).text((data['ESC_Telemetrie3'][2]/100).toFixed(3));
            legendItems.eq(4).text((data['ESC_Telemetrie4'][2]/100).toFixed(3));
            legendItems.eq(5).text((data['ESC_Telemetrie5'][2]/100).toFixed(3));
            sampleBlock.push((data['ESC_Telemetrie0'][2]/1000)-midscale);
            sampleBlock.push((data['ESC_Telemetrie3'][2]/1000)-midscale);
            sampleBlock.push((data['ESC_Telemetrie1'][2]/1000)-midscale);
            sampleBlock.push((data['ESC_Telemetrie4'][2]/1000)-midscale);
            sampleBlock.push((data['ESC_Telemetrie2'][2]/1000)-midscale);
            sampleBlock.push((data['ESC_Telemetrie5'][2]/1000)-midscale);
        break;
        case 4:
            legendItems.eq(0).text((data['ESC_Telemetrie0'][3]/1000).toFixed(3));
            legendItems.eq(1).text((data['ESC_Telemetrie1'][3]/1000).toFixed(3));
            legendItems.eq(2).text((data['ESC_Telemetrie2'][3]/1000).toFixed(3));
            legendItems.eq(3).text((data['ESC_Telemetrie3'][3]/1000).toFixed(3));
            legendItems.eq(4).text((data['ESC_Telemetrie4'][3]/1000).toFixed(3));
            legendItems.eq(5).text((data['ESC_Telemetrie5'][3]/1000).toFixed(3));
            sampleBlock.push((data['ESC_Telemetrie0'][3]/5000)-midscale);
            sampleBlock.push((data['ESC_Telemetrie3'][3]/5000)-midscale);
            sampleBlock.push((data['ESC_Telemetrie1'][3]/5000)-midscale);
            sampleBlock.push((data['ESC_Telemetrie4'][3]/5000)-midscale);
            sampleBlock.push((data['ESC_Telemetrie2'][3]/5000)-midscale);
            sampleBlock.push((data['ESC_Telemetrie5'][3]/5000)-midscale);
        break;
        case 5:
            legendItems.eq(0).text((data['ESC_Telemetrie0'][4]/10).toFixed(3));
            legendItems.eq(1).text((data['ESC_Telemetrie1'][4]/10).toFixed(3));
            legendItems.eq(2).text((data['ESC_Telemetrie2'][4]/10).toFixed(3));
            legendItems.eq(3).text((data['ESC_Telemetrie3'][4]/10).toFixed(3));
            legendItems.eq(4).text((data['ESC_Telemetrie4'][4]/10).toFixed(3));
            legendItems.eq(5).text((data['ESC_Telemetrie5'][4]/10).toFixed(3));
            sampleBlock.push((data['ESC_Telemetrie0'][4]/1000)-midscale);
            sampleBlock.push((data['ESC_Telemetrie3'][4]/1000)-midscale);
            sampleBlock.push((data['ESC_Telemetrie1'][4]/1000)-midscale);
            sampleBlock.push((data['ESC_Telemetrie4'][4]/1000)-midscale);
            sampleBlock.push((data['ESC_Telemetrie2'][4]/1000)-midscale);
            sampleBlock.push((data['ESC_Telemetrie5'][4]/1000)-midscale);
        break;
        case 6:
            legendItems.eq(0).text((data['ESC_TelemetrieStats'][0]).toFixed(3));
            legendItems.eq(1).text((data['ESC_TelemetrieStats'][1]/100).toFixed(3));
            legendItems.eq(2).text((data['ESC_TelemetrieStats'][2]/10).toFixed(3));
            legendItems.eq(3).text((data['ESC_TelemetrieStats'][3]/1000).toFixed(3));
            legendItems.eq(4).text((data['ESC_TelemetrieStats'][4]/10).toFixed(3));
            legendItems.eq(5).text((data['ESC_TelemetrieStats'][5]).toFixed(3));
            sampleBlock.push((data['ESC_TelemetrieStats'][0]/35)-midscale);
            sampleBlock.push((data['ESC_TelemetrieStats'][3]/1000)-midscale);
            sampleBlock.push((data['ESC_TelemetrieStats'][1]/1000)-midscale);
            sampleBlock.push((data['ESC_TelemetrieStats'][4]/5000)-midscale);
            sampleBlock.push((data['ESC_TelemetrieStats'][2]/700)-midscale);
            sampleBlock.push((data['ESC_TelemetrieStats'][5]/1000)-midscale);
        break;
        }
    
            self.addSample(self.graphData, sampleBlock);
            self.renderGraph();
            // Update data
            if (GUI.activeContent == 'data_output') self.updateTimeout = window.setTimeout(function(){fastDataPoll();},10); 
        }

        // setup graph
        var mixedGraph = self.initializeGraph('graph', self.graphData);

        self.renderGraph = function() {
            self.drawGraph(mixedGraph, [3.5, -3.5]);
        };

        $(window).on('resize', self.resizeCanvas).resize();

        function fastDataPoll() {
            if (self.requestTelemetry) {
                kissProtocol.send(kissProtocol.GET_TELEMETRY, [0x20], function () {
                    if (GUI.activeContent == 'data_output') {
                        if (self.startedUIupdate == 0){
                               self.telemetry =  kissProtocol.data[kissProtocol.GET_TELEMETRY];
                               updateUI();
                        }
                    }
                });
            }    
        }
        
        $("#model").kissModel({
            'mixer': kissProtocol.data[kissProtocol.GET_SETTINGS].CopterType,
            'width': 190,
            'height': 190
        })
        
        
        
        animateModel();

        // start
        fastDataPoll();

        /*
         * // old code that uses interval for data polling, at this time period
         * it will build up a catastrophic request buffer and eventually crash
         * !!! // we will poll data at 50 fps
         * GUI.intervalAdd('telemetryDataPoll', function () {
         * kissProtocol.send(kissProtocol.GET_TELEMETRY, [0x20], updateUI); },
         * 20, true);
         */
    }
};

CONTENT.data_output.addSample = function (data, sample, scale) {
    var arr = [];

    if (scale) {
    var SampleLength = sample.length;
        for (var i = 0; i < SampleLength; i++) {
            arr.push(sample[i] * scale);
        }
    } else {
    var SampleLength = sample.length;
        for (var i = 0; i < SampleLength; i++) {
            arr.push(sample[i]);
        }
    }
    
    data.push(arr);
};

CONTENT.data_output.initializeGraph = function (selector, data) {
    var canvas = document.getElementById(selector);
    var graph = {
        'selector':     selector,
        'canvas':       canvas,
        'context':      canvas.getContext('2d'),
        'colors':       ['#00A8F0', '#f02525', '#C0D800', '#9440ED', '#f8921a', '#147A66', '#fff', '#fff', '#fff', '#fff'],
        'ticks':        [10, 8],
        'data':         data
    };

    return graph;
};


CONTENT.data_output.drawGraph = function (graph, scale) {
    var canvas = graph.canvas;
    var ctx = graph.context;
    var data = graph.data;

    // if canvas doesn't exist we can't continue
    if (canvas.offsetWidth == 0) return;

    var margin = {top: 0, right: 0, bottom: 0, left: 0};
    var width = canvas.offsetWidth;
    var height = canvas.offsetHeight;
    var middle = (height - 2) / 2;

    var renderSamples = Math.round((width - margin.left) / 500);
    if (renderSamples < 1) renderSamples = 1;

    var scaleFactor = height / scale[0];
    if (scaleFactor < 1) scaleFactor = parseFloat(scaleFactor.toFixed(2));
    else scaleFactor = Math.round(scaleFactor);

    while (data.length > width - margin.left) {
        for (var i = 0; i < renderSamples; i++) {
            data.shift();
        }
    }

    var startupOffset = width - (data.length*1.5) + 1;

    // clean up
    ctx.clearRect(0, 0, width, height);

    
    // draw grid
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#dddddd';
    /*
     * // vertical var tickSize = width / graph.ticks[1]; for (var x = tickSize +
     * margin.left, pos; x < width; x += tickSize) { pos = Math.round(x) + 0.5;
     * 
     * ctx.moveTo(pos, 0); ctx.lineTo(pos, height); }
     */

    // horizontal
    var tickSize = (height - 2) / graph.ticks[0]; // -2px for bottom axis
                                                    // outline
    for (var y = tickSize, pos; y < height; y += tickSize) {
        pos = Math.round(y) + 0.5;

        ctx.moveTo(margin.left, pos);
        ctx.lineTo(width, pos);
    }
    ctx.stroke();

    // draw data axis
    ctx.lineWidth = 1.5;
    if (data.length) { // only render if data is present
    var dLength = data.length;
    var d0Length = data[0].length;
        for (var axis = 0; axis < d0Length; axis++) {
            ctx.beginPath();
            ctx.strokeStyle = graph['colors'][axis];

            for (var i = 0, val; i < dLength; i += renderSamples) {
                val = -(data[i][axis] * scaleFactor) + middle;

                // clamp at limits
                if (val > height) {
                    val = height - 3;
                } else if (val < 0) {
                    val = 1;
                }

                ctx.lineTo((i*1.5) + startupOffset, val);
            }

            ctx.stroke();
        }
    }
};

CONTENT.data_output.resizeCanvas = function () {
    var wrapper = $('.plot');
    var r = 0;
    if ($("#model").css("float")=="right") r=190;
    $('#graph').prop('width', wrapper.width() - 160 - r); // -160px for legend

    CONTENT.data_output.renderGraph();
}

CONTENT.data_output.cleanup = function (callback) {
    $(window).off('resize', this.barResize);
    $(window).off('resize', this.resizeCanvas);
    if (this.motorTestEnabled) {
        console.log("For safety reasons, turning off the motors");
        var tmp = {
            'buffer' : new ArrayBuffer(7),
            'motorTestEnabled': 0,
            'motorTest' : [0,0,0,0,0,0]
        };
        kissProtocol.send(kissProtocol.MOTOR_TEST, kissProtocol.preparePacket(kissProtocol.MOTOR_TEST, tmp))
    }
    if (callback) callback();
};


