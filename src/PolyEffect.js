"use strict";

const delaunay = require("delaunay-fast");
const Point = require("./Point");
const helper = require("./helper");

class PolyEffect {
	constructor(config) {
		this.root = config.root;

		this.parent 		  = config.parent;
		this.view 			  = config.view;
		this.ctx 			  = this.view.getContext('2d');

		this.w 				  = helper.is(config.w, this.parent.offsetWidth);
		this.h 				  = helper.is(config.h, this.parent.offsetHeight);

		this.view.width 	  = this.w;
		this.view.height 	  = this.h;
		this.rootScale 		  = config.rootScale || this.w;
		this.zoom 			  = this.w/this.rootScale;
		
		this.render 		  = helper.is(config.render, {});

		this.compress 		  = helper.is(config.compress, 6);
		this.cell 			  = helper.is(config.cell, 100);

		this.vertices 	  	  = helper.is(config.generate, this._generateVertices(), helper.is(config.vertices, []));
		this.triangles 		  = delaunay.triangulate(this.vertices);

		this.startPoint 	  = helper.is(config.startPoint, 0);
		this.speed 			  = helper.is(config.speed, 0.1);
		this.probability 	  = helper.is(config.probability, 10);
		this.acceleration 	  = helper.is(config.acceleration, 0.001);

		this.animCounterSpeed = helper.is(config.animCounterSpeed, 0);
		this.animCounterMax	  = helper.is(config.animCounterMax, 0);


		this.points = [];
		this._createAnimation();
		config.autoStart && this.start(this.startPoint);
	}
	_generateVertices() {
		let vertices = [];

		for(let y = -1; y < Math.round(this.h/this.cell)+1; y++) {
			for(let x = -1; x < Math.round(this.w/this.cell)+1; x++) {
				let posY = helper.randRange(y*this.cell+this.cell/this.compress, (y+1)*this.cell-this.cell/this.compress);
				let posX = helper.randRange(x*this.cell+this.cell/this.compress, (x+1)*this.cell-this.cell/this.compress);

				vertices.push([posX, posY]);
			}
		}

		return vertices;
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

	_createAnimation() {	
		this._createPoints();
		this._createPointLinks();
	}
	start(index) {
		this.points[index || 0].start();
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