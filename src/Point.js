"use strict";

const helper = require("./helper");

class Point {
	constructor(root, index) {
		this.root = root;
		this.index = index;

		this.x = root.vertices[index][0];
		this.y = root.vertices[index][1];
		this.id = root.vertices[index][2] || 0;

		this.style = root.render[this.id] || {};
		this.commons = [];
		this.variants = [];
		this.dtCommons = [];

		this.isStart = false;

		this._tickerCounter = 0;

		// helpers
		this.animCounter = 0;
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
			this._tickerCounter++;

			if(this._tickerCounter >= this.root.probability) {
				this._tickerCounter = 0;
				this.newLineAnimation();
			}

			this.animation();
		}
	}
	animation() {
		this.animCounter = helper.lerp(this.animCounter, this.root.animCounterMax, this.root.animCounterSpeed);

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

		for(let i = 0; i < this.dtCommons.length; i++) {
			if(this.style.renderLine && this.id === this.dtCommons[i][1].id) {
				this.style.renderLine(this, this.x, this.y, this.dtCommons[i][0].x, this.dtCommons[i][0].y);
			}
		}

		if(this.style.renderPoint)
			this.style.renderPoint(this, this.x, this.y);
	}

	resize() {
		this.x = this.root.vertices[this.index][0]*this.root.zoom;
		this.y = this.root.vertices[this.index][1]*this.root.zoom;
	}
}

module.exports = Point;
