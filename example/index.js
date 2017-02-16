window.onload = function() {
	var poly = PolyRun.add('poly', {
		parent: document.body,
		view: document.getElementById('paper'),

		w: window.innerWidth,
		h: window.innerHeight,

		generate: true,
		autoStart: true,
		cell: 100,
		compress: 6,

		vertices: [],
		startPoint: 50,
		speed: 0.1,
		probability: 10,
		acceleration: 0.00001,

		animCounterSpeed: 0.1,
		animCounterMax: 10,

		render: {
			0: {
				renderLine: (p, x1, y1, x2, y2) => {
					p.ctx.strokeStyle = '#283648';
					p.ctx.lineWidth = 1.5;

					p.ctx.beginPath();
					p.ctx.moveTo(x1, y1);
					p.ctx.lineTo(x2, y2);		
					p.ctx.stroke();
				},
				renderPoint: (p, x, y) => {
					p.ctx.fillStyle = '#333';
					p.ctx.beginPath();
					p.ctx.arc(x, y, 3, 0, 2*Math.PI);
					p.ctx.fill();

					p.ctx.strokeStyle = '#283648';
					p.ctx.lineWidth = 2;

					p.ctx.beginPath();
					p.ctx.arc(x, y, p.animCounter, 0, 2*Math.PI);
					p.ctx.stroke();
				}
			}
		}
	});

	var loop = function() {
		PolyRun.update();
		requestAnimationFrame(loop);
	}

	loop();
}