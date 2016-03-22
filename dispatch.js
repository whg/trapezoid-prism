
outlets = 3;
var DIM = 4;

var DIM2 = DIM * DIM;
var TOTAL_LIGHTS = DIM2 * DIM

function tripletIndex(x, y, z) {
	return x * DIM * DIM + y * DIM + z;
}

var gFrameCount = 0;

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
				if (x > 1) ay = y;
				else ay = 3 - y;
				
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

function single(px, py, pz, onCol, offCol) {
	
	if (onCol === undefined) onCol = 1.0;
	if (offCol === undefined) offCol = 0.2;
	
	_sendFuncToAll(function(x, y, z) {
			return color(x == px && y == py && z == pz ? 1 : 0.2);
	});
}

function anything() {
    var toforward = arrayfromargs(messagename, arguments);
	_sendArgToAll(toforward);
}

//var _breathe = new Breathe();
//var _wave = new Wave();

var modes = {
	"black": new Black(),
	"breathe": new Breathe(),
//	"wave": new Wave(),
	"colourWheel": new ColourWheel(),
//	"midi": new MIDI(),
};

var interactives = {
	"wave": new Wave(),
	"midi": new MIDI(),
	"mexican": new Mexican(),
};

var mainFrameBuffer = new FrameBuffer();

var currentModeName = "black";

function bang() {
	
			
	
	
	mainFrameBuffer.reset();
	
	if (currentModeName !== null && modes[currentModeName] !== undefined) {
		var mode = modes[currentModeName];
		mainFrameBuffer.add(modes[currentModeName].buffer);
		mode.frameCallback(gFrameCount);
	}
	
		
//	_sendFuncToAll(mode.callback);	

	var start = (new Date()).getTime();
	
	
	for (var key in interactives) {
		interactive = interactives[key];
		interactive.frameCallback.call(interactive, gFrameCount);
		mainFrameBuffer.add(interactives[key].buffer);
	}

	_sendFuncToAll(mainFrameBuffer.callback);

//	post((new Date()).getTime() - start);
//	post();
	
	
	gFrameCount++;
}

function color() {
	// always give at least one argument
	var r = arguments[0], g, b, a;
	var al = arguments.length;

	if (al < 3) { g = r; b = r; }
	else { g = arguments[1]; b = arguments[2]; }
			
	if (al == 2) a = arguments[1];
	else if (al == 4) a = arguments[3];
	else a = 1;
	
	if (a !== 1) { r*= a; g*= a; b*= a; }

	// emulating LEDs so alpha always 1
	return ["gl_color", r, g, b];	
}

function FrameBuffer() {
	this.buffer = [];
	var that = this;
	
	for (var i = 0; i < TOTAL_LIGHTS; i++) {
		this.buffer.push(["gl_color", 0, 0, 0]);
	}
	
	this.reset = function() {
		for (var i = 0; i < TOTAL_LIGHTS; i++) {
			for (var j = 1; j < 4; j++) {
				that.buffer[i][j] = 0;
			}
		}
	};
	
	this.clear = this.reset;
	
	this.add = function(otherBuffer) {
		for (var i = 0; i < TOTAL_LIGHTS; i++) {
			for (var j = 1; j < 4; j++) {
				that.buffer[i][j] = Math.min(1.0, Math.max(that.buffer[i][j], otherBuffer[i][j]));
			}
		}
	};
	
	this.callback = function(x, y, z) {	
		return that.buffer[x * DIM2 + y * DIM + z];
	};
	
	this.frameCallback = function(frameNum) {};
	
}

function extend(subclass, superclass) {
    for (var key in superclass) {
        subclass[key] = superclass[key];
    }
    return subclass;
}

function Black() {
	extend(this, new FrameBuffer());
}

function ColourWheel() {
	
	extend(this, new FrameBuffer());
	var that = this;
	var theta = 0;
	
//	this.callback = (function(x, y, z) {
//		return ["gl_color", Math.sin(theta + x)*0.5+0.5, Math.cos(theta*0.3+z)*0.5+0.5, Math.sin(theta*0.1)*0.5+0.5];
//	});

	
	
	this.frameCallback = function(frameCount) {
		
		var x, z;
		for (var i = 0; i < TOTAL_LIGHTS; i++) {
			z = i % 4;
			x = i / DIM2;
			that.buffer[i] = color(Math.sin(theta + x)*0.5+0.5, Math.cos(theta*0.3+z)*0.5+0.5, Math.sin(theta*0.1)*0.5+0.5, 0.5);
		}
		
		theta = frameCount * 0.3;
		theta+= 1 + Math.sin(frameCount*0.01) * 0.3;
	}
	
}

function Breathe() {
	
	extend(this, new FrameBuffer());
	var that = this;
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
	

	this.frameCallback = function(frameNum) {
		var v = Math.sin(frameNum*0.1) * 0.5 + 0.5;
		if (v < delta && canChange) {
			canChange = false;
			colourCounter = (colourCounter + 1) % colours.length;
		}
		if (v > 0.5 && !canChange) {
			canChange = true;
		}
		for (var i = 0; i < TOTAL_LIGHTS; i++) {
			that.buffer[i] = color.apply(null, colours[colourCounter].concat([v]));
		}

	};
}


function Wave() {
	
	extend(this, new FrameBuffer);
	var that = this;
	
	var play = false;
//	var counter = 0;
	var counters = {};
	
	
	this.frameCallback = function(frameNum) {

		for (var i = 0, l = that.buffer.length; i < l; i++) {
			that.buffer[i][1] = 0; that.buffer[i][2] = 0; that.buffer[i][3] = 0;
		}
		
		var todelete = [];
		for (var counterId in counters) {
			if (counters[counterId] > 1) {
				todelete.push(counterId);
			}
		}
		
		for (var i = 0, l = todelete.length; i < l; i++) {
			delete counters[todelete[i]];
		}
		
		for (var counterId in counters) {
			
			var counter = counters[counterId];
			for (var i = 0, l = that.buffer.length; i < l; i++) {
				y = Math.floor(i / 4) % 4;
			
				if (counter <= 1) {
					var dist = 1;
					var adjy = y * 0.25;
					dist = Math.abs(counter - adjy);

	
					var newcol = color(1-dist); //y == q ? 1 : 0);
					for (var j = 1; j < 4; j++) {
						that.buffer[i][j] += Math.min(newcol[j], 1);
					}
				}

				for (var j = 1; j < 4; j++) {
					that.buffer[i][j] = Math.max(0, that.buffer[i][j] - 0.1);
				}
			}
		
			counters[counterId]+= 0.1;
		}
		
	};
	
	this.go = function(pitch, velocity) {
		if (velocity > 0) {
			play = true;
			counters[gFrameCount] = 0;
		}
	};
	
	
}

function Mexican() {
	extend(this, new FrameBuffer());

	var XSTEP_DEFAULT = 5;
	var xstep = XSTEP_DEFAULT, zstep = 0;
	var DIMx2 = DIM * 2;
	var counter = 0;
	
	this.frameCallback = function(frameCount) {
		
		if (counter > 9) {
			this.clear();
			return;
		}
		
		var index;
		var xpos = 0, zpos = 0;
		for (var x = 0; x < DIM; x++) {
			
			for (var y = 0; y < DIM; y++) {
				for (var z = 0; z < DIM; z++) {
					zpos = (z + zstep) % 4;
					index = x * 16 + y * 4 + z;
//					xpos = 
					xpos = (x + xstep + (z + 2)) % DIMx2;
					if (xpos >= DIM) {
						xpos = DIMx2 - xpos;
					}
					this.buffer[index] = color(y >= ((xpos)%5) ? 0 : 1); 
				}
			}
		}
 		
		if (frameCount % 2 == 0) {
			xstep++;
			
			counter++;
		}
		if (frameCount % 11 == 0) {
			zstep++;
		}
		//0,1,2,3,2,1
	};
	
	this.go = function(pitch, velocity) {
	    xstep = XSTEP_DEFAULT+pitch;
		counter = 0;
	};
}

function MIDI() {

	extend(this, new FrameBuffer());

	this.modeNames = ["single", "zline", "yline", "travel"];
	this.mode = this.modeNames[2];
	var that = this;
	
	var travelIndices = Array.apply(null, Array(DIM2)).map(function(e) { return DIM; });
	
	
	this.callback = function(x, y, z) {	
		return that.buffer[x * DIM2 + y * DIM + z];
	};
	
	this.receive = function(note, velocity) {
		var col = color(velocity / 127.0);
		
		if (this.mode === "single") {
			// treat note as index and velocity as brightness
			that.buffer[note % TOTAL_LIGHTS] = color(velocity / 127.0);
		}
		else if (this.mode === "zline") {
			var n = note % DIM2 * DIM;
			for (var z = 0; z < DIM; z++) {
				that.buffer[n + z] = col;
			}
		}
		else if (this.mode === "yline") {
			var n = note % DIM2;
			n = n % 4 + Math.floor(n/4)*16;
			for (var y = 0; y < DIM; y++) {
				that.buffer[n + y*4] = col;
			}
		}
		else if (this.mode === "travel") {
			var n = note % DIM2 * DIM;
			that.buffer[n] = color(velocity / 127.0);
		}
	};
	
	this.frameCallback = function(frameNum) {
		
		if (this.mode == "travel" && frameNum % 2 == 0) {
			var z;
			for (var x = 0; x < DIM; x++) {
				for (var y = 0; y < DIM; y++) {
					z = x * DIM2 + y * DIM;
					
					for (var nz = z + 3; nz > z; nz--) {
						that.buffer[nz] = that.buffer[nz-1];
					}
					that.buffer[z] = color(0);

				}
			}

		}
	};
};

function note(pitch, velocity) {
	interactives["midi"].receive(pitch, velocity);
}

function _midi(_name, pitch, velocity) {
	interactives["midi"].mode = _name;
	interactives["midi"].receive(pitch, velocity);
}


function zline(pitch, vel) { _midi(messagename, pitch, vel); }
function yline(pitch, vel) { _midi(messagename, pitch, vel); }
function dots(pitch, vel) { _midi(messagename, pitch, vel); }
function travel(pitch, vel) { _midi(messagename, pitch, vel); }



function midimode(arg) {
	var midi = interactives["midi"];
	if (midi.modeNames.indexOf(arg) != -1) {
		midi.mode = arg;
	}
}



function wave(pitch, velocity) {
	interactives["wave"].go.call(interactives["wave"], pitch, velocity);
}

function none() {
	currentModeName = null;
}

function breathe() {
	currentModeName = messagename;
}

function colourWheel() {
	currentModeName = messagename;
}

function black() {
	currentModeName = messagename;
}

function _interactiveGo(n, pitch, velocity) {
	interactives[n].go.call(interactives[n], pitch, velocity);
};

function mexican(pitch, velocity) {
	if (velocity > 0) {
		_interactiveGo(messagename, pitch, velocity);
	}
}

