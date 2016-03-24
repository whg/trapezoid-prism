
outlets = 3;
var DIM = 4;

var DIM2 = DIM * DIM;
var TOTAL_LIGHTS = DIM2 * DIM

function tripletIndex(x, y, z) {
	return x * DIM * DIM + y * DIM + z;
}

var gFrameCount = 0;
var gVelocityIsBrightness = false;

function _sendArgToAll(arg) {
	_sendFuncToAll(function(x, y, z) { return arg; });	
}

function _sendFuncToAll(callback, object) {
	var x, y, z, ay, col;
	var colours = [];
	for (z = 0; z < DIM; z++) {
		for (x = 0; x < DIM; x++) {
			for (y = 0; y < DIM; y++) {
				
				// adjust y so that's in the right order for the device
				if (x > 1) ay = y;
				else ay = 3 - y;
				
				outlet(1, "send", x + "-" + ay + "-" + z);
				col = callback.call(object, x, ay, z)
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
	"particles": new Particles(),
	"audio" : new Audio(),
};

var mainFrameBuffer = new FrameBuffer();

var currentModeName = "black";

function bang() {
	
	mainFrameBuffer.reset();
	
	if (currentModeName !== null && modes[currentModeName] !== undefined) {
		var mode = modes[currentModeName];
		mainFrameBuffer.add.call(mainFrameBuffer, modes[currentModeName].buffer);
		mode.frameCallback.call(mode, gFrameCount);
	}
	
	var start = (new Date()).getTime();
	
	
	for (var key in interactives) {
		interactive = interactives[key];
		interactive.frameCallback.call(interactive, gFrameCount);
		mainFrameBuffer.add.call(mainFrameBuffer, interactives[key].buffer);
	}

	_sendFuncToAll(mainFrameBuffer.callback, mainFrameBuffer);
	
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
	
	for (var i = 0; i < TOTAL_LIGHTS; i++) {
		this.buffer.push(["gl_color", 0, 0, 0]);
	}
	
	this.reset = function() {
		for (var i = 0; i < TOTAL_LIGHTS; i++) {
			for (var j = 1; j < 4; j++) {
				this.buffer[i][j] = 0;
			}
		}
	};
	
	this.clear = this.reset;
	
	this.add = function(otherBuffer) {
		for (var i = 0; i < TOTAL_LIGHTS; i++) {
			for (var j = 1; j < 4; j++) {
				this.buffer[i][j] = Math.min(1.0, Math.max(this.buffer[i][j], otherBuffer[i][j]));
			}
		}
	};
	
	this.callback = function(x, y, z) {	
		return this.buffer[x * DIM2 + y * DIM + z];
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
	var theta = 0;
	
	this.frameCallback = function(frameCount) {
		
		var x, z;
		for (var i = 0; i < TOTAL_LIGHTS; i++) {
			z = i % 4;
			x = i / DIM2;
			this.buffer[i] = color(Math.sin(theta + x)*0.5+0.5, Math.cos(theta*0.3+z)*0.5+0.5, Math.sin(theta*0.1)*0.5+0.5, 0.5);
		}
		
		theta = frameCount * 0.3;
		theta+= 1 + Math.sin(frameCount*0.01) * 0.3;
	}
	
}

function Breathe() {
	
	extend(this, new FrameBuffer());
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
			this.buffer[i] = color.apply(null, colours[colourCounter].concat([v]));
		}

	};
}


function Wave() {
	
	extend(this, new FrameBuffer);
	
	var play = false;
	var counters = {};
	var colour = [1, 1, 1];
	
	this.frameCallback = function(frameNum) {

		for (var i = 0, l = this.buffer.length; i < l; i++) {
			this.buffer[i][1] = 0; this.buffer[i][2] = 0; this.buffer[i][3] = 0;
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
			for (var i = 0, l = this.buffer.length; i < l; i++) {
				y = Math.floor(i / 4) % 4;
			
				if (counter <= 1) {
					var dist = 1;
					var adjy = y * 0.25;
					dist = Math.abs(counter - adjy);
					var brightness = 1 - dist;
	
					var newcol = color(colour[0] * brightness, colour[1] * brightness, colour[2] * brightness); //y == q ? 1 : 0);
					for (var j = 1; j < 4; j++) {
						this.buffer[i][j] += Math.min(newcol[j], 1);
					}
				}

				for (var j = 1; j < 4; j++) {
					this.buffer[i][j] = Math.max(0, this.buffer[i][j] - 0.1);
				}
			}
		
			counters[counterId]+= 0.1;
		}
		
	};
	
	this.go = function(pitch, velocity, r, g, b) {
		if (velocity > 0) {
			play = true;
			counters[gFrameCount] = 0;
		}
		colour = [r,g,b];
	};
	
	
}

function Mexican() {
	extend(this, new FrameBuffer());

	var XSTEP_DEFAULT = 5;
	var xstep = XSTEP_DEFAULT, zstep = 0;
	var DIMx2 = DIM * 2;
	var counter = 10;
	var colour = [1,1,1];
	
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
					this.buffer[index] = color.apply(null, y >= ((xpos)%5) ? [0, 0, 0] : colour);
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
	
	this.go = function(pitch, velocity, r, g, b) {
	    xstep = XSTEP_DEFAULT+pitch;
		counter = 0;
		colour = [r, g, b];
	};
}

function Vec3(x, y, z) {
	var dim = 3;
	this.data = [x, y, z];
	
	this.add = function(vector) {
		for (var i = 0; i < dim; i++) {
			this.data[i]+= vector.data[i];
		}
	};
	
	this.sub = function(vector) {
		for (var i = 0; i < dim; i++) {
			this.data[i]-= vector.data[i];
		}
	};
	
	this.mult = function(vector) {
		for (var i = 0; i < dim; i++) {
			this.data[i]*= vector.data[i];
		}
	};
	
	this.dist = function(vector) {
		var d, sum = 0;
		for (var i = 0; i < dim; i++) {
			d = this.data[i] - vector.data[i];
			sum+= d * d;
		}
		return Math.sqrt(sum);
	};
	
	this.length = function() {
		return this.dist(new Vec3(0, 0, 0));
	};
	
	this.normalise = function() {
		var l = this.length();
		for (var i = 0; i < dim; i++) {
			this.data[i]/= l;
		}
	};
};

function Particle(pos, vel, col, spread) {
	this.pos = pos;
	this.vel = vel;
	this.col = col;
	this.spread = spread || 0.2;
	
	this.update = function() {
		this.pos.add.call(this.pos, this.vel);
	};
};

function Particles() {
	extend(this, new FrameBuffer());
	
	var particles = { };//90: new Particle(new Vec3(1, 1, 1), new Vec3(0, 0.1, 0), [1,1,1]) };

	this.frameCallback = function(frameNum) {
		this.clear();
		drawing = true;
		for (var key in particles) {
			var particle = particles[key];
			var x, y, z;
			for (var n = 0; n < TOTAL_LIGHTS; n++) {
				x = Math.floor(n / DIM2), y = Math.floor(n / DIM % 4), z = n % DIM;
				var brightness = Math.max(0, 1.0 - particle.pos.dist(new Vec3(x, y, z)) * particle.spread);
				if (brightness < 0.01) continue;
//				var newcol = color(brightness * particle.col[0], brightness * particle.col[1], brightness * particle.col[2]);
				for (var c = 0; c < 3; c++) {
					this.buffer[n][c+1] = Math.min(1.0, this.buffer[n][c+1] + brightness * particle.col[c]);
				}
//				this.buffer[n] = newcol;
			}
			particle.update();
			
		}
		

		if (frameNum % 5 == 0) {
			removeDead();
		}
	};
	
	function createRandomParticle(pitch, vel) {
		
		//create two random numbers and make a 3 element array with a zero somewhere
		var pos = [Math.random() * DIM, b = Math.random() * DIM];
		var zeroIndex = Math.floor(Math.random(DIM));
		pos.splice(zeroIndex, 0, Math.random() < 0.5 ? DIM-1 : 0);
		
		var position = new Vec3(pos[0], pos[1], pos[2]);
		var c = (DIM - 1) / 2;
		var velocity = new Vec3(c, c, c);
		velocity.sub(position);
		velocity.normalise();
		var speed = 1.0 - vel / 127.0;
		velocity.mult(new Vec3(speed, speed, speed));
		return new Particle(position, velocity);
	}
		
	
	this.go = function(pitch, velocity, r, g, b, q) {	
		if (velocity > 1) {			
			particles[pitch] = createRandomParticle(pitch, velocity);
			particles[pitch].col = [r, g, b];
			particles[pitch].spread = q;
		}
		else {
			// delete particles[pitch];
		}
		
	};
		
	function removeDead() {
		var margin = 6;
		var toErase = [];
		for (var key in particles) {
			var particle = particles[key];
			var erase = false;
			for (var d = 0; d < DIM; d++) {
				var p = particle.pos.data[d];
				if (p < -margin || p >= DIM + margin) {
					toErase.push(key);
					break;
				}
			}	
		}
		
		toErase.forEach(function(index) {
			delete particles[index];
		});
	}
}


function MIDI() {

	extend(this, new FrameBuffer());

	this.modeNames = ["dots", "zline", "yline", "travel"];
	this.mode = this.modeNames[2];
	this.q = 1;
	
	var travelIndices = Array.apply(null, Array(DIM2)).map(function(e) { return DIM; });
	this.colour = [1, 1, 1];
	
	this.receive = function(note, velocity) {

		var col;
 		if (gVelocityIsBrightness) {
			col = color.apply(null, this.colour.concat(velocity / 127.0));
		}
		else {
			col = color.apply(null, this.colour.concat(velocity == 0 ? 0 : 1));
		}

		if (this.mode === "dots") {
			// treat note as index and velocity as brightness
			this.buffer[note % TOTAL_LIGHTS] = col;
		}
		else if (this.mode === "zline") {
			var n = note % DIM2 * DIM;
			for (var z = 0; z < DIM; z++) {
				this.buffer[n + z] = col;
			}
		}
		else if (this.mode === "yline") {
			var n = note % DIM2;
			n = n % 4 + Math.floor(n/4)*16;
			for (var y = 0; y < DIM; y++) {
				this.buffer[n + y*4] = col;
			}
		}
		else if (this.mode === "travel") {
			var n = note % DIM2 * DIM;
			this.buffer[n] = col;
		}
	};
	
	this.frameCallback = function(frameNum) {
		
		if (this.mode == "travel" && frameNum % Math.floor(this.q*6+1) == 0) {
			var z;
			for (var x = 0; x < DIM; x++) {
				for (var y = 0; y < DIM; y++) {
					z = x * DIM2 + y * DIM;
					
					for (var nz = z + 3; nz > z; nz--) {
						this.buffer[nz] = this.buffer[nz-1];
					}
					this.buffer[z] = color(0);

				}
			}

		}
	};
	
	this.setColour = function(r, g, b) {
		this.colour = [r, g, b];
	};
	
};

function Audio() {
	extend(this, new FrameBuffer());
	
	this.update = function(val) {
		val *= DIM;
		var floor = Math.floor(val)
		var fraction = val - floor;
		for (var i = 0; i < TOTAL_LIGHTS; i++) {
			var y = Math.floor(i / DIM) % 4;
			if (y < floor) {
				this.buffer[i] = color(1);
			}
			else if (y < val) {
				this.buffer[i] = color(val - floor);
			}
			else {
				this.buffer[i] = color(0);
			}
			//this.buffer[i] = color(1);
		}
		//this.buffer[0] = color(1);
		post(val, floor, fraction);
		post();
	};
}

function note(pitch, velocity) {
	interactives["midi"].receive(pitch, velocity);
}

function _midi(_name, pitch, velocity, r, g, b, q) {
	var midi = interactives["midi"];
	midi.mode = _name;
	midi.setColour.call(midi, r, g, b);
	midi.receive(pitch, velocity);
	midi.q = q;
}


function zline(pitch, vel, r, g, b) { _midi(messagename, pitch, vel, r, g, b); }
function yline(pitch, vel, r, g, b) { _midi(messagename, pitch, vel, r, g, b); }
function dots(pitch, vel, r, g, b) { _midi(messagename, pitch, vel, r, g, b); }
function travel(pitch, vel, r, g, b, q) { _midi(messagename, pitch, vel, r, g, b, q); }



function midimode(arg) {
	var midi = interactives["midi"];
	if (midi.modeNames.indexOf(arg) != -1) {
		midi.mode = arg;
	}
}



function wave(pitch, velocity, r, g, b) {
	interactives["wave"].go.call(interactives["wave"], pitch, velocity, r, g, b);
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

function _interactiveGo(n, pitch, velocity, r, g, b, q) {
	interactives[n].go.call(interactives[n], pitch, velocity, r, g, b, q);
};

function mexican(pitch, velocity, r, g, b) {
	if (velocity > 0) {
		_interactiveGo(messagename, pitch, velocity, r, g, b);
	}
}

function particles(pitch, velocity, r, g, b, q) {
	_interactiveGo(messagename, pitch, velocity, r, g, b, q);
}

function up(value) {
	interactives["audio"].update.call(interactives["audio"], value);
}

function clear() {
	for (var key in interactives) {
		interactive = interactives[key];
		interactive.clear.call(interactive);
	}
}

function velisbright(v) {
	gVelocityIsBrightness = v != 0;
}