"use strict";

const helper = require("./helper");

class Point {
	constructor(root, index) {
		this.root = root;
		this.index = index;
		
		this.ctx = root.ctx;
		this.style = root.style;
		
		this.x = root.vertices[index][0];
		this.y = root.vertices[index][1];
		this.id = root.vertices[index][2] || 0;

		this.style = root.style[this.id] || {};

		this.commons = [];
		this.variants = [];
		this.dtCommons = [];

		this.isStart = false;
	}
	newLineAnimation() {
		if(!this.commons.length) return;

		var i = helper.randRange(0, this.commons.length-1);
		this.dtCommons.push([{x: this.x, y: this.y}, this.commons[i]]);
		this.commons.splice(i, 1);
	}

	start() {
		this.isStart = true;
	}

	update() {
		if(this.isStart) {
			if(helper.randRange(0, this.root.probability) === 0) 
				this.newLineAnimation();

			this.animation();
		}
	}
	animation() {
		for(let i = 0; i < this.dtCommons.length; i++) {
			if(this.dtCommons[i][2]) continue;

			var dt = this.dtCommons[i];
			dt[0].x = helper.lerp(dt[0].x, dt[1].x, this.root.speed);
			dt[0].y = helper.lerp(dt[0].y, dt[1].y, this.root.speed);


			if(helper.compare(dt[0].x, dt[1].x, 1) && helper.compare(dt[0].y, dt[1].y, 1)) {
				this.dtCommons[i][2] = true;
				dt[1].start();
			}
		}
	}

	draw() {
		if(!this.isStart) return;

		if(this.id === 0) {
			for(let key in this.root.style[0]) {
				this.ctx[key] = this.root.style[0][key];
			}
		}

		for(let i = 0; i < this.dtCommons.length; i++) {

			if(this.id !== 0 && this.id === this.dtCommons[i][1].id) {
				for(let key in this.root.style[this.id]) {
					this.ctx[key] = this.root.style[this.id][key];
				}
			}

			this.ctx.beginPath();
			this.ctx.moveTo(this.x, this.y);
			this.ctx.lineTo(this.dtCommons[i][0].x, this.dtCommons[i][0].y, 0, 0, 2*Math.PI);		
			this.ctx.stroke();
		}
		

		if(this.ctx.isRenderPoint) {
			this.ctx.arc(this.x, this.y, this.ctx.radiusPoint || 2.5, 0, 2*Math.PI);
			this.ctx.fill();
		}
	}

	resize() {	
		this.x = this.root.vertices[this.index][0]*this.root.zoom;
		this.y = this.root.vertices[this.index][1]*this.root.zoom;
	}
}

module.exports = Point;