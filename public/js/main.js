
	var socket = io.connect();
	var stats = [];
	
	var g1 = new JustGage({
        id: 'g1',
        value: 45,
        min: 0,
        max: 100,
        symbol: '%',
        pointer: true,
        pointerOptions: {
          toplength: -15,
          bottomlength: 10,
          bottomwidth: 12,
          color: '#34425A',
          stroke: '#ffffff',
          stroke_width: 3,
          stroke_linecap: 'round'
        },
		customSectors: [{
          color: '#95273E',
          lo: 50,
          hi: 100
        }, {
          color: '#6DBAA0',
          lo: 0,
          hi: 50
        }],
		title: "CPU Usage",
		titleFontFamily: "Ubuntu",
		valueFontFamily: "Ubuntu",
		labelFontFamily: "Ubuntu",
		valueFontColor: "#333",
		titleFontColor: "#333",
        gaugeWidthScale: 0.6,
        counter: true
    });
	
	var g2 = new JustGage({
        id: 'g2',
        value: 45,
        min: 0,
        max: 100,
        symbol: '%',
        pointer: true,
        pointerOptions: {
          toplength: -15,
          bottomlength: 10,
          bottomwidth: 12,
          color: '#34425A',
          stroke: '#ffffff',
          stroke_width: 3,
          stroke_linecap: 'round'
        },
		title: "Memory Usage",
		titleFontFamily: "Ubuntu",
		valueFontFamily: "Ubuntu",
		labelFontFamily: "Ubuntu",
		valueFontColor: "#333",
		titleFontColor: "#333",
		label: "",
        gaugeWidthScale: 0.6,
        counter: true
    });
	  
	window.onbeforeunload = function(e) {
		socket.close();
		socket.disconnect();
	};
	
	socket.on('system_status',function(data){
	
		g1.refresh(data[2]); //CPU gage

        g2.refresh(Math.round(data[0]/data[1]*100)); //Memory gage
		g2.txtLabel.attr({
			"text": ""+data[0]+"/"+data[1]+" Mb"
		});
		
	});
	