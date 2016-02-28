var WebSocket = require('ws');
var ws = new WebSocket('ws://localhost:8001');

var SerialPort = require("serialport").SerialPort
var sp = new SerialPort("/dev/ttyACM0", { baudrate: 115200 });

ws.on('open', function() {
	console.log("Connection open...");
	ws.send("abcde");
});

pinModes = [];

for (var i=0; i<14; i++) {
	pinModes[i] = "IN";
}

function sendCommand(pin, value, command) {
	var buf = new Buffer(3);
	buf.writeUInt8(pin, 0);
	buf.writeUInt8(value, 1);
	buf.writeUInt8(command, 2);
	//console.log(buf);
	sp.write(buf);
}

function pinMode(pin, mode) {
	//console.log("Mode for "+pin+" = "+mode);	
	var val = 0;
	
	pinModes[pin] = mode;

	switch(mode) {
	case "IN":	val = 1; break;
	case "OUT":	val = 0; break;
	default:	return;
	}

	sendCommand(pin, val, 1);
}

function writeDigitalPin(pin, val) {
	//console.log("Value for "+pin+" = "+val);

	if (val > 255) val = true;
	if (val < 0) val = false;

	var type = typeof val;
	if (type == "boolean") {
		if (pinModes[pin] != "OUT") {
			pinMode(pin, "OUT");
		}
		sendCommand(pin, (val) ? 1 : 0, 3);
	} else if (type == "number") {
		if (pinModes[pin] != "OUT") {
				pinMode(pin, "OUT");
		}
		sendCommand(pin, val, 4);
	}
}

ws.on('message', function(data, flags) {
	var struct = JSON.parse(data);

	for (var i=0; i<struct.length; i++) {
		if (struct[i].code && struct[i].code.action == "assign") {
			var name = struct[i].code.symbol;
			var val = struct[i].code.value;

			// Send change to arduino device...
			var components = name.split("_");
			if (components.length >= 2 && components[0] == "arduino") {
				if (components[1] == "input") {
					if (components.length == 3 && components[2].charAt(0) == "d") {
						if (val) pinMode(parseInt(components[2].substring(1)), "IN");
						else pinMode(parseInt(components[2].substring(1)), "OUT");
					}
				} else if (components[1].charAt(0) == "d") {
					writeDigitalPin(parseInt(components[1].substring(1)), val);
				} else if (components[1] == "enabled") {
					if (components.length == 3 && components[2].charAt(0) == "a") {
						if (val) {
							sendCommand(50+parseInt(components[2].substring(1)), 1, 1);
						} else {
							sendCommand(50+parseInt(components[2].substring(1)), 0, 1);
						}
					}
				} else if (components[1] == "servo" && components[2] == "d9" && val) {
					sendCommand(9, 1, 5);
				}
			}
		}
	}
});

var cacheData = [];

function processSerialData(obj) {
	var pin = obj[0];

	if (pin < 50) {
		var val = obj[1];
		ws.send(JSON.stringify({action: "assign", symbol: "arduino_d"+pin, value: (val > 0) ? true : false}));
	} else {
		var val = obj[1] + (obj[2]*256);
		ws.send(JSON.stringify({action: "assign", symbol: "arduino_a"+(pin-50), value: val}));
	}
}

sp.on('data', function(data) {
	var i = 0;

	while (i < data.length) {
		if (cacheData.length == 0) {
			cacheData.push(data[i]);
			i++;
		}

		var pin = cacheData[0];
		var expect = (pin < 50) ? 2 : 3;

		while (i < data.length && cacheData.length < expect) {
			cacheData.push(data[i]);
			i++;
		}

		if (expect == cacheData.length) {
			processSerialData(cacheData);
			cacheData = [];
		}
	}
});

