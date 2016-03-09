
outlets = 4;
var DIM = 4;

function bang() {
	for (var x = 0; x < DIM; x++) {
		for (var y = 0; y < DIM; y++) {
			for (var z = 0; z < DIM; z++) {
				outlet(3, z);
				outlet(2, y);
				outlet(1, x);
				outlet(0, "bang");
			}
		}
	}	
}



