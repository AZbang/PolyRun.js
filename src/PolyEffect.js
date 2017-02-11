"use strict";

const delaunay = require("delaunay-fast");
const Point = require("./Point");
const helper = require("./helper");

class PolyEffect {
	constructor(config = {}) {
		this.root = config.root;

		this.parent = config.parent;
		this.view = config.view;
		this.ctx = this.view.getContext('2d');

		this.w = config.w || this.parent.offsetWidth;
		this.h = config.h || this.parent.offsetHeight;

		this.view.width = this.w;
		this.view.height = this.h;
		this.rootScale = config.rootScale || this.w;
		this.zoom = this.w/this.rootScale;
		



		this.compress = config.compress || 6;
		this.cell = config.cell || 100;
		this.speed = config.speed || 0.1;
		this.probability = config.probability || 10;
		this.acceleration = config.acceleration || 0.001;
		this.startPoint = config.startPoint || null;
		this.style = config.style || {};


		if(config.vertices)
			this.vertices = config.vertices;
		else this._generateVertices();
		this.points = [];
		this.triangles = [];

		this._create();
		this.startPoint != null && this.start();
	}
	_generateVertices() {
		this.vertices = [];

		for(let y = -1; y < Math.round(this.h/this.cell)+1; y++) {
			for(let x = -1; x < Math.round(this.w/this.cell)+1; x++) {
				let posY = helper.randRange(y*this.cell+this.cell/this.compress, (y+1)*this.cell-this.cell/this.compress);
				let posX = helper.randRange(x*this.cell+this.cell/this.compress, (x+1)*this.cell-this.cell/this.compress);

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
	start(index) {
		this.points[index || this.startPoint].start();
	}

	update() {
		if(this.speed < 0.5) 
			this.speed += this.acceleration;

		for(let i = this.points.length; i;) {
			--i; this.points[i].update();
		}
	}
	draw() {
		this.ctx.clearRect(0, 0, this.w, this.h);

		for(let i = this.points.length; i;) {
			--i; this.points[i].draw();
		}
	}
	resize() {
		this.w = this.root.offsetWidth;
		this.h = this.root.offsetHeight;
		this.view.width = this.w;
		this.view.height = this.h;
		this.zoom = this.w/this.rootScale;

		for(let i = this.points.length; i;) {
			--i; this.points[i].resize();
		}
	}
}

module.exports = PolyEffect;