# PolyRun.js
![main.gif](https://github.com/AZbang/media-storage/blob/master/PolyRun.js/main.gif)
> **Javascript library to visualize the effect of Delaunay triangulation.**

# Installing
* **NPM**: `npm i poly_run --save`
* **BOWER**: `bower i poly_run --save`

# Getting started
```javascript
var poly = PolyRun.add('poly', {
	// canvas and parent element
	parent: document.body,
	view: document.getElementById('paper'),
	
	// size canvas 
	w: window.innerWidth,
	h: window.innerHeight, 

	generate: true, // auto generation points
	// if you need your points
	// vertices: [[x, y, id], [x, y, id]] 
	
	cell: 100, // cell for points
	compress: 6, // distance between the points
	
	autoStart: true, // without poly.start(startPoint);
	startPoint: 50, // the point at which the animation starts
	speed: 0.1, // animation speed
	probability: 10, // probability of connection with another point
	acceleration: 0.00001, // animation acceleration
	
	// utils
	animCounterSpeed: 0.1, // speed counter for animation render
	animCounterMax: 10, // max value counter
	
	// each point has an id, if it is not or points generated automatically, id = 0
	// if the method is not specified then it will use the default renderer
	render: {
		// id
		0: {
			// p = current point, {x1, y1} -> {x2, y2}
			renderLine: (p, x1, y1, x2, y2) => {
				p.ctx.strokeStyle = '#283648';
				p.ctx.lineWidth = 1.5;
				
				p.ctx.beginPath();
				p.ctx.moveTo(x1, y1);
				p.ctx.lineTo(x2, y2);		
				p.ctx.stroke();
			},
			
			// p = current point, x and y = coords point
			renderPoint: (p, x, y) => {
				p.ctx.fillStyle = '#333';
				p.ctx.beginPath();
				p.ctx.arc(x, y, 3, 0, 2*Math.PI);
				p.ctx.fill();
					
				p.ctx.strokeStyle = '#283648';
				p.ctx.lineWidth = 2;

				p.ctx.beginPath();
				
				// animationCounter for custom animation (something like a TWEEN.Linear)
				p.ctx.arc(x, y, p.animCounter, 0, 2*Math.PI);
				p.ctx.stroke();
			}
		}
	}
});

// your RAF
var loop = function() {
	PolyRun.update();
	requestAnimationFrame(loop);
}
  
loop();
```
