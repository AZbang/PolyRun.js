window.onload = () => {
	var view = document.getElementById('paper');
	view.width = window.innerWidth;
	view.height = window.innerHeight;
	var ctx = view.getContext('2d');

	var poly = PolyRun.add('poly', {
		parent: document.body,
		view: view,

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

		clear: () => {
			ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
		},
		render: {
			0: {
				renderLine: (p, x1, y1, x2, y2) => {
			    ctx.lineStyle = '#fff';
					ctx.lineWidth = 1.5;

					ctx.beginPath();
					ctx.moveTo(x1, y1);
					ctx.lineTo(x2, y2);
					ctx.stroke();
				},
				renderPoint: (p, x, y) => {
					ctx.fillStyle = '#333';
					ctx.beginPath();
					ctx.arc(x, y, 3, 0, 2*Math.PI);
					ctx.fill();

					ctx.strokeStyle = '#283648';
					ctx.lineWidth = 2;

					ctx.beginPath();

					// animationCounter for custom animation (something like a TWEEN.Linear)
					ctx.arc(x, y, p.animCounter, 0, 2*Math.PI);
					ctx.stroke();
				}
			}
		}
	});

	var loop = () => {
		PolyRun.update();
		requestAnimationFrame(loop);
	}

	loop();
}
