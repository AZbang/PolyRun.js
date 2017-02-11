window.onload = function() {
	PolyRun.add('poly', {
		parent: document.body,
		view: document.getElementById('paper'),

		startPoint: 50,

		w: window.innerWidth,
		h: window.innerHeight,

		cell: 100,
		compress: 6,

		speed: 0.1,
		acceleration: 0.00001,

		style: {
			0: {
				strokeStyle: '#333',
				lineWidth: 2
			}
		}
	});

	var loop = function() {
		PolyRun.update();
		requestAnimationFrame(loop);
	}

	loop();
}