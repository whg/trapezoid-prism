
outlets = 2;
var DIM = 4;

function _sendtoall(arg) {
	_sendtoallfunc(function(x, y, z) { return arg; });	
}

function _sendtoallfunc(callback) {
	for (var x = 0; x < DIM; x++) {
		for (var y = 0; y < DIM; y++) {
			var id = x + "-" + y;
			for (var z = 0; z < DIM; z++) {
				outlet(1, "send", id + "-" + z);
				outlet(0, callback(x, y, z));
			}
		}
	}	
}

function anything() {
    var toforward = arrayfromargs(messagename, arguments);
	_sendtoall(toforward);
}

var frameCount = 0;

function bang() {
	
	var theta = frameCount * 0.3;
	theta*= 1 + Math.sin(frameCount*0.01) * 0.1;
	
	_sendtoallfunc(function(x, y, z) {
		//return ["gl_color", x/DIM, y/DIM, z/DIM];
		return ["gl_color", Math.sin(theta + x)*0.5+0.5, Math.cos(theta*0.3+z)*0.5+0.5, Math.sin(theta*0.1)*0.5+0.5];
	});
	
	frameCount++;
}