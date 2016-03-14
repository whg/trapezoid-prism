
outlets = 3;
var DIM = 4;

var DIM2 = DIM * DIM;
var TOTAL_LIGHTS = DIM2 * DIM

function tripletIndex(x, y, z) {
	return x * DIM * DIM + y * DIM + z;
}

var frameCount = 0;

function _sendArgToAll(arg) {
	_sendFuncToAll(function(x, y, z) { return arg; });	
}

function _sendFuncToAll(callback) {
	var x, y, z, ay, col;
	var colours = [];
	for (z = 0; z < DIM; z++) {
		for (x = 0; x < DIM; x++) {
			for (y = 0; y < DIM; y++) {
				
				// adjust y so that's in the right order for the device
				if (x > 1) ay = 3 - y;
				else ay = y;
				
				outlet(1, "send", x + "-" + ay + "-" + z);
				col = callback(x, ay, z)
				outlet(0, col);
				
				colours.push.apply(colours, col.slice(1, 4));
			}
		}
	}	
	
	_sendToDevice(colours);
}

function _sendToDevice(colours) {
	
	var STX = 23, ETX = 24;
	
	var sum = 0;
	for (var i = 0, l = TOTAL_LIGHTS * 3; i < l; i++) {
		colours[i] = Math.floor(colours[i] * 255);
		sum+= colours[i];
	}
	var checksum = sum % 255;
	
	outlet(2, [STX].concat(colours, [checksum, ETX]));
}

function msg_int(v) {
	post("msg_int", v);
	post();
}

function single(px, py, pz) {
	_sendFuncToAll(function(x, y, z) {
			return color(x == px && y == py && z == pz ? 1 : 0.2);
	});
}


function anything() {
    var toforward = arrayfromargs(messagename, arguments);
	_sendArgToAll(toforward);
}

var _breathe = new Breathe();
var _wave = new Wave();

function bang() {
	
//	colourWheel();
	
	//_sendFuncToAll(_breathe.callback);
	_sendFuncToAll(_wave.callback);
	
	_wave.frameCallback(frameCount);
	
	frameCount++;
}

function color() {
	var r = arguments[0], g, b, a;
	var al = arguments.length;
	if (al < 3) {
		g = r;
		b = r;
	}
	else {
		g = arguments[1];
		b = arguments[2];
	}
	
	if (al == 2) {
		a = arguments[1];
	}
	else if (al == 4) {
		a = arguments[3];
	}
	else {
		a = 1;
	}
	
	if (a !== 1) {
		r*= a; g*= a; b*= a;
	}
	
	// emulating LEDs so alpha always 1
	return ["gl_color", r, g, b, 1];	
}

function colourWheel() {
	var theta = frameCount * 0.3;
	theta*= 1 + Math.sin(frameCount*0.01) * 0.1;
	
	_sendFuncToAll(function(x, y, z) {
		//return ["gl_color", x/DIM, y/DIM, z/DIM];
		return ["gl_color", Math.sin(theta + x)*0.5+0.5, Math.cos(theta*0.3+z)*0.5+0.5, Math.sin(theta*0.1)*0.5+0.5];
	});
	
}

function Breathe() {
	
	var delta = 0.01;
	
	var colours = [
		[1, 0, 0],
		[0, 1, 0],
		[0, 0, 1],
		[1, 0, 1],
	];
	var colourCounter = 0;
	var canChange = true;
	
	var colourArg = colours[0].concat([1]);
	
	this.callback = function(x, y, z) {
		var v = Math.sin(frameCount*0.1) * 0.5 + 0.5;
		if (v < delta && canChange) {
			canChange = false;
			colourCounter = (colourCounter + 1) % colours.length;
		}
		if (v > 0.5 && !canChange) {
			canChange = true;
		}
		return color.apply(null, colours[colourCounter].concat([v]));
	};

}


function Wave() {
	
	var play = false;
//	var counter = 0;
	var counters = {};
	
	this.go = function(frameNum) {
		play = true;
//		counter = 0;
		counters[frameNum] = 0;
	};
	
	var buffer = [];
	for (var i = 0; i < TOTAL_LIGHTS; i++) {
		buffer.push(["gl_color", 1, 0, 0, 1]);
	}
	
	this.callback = function(x, y, z) {
		
		return buffer[x * DIM2 + y * DIM + z];
		
	};
	
	this.frameCallback = function(frameNum) {

		for (var i = 0, l = buffer.length; i < l; i++) {
			buffer[i][1] = 0; buffer[i][2] = 0; buffer[i][3] = 0;
		}
		
		
		for (var counterId in counters) {
			
			var counter = counters[counterId];
//			post(counter);
//			post();
		for (var i = 0, l = buffer.length; i < l; i++) {
			y = i / 4 % 4;
			
			if (counter <= 1) {
				var dist = 1;
				var adjy = y * 0.25;
				if (adjy < counter*4) {
					dist = Math.abs(counter - adjy);
				}

				var newcol = color(1-dist); //y == q ? 1 : 0);
				for (var j = 1; j < 4; j++) {
					buffer[i][j] += Math.min(newcol[j], 1);
				}
			}
			//else {
			for (var j = 1; j < 4; j++) {
				buffer[i][j] = Math.max(0, buffer[i][j] - 0.1);
			}
			//}
			
//			buffer[i] = ["gl_color", 1,0,1,1];
		}
		
		counters[counterId]+= 0.1;
		
		}
		
	//	counter+= 0.1;
	};
	
}

function wave() {
	_wave.go(frameCount);
}
