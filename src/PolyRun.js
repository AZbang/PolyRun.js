"use strict";

const delaunay = require("delaunay-fast");
const Point = require("./Point");
const helper = require("./helper");

class PolyRun {
	constructor(config = {}) {
		this.root = config.root;
		this.view = config.view;
		this.ctx = this.view.getContext('2d');

		this.w = this.root.width();
		this.h = this.root.height();

		this.view.width = this.w;
		this.view.height = this.h;
		this.rootScale = config.rootScale || this.w;
		this.zoom = this.w/this.rootScale;

		this.cell = config.cell || 100;

		if(config.vertices)
			this.vertices = config.vertices;
		else this._generateVertices();


		this.animationSpeed = config.animationSpeed || 0.1;
		this.probabilityCreateAnimation = config.probabilityCreateAnimation || 10;
		this.startPoint = config.startPoint;

		this.style = config.style || {};

		this.points = [];
		this.triangles = [];

		this.ACCELERATION_ANIMATION = 0.001;

		this._create();
		this.points[this.startPoint].start();
	}
	_generateVertices() {
		this.vertices = [];

		for(let y = -1; y < Math.round(this.h/this.cell)+1; y++) {
			for(let x = -1; x < Math.round(this.w/this.cell)+1; x++) {
				let posY = helper.randRange(y*this.cell+this.cell/6, (y+1)*this.cell-this.cell/6);
				let posX = helper.randRange(x*this.cell+this.cell/6, (x+1)*this.cell-this.cell/6);

				this.vertices.push([posX, posY]);
			}
		}
	}
	_createPoints() {
		var iterationsControl = 0;
		for(var i = 0; i < this.triangles.length; i++) {
			var points;
			var ind = this.triangles[i];

			iterationsControl++;
			if(!this.points[ind]) this.points[ind] = new Point(this, ind);

			switch(iterationsControl) {
				case 1:
					points = [this.triangles[i+1], this.triangles[i+2]];
					break;
				case 2:
					points = [this.triangles[i-1], this.triangles[i+1]];
					break;
				case 3:
					points = [this.triangles[i-1], this.triangles[i-2]];
					iterationsControl = 0;
					break;
			}

			eachPoints: for(let p = 0; p < points.length; p++) {
				for(let j = 0; j < this.points[ind].commons.length; j++) {
					if(this.points[ind].commons[j] == points[p]) continue eachPoints;
				}
				this.points[ind].commons.push(points[p]);
			}
		}
	}
	_createPointLinks() {
		for(let i = 0; i < this.points.length; i++) {
			for(let p = 0; p < this.points[i].commons.length; p++) {
				this.points[i].commons[p] = this.points[this.points[i].commons[p]];
			}
		}
	}

	_create() {
		this.triangles = delaunay.triangulate(this.vertices);
		this._createPoints();
		this._createPointLinks();
	}
	start() {
		this.loop();
	}

	loop(time) {
		this.update(time);
		this.draw(time);

		requestAnimationFrame(() => this.loop());
	}

	update(time) {
		if(this.animationSpeed < 0.5) this.animationSpeed += this.ACCELERATION_ANIMATION;

		for(let i = this.points.length; i;) {
			--i; this.points[i].update(time);
		}
	}	
	draw(time) {
		this.ctx.clearRect(0, 0, this.w, this.h);

		for(let i = this.points.length; i;) {
			--i; this.points[i].draw(time);
		}
	}
	resize() {
		this.w = this.root.width();
		this.h = this.root.height();
		this.view.width = this.w;
		this.view.height = this.h;
		this.zoom = this.w/this.rootScale;

		for(let i = this.points.length; i;) {
			--i; this.points[i].resize();
		}
	}
}

module.exports = PolyRun;