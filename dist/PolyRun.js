(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Delaunay;

(function() {
  "use strict";

  var EPSILON = 1.0 / 1048576.0;

  function supertriangle(vertices) {
    var xmin = Number.POSITIVE_INFINITY,
        ymin = Number.POSITIVE_INFINITY,
        xmax = Number.NEGATIVE_INFINITY,
        ymax = Number.NEGATIVE_INFINITY,
        i, dx, dy, dmax, xmid, ymid;

    for(i = vertices.length; i--; ) {
      if(vertices[i][0] < xmin) xmin = vertices[i][0];
      if(vertices[i][0] > xmax) xmax = vertices[i][0];
      if(vertices[i][1] < ymin) ymin = vertices[i][1];
      if(vertices[i][1] > ymax) ymax = vertices[i][1];
    }

    dx = xmax - xmin;
    dy = ymax - ymin;
    dmax = Math.max(dx, dy);
    xmid = xmin + dx * 0.5;
    ymid = ymin + dy * 0.5;

    return [
      [xmid - 20 * dmax, ymid -      dmax],
      [xmid            , ymid + 20 * dmax],
      [xmid + 20 * dmax, ymid -      dmax]
    ];
  }

  function circumcircle(vertices, i, j, k) {
    var x1 = vertices[i][0],
        y1 = vertices[i][1],
        x2 = vertices[j][0],
        y2 = vertices[j][1],
        x3 = vertices[k][0],
        y3 = vertices[k][1],
        fabsy1y2 = Math.abs(y1 - y2),
        fabsy2y3 = Math.abs(y2 - y3),
        xc, yc, m1, m2, mx1, mx2, my1, my2, dx, dy;

    /* Check for coincident points */
    if(fabsy1y2 < EPSILON && fabsy2y3 < EPSILON)
      throw new Error("Eek! Coincident points!");

    if(fabsy1y2 < EPSILON) {
      m2  = -((x3 - x2) / (y3 - y2));
      mx2 = (x2 + x3) / 2.0;
      my2 = (y2 + y3) / 2.0;
      xc  = (x2 + x1) / 2.0;
      yc  = m2 * (xc - mx2) + my2;
    }

    else if(fabsy2y3 < EPSILON) {
      m1  = -((x2 - x1) / (y2 - y1));
      mx1 = (x1 + x2) / 2.0;
      my1 = (y1 + y2) / 2.0;
      xc  = (x3 + x2) / 2.0;
      yc  = m1 * (xc - mx1) + my1;
    }

    else {
      m1  = -((x2 - x1) / (y2 - y1));
      m2  = -((x3 - x2) / (y3 - y2));
      mx1 = (x1 + x2) / 2.0;
      mx2 = (x2 + x3) / 2.0;
      my1 = (y1 + y2) / 2.0;
      my2 = (y2 + y3) / 2.0;
      xc  = (m1 * mx1 - m2 * mx2 + my2 - my1) / (m1 - m2);
      yc  = (fabsy1y2 > fabsy2y3) ?
        m1 * (xc - mx1) + my1 :
        m2 * (xc - mx2) + my2;
    }

    dx = x2 - xc;
    dy = y2 - yc;
    return {i: i, j: j, k: k, x: xc, y: yc, r: dx * dx + dy * dy};
  }

  function dedup(edges) {
    var i, j, a, b, m, n;

    for(j = edges.length; j; ) {
      b = edges[--j];
      a = edges[--j];

      for(i = j; i; ) {
        n = edges[--i];
        m = edges[--i];

        if((a === m && b === n) || (a === n && b === m)) {
          edges.splice(j, 2);
          edges.splice(i, 2);
          break;
        }
      }
    }
  }

  Delaunay = {
    triangulate: function(vertices, key) {
      var n = vertices.length,
          i, j, indices, st, open, closed, edges, dx, dy, a, b, c;

      /* Bail if there aren't enough vertices to form any triangles. */
      if(n < 3)
        return [];

      /* Slice out the actual vertices from the passed objects. (Duplicate the
       * array even if we don't, though, since we need to make a supertriangle
       * later on!) */
      vertices = vertices.slice(0);

      if(key)
        for(i = n; i--; )
          vertices[i] = vertices[i][key];

      /* Make an array of indices into the vertex array, sorted by the
       * vertices' x-position. */
      indices = new Array(n);

      for(i = n; i--; )
        indices[i] = i;

      indices.sort(function(i, j) {
        return vertices[j][0] - vertices[i][0];
      });

      /* Next, find the vertices of the supertriangle (which contains all other
       * triangles), and append them onto the end of a (copy of) the vertex
       * array. */
      st = supertriangle(vertices);
      vertices.push(st[0], st[1], st[2]);
      
      /* Initialize the open list (containing the supertriangle and nothing
       * else) and the closed list (which is empty since we havn't processed
       * any triangles yet). */
      open   = [circumcircle(vertices, n + 0, n + 1, n + 2)];
      closed = [];
      edges  = [];

      /* Incrementally add each vertex to the mesh. */
      for(i = indices.length; i--; edges.length = 0) {
        c = indices[i];

        /* For each open triangle, check to see if the current point is
         * inside it's circumcircle. If it is, remove the triangle and add
         * it's edges to an edge list. */
        for(j = open.length; j--; ) {
          /* If this point is to the right of this triangle's circumcircle,
           * then this triangle should never get checked again. Remove it
           * from the open list, add it to the closed list, and skip. */
          dx = vertices[c][0] - open[j].x;
          if(dx > 0.0 && dx * dx > open[j].r) {
            closed.push(open[j]);
            open.splice(j, 1);
            continue;
          }

          /* If we're outside the circumcircle, skip this triangle. */
          dy = vertices[c][1] - open[j].y;
          if(dx * dx + dy * dy - open[j].r > EPSILON)
            continue;

          /* Remove the triangle and add it's edges to the edge list. */
          edges.push(
            open[j].i, open[j].j,
            open[j].j, open[j].k,
            open[j].k, open[j].i
          );
          open.splice(j, 1);
        }

        /* Remove any doubled edges. */
        dedup(edges);

        /* Add a new triangle for each edge. */
        for(j = edges.length; j; ) {
          b = edges[--j];
          a = edges[--j];
          open.push(circumcircle(vertices, a, b, c));
        }
      }

      /* Copy any remaining open triangles to the closed list, and then
       * remove any triangles that share a vertex with the supertriangle,
       * building a list of triplets that represent triangles. */
      for(i = open.length; i--; )
        closed.push(open[i]);
      open.length = 0;

      for(i = closed.length; i--; )
        if(closed[i].i < n && closed[i].j < n && closed[i].k < n)
          open.push(closed[i].i, closed[i].j, closed[i].k);

      /* Yay, we're done! */
      return open;
    },
    contains: function(tri, p) {
      /* Bounding box test first, for quick rejections. */
      if((p[0] < tri[0][0] && p[0] < tri[1][0] && p[0] < tri[2][0]) ||
         (p[0] > tri[0][0] && p[0] > tri[1][0] && p[0] > tri[2][0]) ||
         (p[1] < tri[0][1] && p[1] < tri[1][1] && p[1] < tri[2][1]) ||
         (p[1] > tri[0][1] && p[1] > tri[1][1] && p[1] > tri[2][1]))
        return null;

      var a = tri[1][0] - tri[0][0],
          b = tri[2][0] - tri[0][0],
          c = tri[1][1] - tri[0][1],
          d = tri[2][1] - tri[0][1],
          i = a * d - b * c;

      /* Degenerate tri. */
      if(i === 0.0)
        return null;

      var u = (d * (p[0] - tri[0][0]) - b * (p[1] - tri[0][1])) / i,
          v = (a * (p[1] - tri[0][1]) - c * (p[0] - tri[0][0])) / i;

      /* If we're outside the tri, fail. */
      if(u < 0.0 || v < 0.0 || (u + v) > 1.0)
        return null;

      return [u, v];
    }
  };

  if(typeof module !== "undefined")
    module.exports = Delaunay;
})();

},{}],2:[function(require,module,exports){
"use strict";

const helper = require("./helper");

class Point {
	constructor(root, index) {
		this.root = root;
		this.index = index;
		
		this.ctx = root.ctx;
		
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
			} else {
				this.ctx.beginPath();
				this.ctx.moveTo(this.x, this.y);
				this.ctx.lineTo(this.dtCommons[i][0].x, this.dtCommons[i][0].y);		
				this.ctx.stroke();
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
},{"./helper":6}],3:[function(require,module,exports){
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
},{"./Point":2,"./helper":6,"delaunay-fast":1}],4:[function(require,module,exports){
"use strict";

const PolyEffect = require('./PolyEffect.js');

var PolyRun = {
	effects: {},

	add(key, config) {
		config.root = this;

		let eff = new PolyEffect(config);
		this.effects[key] = eff;

		return eff;
	},
	remove(key) {
		delete this.effects[key];
	},

	update() {
		for(let key in this.effects) {
			this.effects[key].update();
			this.effects[key].draw();
		}
	}
};


module.exports = PolyRun;
},{"./PolyEffect.js":3}],5:[function(require,module,exports){
"use strict";

var _global = window || {};
_global.PolyRun = require('./PolyRun');

if(typeof module !== 'undefined') 
	module.exports = PolyRun;
},{"./PolyRun":4}],6:[function(require,module,exports){
"use strict";

var helper = {
	toRadians(deg) {
		return deg * Math.PI/180;
	},
	toDegree(rad) {
		return rad / Math.PI * 180;
	},

	randRange(min, max, isRound = true) {
		var rand = Math.random() * (max - min + 1) + min;

		if(isRound) return Math.floor(rand);
		else return rand;
	},
	compare(a, b, e) {
		return e ? a > b-e && a < b+e : a == b;
	},

	lerp(v0, v1, t) {
		return (1-t)*v0 + t*v1;
	},

	isFindValueInArray(arr, val) {
		for(let i = arr.lenght; i; ) {
			++i; if(arr[i] == val) return true;
		}
		return false;
	},

	is(v, a, b) {
		if(b != null) return v != null ? a : b;
		else return v != null ? v : a;
	},
	isObj(v, a, b) {
		if(b != null) return typeof v === 'object' ? a : b;
		else return typeof v === 'object' ? v : a;
	}
}

module.exports = helper;
},{}]},{},[5])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2F6YmFuZy9Qb2x5UnVuLmpzL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS9hemJhbmcvUG9seVJ1bi5qcy9ub2RlX21vZHVsZXMvZGVsYXVuYXktZmFzdC9kZWxhdW5heS5qcyIsIi9ob21lL2F6YmFuZy9Qb2x5UnVuLmpzL3NyYy9Qb2ludC5qcyIsIi9ob21lL2F6YmFuZy9Qb2x5UnVuLmpzL3NyYy9Qb2x5RWZmZWN0LmpzIiwiL2hvbWUvYXpiYW5nL1BvbHlSdW4uanMvc3JjL1BvbHlSdW4uanMiLCIvaG9tZS9hemJhbmcvUG9seVJ1bi5qcy9zcmMvZmFrZV82ZDBkMWVkOC5qcyIsIi9ob21lL2F6YmFuZy9Qb2x5UnVuLmpzL3NyYy9oZWxwZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIERlbGF1bmF5O1xuXG4oZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuXG4gIHZhciBFUFNJTE9OID0gMS4wIC8gMTA0ODU3Ni4wO1xuXG4gIGZ1bmN0aW9uIHN1cGVydHJpYW5nbGUodmVydGljZXMpIHtcbiAgICB2YXIgeG1pbiA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWSxcbiAgICAgICAgeW1pbiA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWSxcbiAgICAgICAgeG1heCA9IE51bWJlci5ORUdBVElWRV9JTkZJTklUWSxcbiAgICAgICAgeW1heCA9IE51bWJlci5ORUdBVElWRV9JTkZJTklUWSxcbiAgICAgICAgaSwgZHgsIGR5LCBkbWF4LCB4bWlkLCB5bWlkO1xuXG4gICAgZm9yKGkgPSB2ZXJ0aWNlcy5sZW5ndGg7IGktLTsgKSB7XG4gICAgICBpZih2ZXJ0aWNlc1tpXVswXSA8IHhtaW4pIHhtaW4gPSB2ZXJ0aWNlc1tpXVswXTtcbiAgICAgIGlmKHZlcnRpY2VzW2ldWzBdID4geG1heCkgeG1heCA9IHZlcnRpY2VzW2ldWzBdO1xuICAgICAgaWYodmVydGljZXNbaV1bMV0gPCB5bWluKSB5bWluID0gdmVydGljZXNbaV1bMV07XG4gICAgICBpZih2ZXJ0aWNlc1tpXVsxXSA+IHltYXgpIHltYXggPSB2ZXJ0aWNlc1tpXVsxXTtcbiAgICB9XG5cbiAgICBkeCA9IHhtYXggLSB4bWluO1xuICAgIGR5ID0geW1heCAtIHltaW47XG4gICAgZG1heCA9IE1hdGgubWF4KGR4LCBkeSk7XG4gICAgeG1pZCA9IHhtaW4gKyBkeCAqIDAuNTtcbiAgICB5bWlkID0geW1pbiArIGR5ICogMC41O1xuXG4gICAgcmV0dXJuIFtcbiAgICAgIFt4bWlkIC0gMjAgKiBkbWF4LCB5bWlkIC0gICAgICBkbWF4XSxcbiAgICAgIFt4bWlkICAgICAgICAgICAgLCB5bWlkICsgMjAgKiBkbWF4XSxcbiAgICAgIFt4bWlkICsgMjAgKiBkbWF4LCB5bWlkIC0gICAgICBkbWF4XVxuICAgIF07XG4gIH1cblxuICBmdW5jdGlvbiBjaXJjdW1jaXJjbGUodmVydGljZXMsIGksIGosIGspIHtcbiAgICB2YXIgeDEgPSB2ZXJ0aWNlc1tpXVswXSxcbiAgICAgICAgeTEgPSB2ZXJ0aWNlc1tpXVsxXSxcbiAgICAgICAgeDIgPSB2ZXJ0aWNlc1tqXVswXSxcbiAgICAgICAgeTIgPSB2ZXJ0aWNlc1tqXVsxXSxcbiAgICAgICAgeDMgPSB2ZXJ0aWNlc1trXVswXSxcbiAgICAgICAgeTMgPSB2ZXJ0aWNlc1trXVsxXSxcbiAgICAgICAgZmFic3kxeTIgPSBNYXRoLmFicyh5MSAtIHkyKSxcbiAgICAgICAgZmFic3kyeTMgPSBNYXRoLmFicyh5MiAtIHkzKSxcbiAgICAgICAgeGMsIHljLCBtMSwgbTIsIG14MSwgbXgyLCBteTEsIG15MiwgZHgsIGR5O1xuXG4gICAgLyogQ2hlY2sgZm9yIGNvaW5jaWRlbnQgcG9pbnRzICovXG4gICAgaWYoZmFic3kxeTIgPCBFUFNJTE9OICYmIGZhYnN5MnkzIDwgRVBTSUxPTilcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkVlayEgQ29pbmNpZGVudCBwb2ludHMhXCIpO1xuXG4gICAgaWYoZmFic3kxeTIgPCBFUFNJTE9OKSB7XG4gICAgICBtMiAgPSAtKCh4MyAtIHgyKSAvICh5MyAtIHkyKSk7XG4gICAgICBteDIgPSAoeDIgKyB4MykgLyAyLjA7XG4gICAgICBteTIgPSAoeTIgKyB5MykgLyAyLjA7XG4gICAgICB4YyAgPSAoeDIgKyB4MSkgLyAyLjA7XG4gICAgICB5YyAgPSBtMiAqICh4YyAtIG14MikgKyBteTI7XG4gICAgfVxuXG4gICAgZWxzZSBpZihmYWJzeTJ5MyA8IEVQU0lMT04pIHtcbiAgICAgIG0xICA9IC0oKHgyIC0geDEpIC8gKHkyIC0geTEpKTtcbiAgICAgIG14MSA9ICh4MSArIHgyKSAvIDIuMDtcbiAgICAgIG15MSA9ICh5MSArIHkyKSAvIDIuMDtcbiAgICAgIHhjICA9ICh4MyArIHgyKSAvIDIuMDtcbiAgICAgIHljICA9IG0xICogKHhjIC0gbXgxKSArIG15MTtcbiAgICB9XG5cbiAgICBlbHNlIHtcbiAgICAgIG0xICA9IC0oKHgyIC0geDEpIC8gKHkyIC0geTEpKTtcbiAgICAgIG0yICA9IC0oKHgzIC0geDIpIC8gKHkzIC0geTIpKTtcbiAgICAgIG14MSA9ICh4MSArIHgyKSAvIDIuMDtcbiAgICAgIG14MiA9ICh4MiArIHgzKSAvIDIuMDtcbiAgICAgIG15MSA9ICh5MSArIHkyKSAvIDIuMDtcbiAgICAgIG15MiA9ICh5MiArIHkzKSAvIDIuMDtcbiAgICAgIHhjICA9IChtMSAqIG14MSAtIG0yICogbXgyICsgbXkyIC0gbXkxKSAvIChtMSAtIG0yKTtcbiAgICAgIHljICA9IChmYWJzeTF5MiA+IGZhYnN5MnkzKSA/XG4gICAgICAgIG0xICogKHhjIC0gbXgxKSArIG15MSA6XG4gICAgICAgIG0yICogKHhjIC0gbXgyKSArIG15MjtcbiAgICB9XG5cbiAgICBkeCA9IHgyIC0geGM7XG4gICAgZHkgPSB5MiAtIHljO1xuICAgIHJldHVybiB7aTogaSwgajogaiwgazogaywgeDogeGMsIHk6IHljLCByOiBkeCAqIGR4ICsgZHkgKiBkeX07XG4gIH1cblxuICBmdW5jdGlvbiBkZWR1cChlZGdlcykge1xuICAgIHZhciBpLCBqLCBhLCBiLCBtLCBuO1xuXG4gICAgZm9yKGogPSBlZGdlcy5sZW5ndGg7IGo7ICkge1xuICAgICAgYiA9IGVkZ2VzWy0tal07XG4gICAgICBhID0gZWRnZXNbLS1qXTtcblxuICAgICAgZm9yKGkgPSBqOyBpOyApIHtcbiAgICAgICAgbiA9IGVkZ2VzWy0taV07XG4gICAgICAgIG0gPSBlZGdlc1stLWldO1xuXG4gICAgICAgIGlmKChhID09PSBtICYmIGIgPT09IG4pIHx8IChhID09PSBuICYmIGIgPT09IG0pKSB7XG4gICAgICAgICAgZWRnZXMuc3BsaWNlKGosIDIpO1xuICAgICAgICAgIGVkZ2VzLnNwbGljZShpLCAyKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIERlbGF1bmF5ID0ge1xuICAgIHRyaWFuZ3VsYXRlOiBmdW5jdGlvbih2ZXJ0aWNlcywga2V5KSB7XG4gICAgICB2YXIgbiA9IHZlcnRpY2VzLmxlbmd0aCxcbiAgICAgICAgICBpLCBqLCBpbmRpY2VzLCBzdCwgb3BlbiwgY2xvc2VkLCBlZGdlcywgZHgsIGR5LCBhLCBiLCBjO1xuXG4gICAgICAvKiBCYWlsIGlmIHRoZXJlIGFyZW4ndCBlbm91Z2ggdmVydGljZXMgdG8gZm9ybSBhbnkgdHJpYW5nbGVzLiAqL1xuICAgICAgaWYobiA8IDMpXG4gICAgICAgIHJldHVybiBbXTtcblxuICAgICAgLyogU2xpY2Ugb3V0IHRoZSBhY3R1YWwgdmVydGljZXMgZnJvbSB0aGUgcGFzc2VkIG9iamVjdHMuIChEdXBsaWNhdGUgdGhlXG4gICAgICAgKiBhcnJheSBldmVuIGlmIHdlIGRvbid0LCB0aG91Z2gsIHNpbmNlIHdlIG5lZWQgdG8gbWFrZSBhIHN1cGVydHJpYW5nbGVcbiAgICAgICAqIGxhdGVyIG9uISkgKi9cbiAgICAgIHZlcnRpY2VzID0gdmVydGljZXMuc2xpY2UoMCk7XG5cbiAgICAgIGlmKGtleSlcbiAgICAgICAgZm9yKGkgPSBuOyBpLS07IClcbiAgICAgICAgICB2ZXJ0aWNlc1tpXSA9IHZlcnRpY2VzW2ldW2tleV07XG5cbiAgICAgIC8qIE1ha2UgYW4gYXJyYXkgb2YgaW5kaWNlcyBpbnRvIHRoZSB2ZXJ0ZXggYXJyYXksIHNvcnRlZCBieSB0aGVcbiAgICAgICAqIHZlcnRpY2VzJyB4LXBvc2l0aW9uLiAqL1xuICAgICAgaW5kaWNlcyA9IG5ldyBBcnJheShuKTtcblxuICAgICAgZm9yKGkgPSBuOyBpLS07IClcbiAgICAgICAgaW5kaWNlc1tpXSA9IGk7XG5cbiAgICAgIGluZGljZXMuc29ydChmdW5jdGlvbihpLCBqKSB7XG4gICAgICAgIHJldHVybiB2ZXJ0aWNlc1tqXVswXSAtIHZlcnRpY2VzW2ldWzBdO1xuICAgICAgfSk7XG5cbiAgICAgIC8qIE5leHQsIGZpbmQgdGhlIHZlcnRpY2VzIG9mIHRoZSBzdXBlcnRyaWFuZ2xlICh3aGljaCBjb250YWlucyBhbGwgb3RoZXJcbiAgICAgICAqIHRyaWFuZ2xlcyksIGFuZCBhcHBlbmQgdGhlbSBvbnRvIHRoZSBlbmQgb2YgYSAoY29weSBvZikgdGhlIHZlcnRleFxuICAgICAgICogYXJyYXkuICovXG4gICAgICBzdCA9IHN1cGVydHJpYW5nbGUodmVydGljZXMpO1xuICAgICAgdmVydGljZXMucHVzaChzdFswXSwgc3RbMV0sIHN0WzJdKTtcbiAgICAgIFxuICAgICAgLyogSW5pdGlhbGl6ZSB0aGUgb3BlbiBsaXN0IChjb250YWluaW5nIHRoZSBzdXBlcnRyaWFuZ2xlIGFuZCBub3RoaW5nXG4gICAgICAgKiBlbHNlKSBhbmQgdGhlIGNsb3NlZCBsaXN0ICh3aGljaCBpcyBlbXB0eSBzaW5jZSB3ZSBoYXZuJ3QgcHJvY2Vzc2VkXG4gICAgICAgKiBhbnkgdHJpYW5nbGVzIHlldCkuICovXG4gICAgICBvcGVuICAgPSBbY2lyY3VtY2lyY2xlKHZlcnRpY2VzLCBuICsgMCwgbiArIDEsIG4gKyAyKV07XG4gICAgICBjbG9zZWQgPSBbXTtcbiAgICAgIGVkZ2VzICA9IFtdO1xuXG4gICAgICAvKiBJbmNyZW1lbnRhbGx5IGFkZCBlYWNoIHZlcnRleCB0byB0aGUgbWVzaC4gKi9cbiAgICAgIGZvcihpID0gaW5kaWNlcy5sZW5ndGg7IGktLTsgZWRnZXMubGVuZ3RoID0gMCkge1xuICAgICAgICBjID0gaW5kaWNlc1tpXTtcblxuICAgICAgICAvKiBGb3IgZWFjaCBvcGVuIHRyaWFuZ2xlLCBjaGVjayB0byBzZWUgaWYgdGhlIGN1cnJlbnQgcG9pbnQgaXNcbiAgICAgICAgICogaW5zaWRlIGl0J3MgY2lyY3VtY2lyY2xlLiBJZiBpdCBpcywgcmVtb3ZlIHRoZSB0cmlhbmdsZSBhbmQgYWRkXG4gICAgICAgICAqIGl0J3MgZWRnZXMgdG8gYW4gZWRnZSBsaXN0LiAqL1xuICAgICAgICBmb3IoaiA9IG9wZW4ubGVuZ3RoOyBqLS07ICkge1xuICAgICAgICAgIC8qIElmIHRoaXMgcG9pbnQgaXMgdG8gdGhlIHJpZ2h0IG9mIHRoaXMgdHJpYW5nbGUncyBjaXJjdW1jaXJjbGUsXG4gICAgICAgICAgICogdGhlbiB0aGlzIHRyaWFuZ2xlIHNob3VsZCBuZXZlciBnZXQgY2hlY2tlZCBhZ2Fpbi4gUmVtb3ZlIGl0XG4gICAgICAgICAgICogZnJvbSB0aGUgb3BlbiBsaXN0LCBhZGQgaXQgdG8gdGhlIGNsb3NlZCBsaXN0LCBhbmQgc2tpcC4gKi9cbiAgICAgICAgICBkeCA9IHZlcnRpY2VzW2NdWzBdIC0gb3BlbltqXS54O1xuICAgICAgICAgIGlmKGR4ID4gMC4wICYmIGR4ICogZHggPiBvcGVuW2pdLnIpIHtcbiAgICAgICAgICAgIGNsb3NlZC5wdXNoKG9wZW5bal0pO1xuICAgICAgICAgICAgb3Blbi5zcGxpY2UoaiwgMSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvKiBJZiB3ZSdyZSBvdXRzaWRlIHRoZSBjaXJjdW1jaXJjbGUsIHNraXAgdGhpcyB0cmlhbmdsZS4gKi9cbiAgICAgICAgICBkeSA9IHZlcnRpY2VzW2NdWzFdIC0gb3BlbltqXS55O1xuICAgICAgICAgIGlmKGR4ICogZHggKyBkeSAqIGR5IC0gb3BlbltqXS5yID4gRVBTSUxPTilcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgLyogUmVtb3ZlIHRoZSB0cmlhbmdsZSBhbmQgYWRkIGl0J3MgZWRnZXMgdG8gdGhlIGVkZ2UgbGlzdC4gKi9cbiAgICAgICAgICBlZGdlcy5wdXNoKFxuICAgICAgICAgICAgb3BlbltqXS5pLCBvcGVuW2pdLmosXG4gICAgICAgICAgICBvcGVuW2pdLmosIG9wZW5bal0uayxcbiAgICAgICAgICAgIG9wZW5bal0uaywgb3BlbltqXS5pXG4gICAgICAgICAgKTtcbiAgICAgICAgICBvcGVuLnNwbGljZShqLCAxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qIFJlbW92ZSBhbnkgZG91YmxlZCBlZGdlcy4gKi9cbiAgICAgICAgZGVkdXAoZWRnZXMpO1xuXG4gICAgICAgIC8qIEFkZCBhIG5ldyB0cmlhbmdsZSBmb3IgZWFjaCBlZGdlLiAqL1xuICAgICAgICBmb3IoaiA9IGVkZ2VzLmxlbmd0aDsgajsgKSB7XG4gICAgICAgICAgYiA9IGVkZ2VzWy0tal07XG4gICAgICAgICAgYSA9IGVkZ2VzWy0tal07XG4gICAgICAgICAgb3Blbi5wdXNoKGNpcmN1bWNpcmNsZSh2ZXJ0aWNlcywgYSwgYiwgYykpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8qIENvcHkgYW55IHJlbWFpbmluZyBvcGVuIHRyaWFuZ2xlcyB0byB0aGUgY2xvc2VkIGxpc3QsIGFuZCB0aGVuXG4gICAgICAgKiByZW1vdmUgYW55IHRyaWFuZ2xlcyB0aGF0IHNoYXJlIGEgdmVydGV4IHdpdGggdGhlIHN1cGVydHJpYW5nbGUsXG4gICAgICAgKiBidWlsZGluZyBhIGxpc3Qgb2YgdHJpcGxldHMgdGhhdCByZXByZXNlbnQgdHJpYW5nbGVzLiAqL1xuICAgICAgZm9yKGkgPSBvcGVuLmxlbmd0aDsgaS0tOyApXG4gICAgICAgIGNsb3NlZC5wdXNoKG9wZW5baV0pO1xuICAgICAgb3Blbi5sZW5ndGggPSAwO1xuXG4gICAgICBmb3IoaSA9IGNsb3NlZC5sZW5ndGg7IGktLTsgKVxuICAgICAgICBpZihjbG9zZWRbaV0uaSA8IG4gJiYgY2xvc2VkW2ldLmogPCBuICYmIGNsb3NlZFtpXS5rIDwgbilcbiAgICAgICAgICBvcGVuLnB1c2goY2xvc2VkW2ldLmksIGNsb3NlZFtpXS5qLCBjbG9zZWRbaV0uayk7XG5cbiAgICAgIC8qIFlheSwgd2UncmUgZG9uZSEgKi9cbiAgICAgIHJldHVybiBvcGVuO1xuICAgIH0sXG4gICAgY29udGFpbnM6IGZ1bmN0aW9uKHRyaSwgcCkge1xuICAgICAgLyogQm91bmRpbmcgYm94IHRlc3QgZmlyc3QsIGZvciBxdWljayByZWplY3Rpb25zLiAqL1xuICAgICAgaWYoKHBbMF0gPCB0cmlbMF1bMF0gJiYgcFswXSA8IHRyaVsxXVswXSAmJiBwWzBdIDwgdHJpWzJdWzBdKSB8fFxuICAgICAgICAgKHBbMF0gPiB0cmlbMF1bMF0gJiYgcFswXSA+IHRyaVsxXVswXSAmJiBwWzBdID4gdHJpWzJdWzBdKSB8fFxuICAgICAgICAgKHBbMV0gPCB0cmlbMF1bMV0gJiYgcFsxXSA8IHRyaVsxXVsxXSAmJiBwWzFdIDwgdHJpWzJdWzFdKSB8fFxuICAgICAgICAgKHBbMV0gPiB0cmlbMF1bMV0gJiYgcFsxXSA+IHRyaVsxXVsxXSAmJiBwWzFdID4gdHJpWzJdWzFdKSlcbiAgICAgICAgcmV0dXJuIG51bGw7XG5cbiAgICAgIHZhciBhID0gdHJpWzFdWzBdIC0gdHJpWzBdWzBdLFxuICAgICAgICAgIGIgPSB0cmlbMl1bMF0gLSB0cmlbMF1bMF0sXG4gICAgICAgICAgYyA9IHRyaVsxXVsxXSAtIHRyaVswXVsxXSxcbiAgICAgICAgICBkID0gdHJpWzJdWzFdIC0gdHJpWzBdWzFdLFxuICAgICAgICAgIGkgPSBhICogZCAtIGIgKiBjO1xuXG4gICAgICAvKiBEZWdlbmVyYXRlIHRyaS4gKi9cbiAgICAgIGlmKGkgPT09IDAuMClcbiAgICAgICAgcmV0dXJuIG51bGw7XG5cbiAgICAgIHZhciB1ID0gKGQgKiAocFswXSAtIHRyaVswXVswXSkgLSBiICogKHBbMV0gLSB0cmlbMF1bMV0pKSAvIGksXG4gICAgICAgICAgdiA9IChhICogKHBbMV0gLSB0cmlbMF1bMV0pIC0gYyAqIChwWzBdIC0gdHJpWzBdWzBdKSkgLyBpO1xuXG4gICAgICAvKiBJZiB3ZSdyZSBvdXRzaWRlIHRoZSB0cmksIGZhaWwuICovXG4gICAgICBpZih1IDwgMC4wIHx8IHYgPCAwLjAgfHwgKHUgKyB2KSA+IDEuMClcbiAgICAgICAgcmV0dXJuIG51bGw7XG5cbiAgICAgIHJldHVybiBbdSwgdl07XG4gICAgfVxuICB9O1xuXG4gIGlmKHR5cGVvZiBtb2R1bGUgIT09IFwidW5kZWZpbmVkXCIpXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBEZWxhdW5heTtcbn0pKCk7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuY29uc3QgaGVscGVyID0gcmVxdWlyZShcIi4vaGVscGVyXCIpO1xuXG5jbGFzcyBQb2ludCB7XG5cdGNvbnN0cnVjdG9yKHJvb3QsIGluZGV4KSB7XG5cdFx0dGhpcy5yb290ID0gcm9vdDtcblx0XHR0aGlzLmluZGV4ID0gaW5kZXg7XG5cdFx0XG5cdFx0dGhpcy5jdHggPSByb290LmN0eDtcblx0XHRcblx0XHR0aGlzLnggPSByb290LnZlcnRpY2VzW2luZGV4XVswXTtcblx0XHR0aGlzLnkgPSByb290LnZlcnRpY2VzW2luZGV4XVsxXTtcblx0XHR0aGlzLmlkID0gcm9vdC52ZXJ0aWNlc1tpbmRleF1bMl0gfHwgMDtcblxuXHRcdHRoaXMuc3R5bGUgPSByb290LnJlbmRlclt0aGlzLmlkXSB8fCB7fTtcblxuXHRcdHRoaXMuY29tbW9ucyA9IFtdO1xuXHRcdHRoaXMudmFyaWFudHMgPSBbXTtcblx0XHR0aGlzLmR0Q29tbW9ucyA9IFtdO1xuXG5cdFx0dGhpcy5pc1N0YXJ0ID0gZmFsc2U7XG5cblx0XHR0aGlzLl90aWNrZXJDb3VudGVyID0gMDtcblxuXHRcdC8vIGhlbHBlcnNcblx0XHR0aGlzLmFuaW1Db3VudGVyID0gMDtcblx0fVxuXHRuZXdMaW5lQW5pbWF0aW9uKCkge1xuXHRcdGlmKCF0aGlzLmNvbW1vbnMubGVuZ3RoKSByZXR1cm47XG5cblx0XHR2YXIgaSA9IGhlbHBlci5yYW5kUmFuZ2UoMCwgdGhpcy5jb21tb25zLmxlbmd0aC0xKTtcblx0XHR0aGlzLmR0Q29tbW9ucy5wdXNoKFt7eDogdGhpcy54LCB5OiB0aGlzLnl9LCB0aGlzLmNvbW1vbnNbaV1dKTtcblx0XHR0aGlzLmNvbW1vbnMuc3BsaWNlKGksIDEpO1xuXHR9XG5cblx0c3RhcnQoKSB7XG5cdFx0dGhpcy5pc1N0YXJ0ID0gdHJ1ZTtcblx0fVxuXG5cdHVwZGF0ZSgpIHtcblx0XHRpZih0aGlzLmlzU3RhcnQpIHtcblx0XHRcdHRoaXMuX3RpY2tlckNvdW50ZXIrKztcblxuXHRcdFx0aWYodGhpcy5fdGlja2VyQ291bnRlciA+PSB0aGlzLnJvb3QucHJvYmFiaWxpdHkpIHtcblx0XHRcdFx0dGhpcy5fdGlja2VyQ291bnRlciA9IDA7XG5cdFx0XHRcdHRoaXMubmV3TGluZUFuaW1hdGlvbigpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmFuaW1hdGlvbigpO1xuXHRcdH1cblx0fVxuXHRhbmltYXRpb24oKSB7XG5cdFx0dGhpcy5hbmltQ291bnRlciA9IGhlbHBlci5sZXJwKHRoaXMuYW5pbUNvdW50ZXIsIHRoaXMucm9vdC5hbmltQ291bnRlck1heCwgdGhpcy5yb290LmFuaW1Db3VudGVyU3BlZWQpO1xuXG5cdFx0Zm9yKGxldCBpID0gMDsgaSA8IHRoaXMuZHRDb21tb25zLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRpZih0aGlzLmR0Q29tbW9uc1tpXVsyXSkgY29udGludWU7XG5cblx0XHRcdHZhciBkdCA9IHRoaXMuZHRDb21tb25zW2ldO1xuXHRcdFx0ZHRbMF0ueCA9IGhlbHBlci5sZXJwKGR0WzBdLngsIGR0WzFdLngsIHRoaXMucm9vdC5zcGVlZCk7XG5cdFx0XHRkdFswXS55ID0gaGVscGVyLmxlcnAoZHRbMF0ueSwgZHRbMV0ueSwgdGhpcy5yb290LnNwZWVkKTtcblxuXG5cdFx0XHRpZihoZWxwZXIuY29tcGFyZShkdFswXS54LCBkdFsxXS54LCAxKSAmJiBoZWxwZXIuY29tcGFyZShkdFswXS55LCBkdFsxXS55LCAxKSkge1xuXHRcdFx0XHR0aGlzLmR0Q29tbW9uc1tpXVsyXSA9IHRydWU7XG5cdFx0XHRcdGR0WzFdLnN0YXJ0KCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0ZHJhdygpIHtcblx0XHRpZighdGhpcy5pc1N0YXJ0KSByZXR1cm47XG5cblx0XHRmb3IobGV0IGkgPSAwOyBpIDwgdGhpcy5kdENvbW1vbnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdGlmKHRoaXMuc3R5bGUucmVuZGVyTGluZSAmJiB0aGlzLmlkID09PSB0aGlzLmR0Q29tbW9uc1tpXVsxXS5pZCkge1xuXHRcdFx0XHR0aGlzLnN0eWxlLnJlbmRlckxpbmUodGhpcywgdGhpcy54LCB0aGlzLnksIHRoaXMuZHRDb21tb25zW2ldWzBdLngsIHRoaXMuZHRDb21tb25zW2ldWzBdLnkpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5jdHguYmVnaW5QYXRoKCk7XG5cdFx0XHRcdHRoaXMuY3R4Lm1vdmVUbyh0aGlzLngsIHRoaXMueSk7XG5cdFx0XHRcdHRoaXMuY3R4LmxpbmVUbyh0aGlzLmR0Q29tbW9uc1tpXVswXS54LCB0aGlzLmR0Q29tbW9uc1tpXVswXS55KTtcdFx0XG5cdFx0XHRcdHRoaXMuY3R4LnN0cm9rZSgpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHRpZih0aGlzLnN0eWxlLnJlbmRlclBvaW50KVxuXHRcdFx0dGhpcy5zdHlsZS5yZW5kZXJQb2ludCh0aGlzLCB0aGlzLngsIHRoaXMueSk7XG5cdH1cblxuXHRyZXNpemUoKSB7XHRcblx0XHR0aGlzLnggPSB0aGlzLnJvb3QudmVydGljZXNbdGhpcy5pbmRleF1bMF0qdGhpcy5yb290Lnpvb207XG5cdFx0dGhpcy55ID0gdGhpcy5yb290LnZlcnRpY2VzW3RoaXMuaW5kZXhdWzFdKnRoaXMucm9vdC56b29tO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUG9pbnQ7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmNvbnN0IGRlbGF1bmF5ID0gcmVxdWlyZShcImRlbGF1bmF5LWZhc3RcIik7XG5jb25zdCBQb2ludCA9IHJlcXVpcmUoXCIuL1BvaW50XCIpO1xuY29uc3QgaGVscGVyID0gcmVxdWlyZShcIi4vaGVscGVyXCIpO1xuXG5jbGFzcyBQb2x5RWZmZWN0IHtcblx0Y29uc3RydWN0b3IoY29uZmlnKSB7XG5cdFx0dGhpcy5yb290ID0gY29uZmlnLnJvb3Q7XG5cblx0XHR0aGlzLnBhcmVudCBcdFx0ICA9IGNvbmZpZy5wYXJlbnQ7XG5cdFx0dGhpcy52aWV3IFx0XHRcdCAgPSBjb25maWcudmlldztcblx0XHR0aGlzLmN0eCBcdFx0XHQgID0gdGhpcy52aWV3LmdldENvbnRleHQoJzJkJyk7XG5cblx0XHR0aGlzLncgXHRcdFx0XHQgID0gaGVscGVyLmlzKGNvbmZpZy53LCB0aGlzLnBhcmVudC5vZmZzZXRXaWR0aCk7XG5cdFx0dGhpcy5oIFx0XHRcdFx0ICA9IGhlbHBlci5pcyhjb25maWcuaCwgdGhpcy5wYXJlbnQub2Zmc2V0SGVpZ2h0KTtcblxuXHRcdHRoaXMudmlldy53aWR0aCBcdCAgPSB0aGlzLnc7XG5cdFx0dGhpcy52aWV3LmhlaWdodCBcdCAgPSB0aGlzLmg7XG5cdFx0dGhpcy5yb290U2NhbGUgXHRcdCAgPSBjb25maWcucm9vdFNjYWxlIHx8IHRoaXMudztcblx0XHR0aGlzLnpvb20gXHRcdFx0ICA9IHRoaXMudy90aGlzLnJvb3RTY2FsZTtcblx0XHRcblx0XHR0aGlzLnJlbmRlciBcdFx0ICA9IGhlbHBlci5pcyhjb25maWcucmVuZGVyLCB7fSk7XG5cblx0XHR0aGlzLmNvbXByZXNzIFx0XHQgID0gaGVscGVyLmlzKGNvbmZpZy5jb21wcmVzcywgNik7XG5cdFx0dGhpcy5jZWxsIFx0XHRcdCAgPSBoZWxwZXIuaXMoY29uZmlnLmNlbGwsIDEwMCk7XG5cblx0XHR0aGlzLnZlcnRpY2VzIFx0ICBcdCAgPSBoZWxwZXIuaXMoY29uZmlnLmdlbmVyYXRlLCB0aGlzLl9nZW5lcmF0ZVZlcnRpY2VzKCksIGhlbHBlci5pcyhjb25maWcudmVydGljZXMsIFtdKSk7XG5cdFx0dGhpcy50cmlhbmdsZXMgXHRcdCAgPSBkZWxhdW5heS50cmlhbmd1bGF0ZSh0aGlzLnZlcnRpY2VzKTtcblxuXHRcdHRoaXMuc3RhcnRQb2ludCBcdCAgPSBoZWxwZXIuaXMoY29uZmlnLnN0YXJ0UG9pbnQsIDApO1xuXHRcdHRoaXMuc3BlZWQgXHRcdFx0ICA9IGhlbHBlci5pcyhjb25maWcuc3BlZWQsIDAuMSk7XG5cdFx0dGhpcy5wcm9iYWJpbGl0eSBcdCAgPSBoZWxwZXIuaXMoY29uZmlnLnByb2JhYmlsaXR5LCAxMCk7XG5cdFx0dGhpcy5hY2NlbGVyYXRpb24gXHQgID0gaGVscGVyLmlzKGNvbmZpZy5hY2NlbGVyYXRpb24sIDAuMDAxKTtcblxuXHRcdHRoaXMuYW5pbUNvdW50ZXJTcGVlZCA9IGhlbHBlci5pcyhjb25maWcuYW5pbUNvdW50ZXJTcGVlZCwgMCk7XG5cdFx0dGhpcy5hbmltQ291bnRlck1heFx0ICA9IGhlbHBlci5pcyhjb25maWcuYW5pbUNvdW50ZXJNYXgsIDApO1xuXG5cblx0XHR0aGlzLnBvaW50cyA9IFtdO1xuXHRcdHRoaXMuX2NyZWF0ZUFuaW1hdGlvbigpO1xuXHRcdGNvbmZpZy5hdXRvU3RhcnQgJiYgdGhpcy5zdGFydCh0aGlzLnN0YXJ0UG9pbnQpO1xuXHR9XG5cdF9nZW5lcmF0ZVZlcnRpY2VzKCkge1xuXHRcdGxldCB2ZXJ0aWNlcyA9IFtdO1xuXG5cdFx0Zm9yKGxldCB5ID0gLTE7IHkgPCBNYXRoLnJvdW5kKHRoaXMuaC90aGlzLmNlbGwpKzE7IHkrKykge1xuXHRcdFx0Zm9yKGxldCB4ID0gLTE7IHggPCBNYXRoLnJvdW5kKHRoaXMudy90aGlzLmNlbGwpKzE7IHgrKykge1xuXHRcdFx0XHRsZXQgcG9zWSA9IGhlbHBlci5yYW5kUmFuZ2UoeSp0aGlzLmNlbGwrdGhpcy5jZWxsL3RoaXMuY29tcHJlc3MsICh5KzEpKnRoaXMuY2VsbC10aGlzLmNlbGwvdGhpcy5jb21wcmVzcyk7XG5cdFx0XHRcdGxldCBwb3NYID0gaGVscGVyLnJhbmRSYW5nZSh4KnRoaXMuY2VsbCt0aGlzLmNlbGwvdGhpcy5jb21wcmVzcywgKHgrMSkqdGhpcy5jZWxsLXRoaXMuY2VsbC90aGlzLmNvbXByZXNzKTtcblxuXHRcdFx0XHR2ZXJ0aWNlcy5wdXNoKFtwb3NYLCBwb3NZXSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHZlcnRpY2VzO1xuXHR9XG5cdF9jcmVhdGVQb2ludHMoKSB7XG5cdFx0dmFyIGl0ZXJhdGlvbnNDb250cm9sID0gMDtcblx0XHRmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy50cmlhbmdsZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBwb2ludHM7XG5cdFx0XHR2YXIgaW5kID0gdGhpcy50cmlhbmdsZXNbaV07XG5cblx0XHRcdGl0ZXJhdGlvbnNDb250cm9sKys7XG5cdFx0XHRpZighdGhpcy5wb2ludHNbaW5kXSkgdGhpcy5wb2ludHNbaW5kXSA9IG5ldyBQb2ludCh0aGlzLCBpbmQpO1xuXG5cdFx0XHRzd2l0Y2goaXRlcmF0aW9uc0NvbnRyb2wpIHtcblx0XHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHRcdHBvaW50cyA9IFt0aGlzLnRyaWFuZ2xlc1tpKzFdLCB0aGlzLnRyaWFuZ2xlc1tpKzJdXTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHRcdHBvaW50cyA9IFt0aGlzLnRyaWFuZ2xlc1tpLTFdLCB0aGlzLnRyaWFuZ2xlc1tpKzFdXTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAzOlxuXHRcdFx0XHRcdHBvaW50cyA9IFt0aGlzLnRyaWFuZ2xlc1tpLTFdLCB0aGlzLnRyaWFuZ2xlc1tpLTJdXTtcblx0XHRcdFx0XHRpdGVyYXRpb25zQ29udHJvbCA9IDA7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cblx0XHRcdGVhY2hQb2ludHM6IGZvcihsZXQgcCA9IDA7IHAgPCBwb2ludHMubGVuZ3RoOyBwKyspIHtcblx0XHRcdFx0Zm9yKGxldCBqID0gMDsgaiA8IHRoaXMucG9pbnRzW2luZF0uY29tbW9ucy5sZW5ndGg7IGorKykge1xuXHRcdFx0XHRcdGlmKHRoaXMucG9pbnRzW2luZF0uY29tbW9uc1tqXSA9PSBwb2ludHNbcF0pIGNvbnRpbnVlIGVhY2hQb2ludHM7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy5wb2ludHNbaW5kXS5jb21tb25zLnB1c2gocG9pbnRzW3BdKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0X2NyZWF0ZVBvaW50TGlua3MoKSB7XG5cdFx0Zm9yKGxldCBpID0gMDsgaSA8IHRoaXMucG9pbnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRmb3IobGV0IHAgPSAwOyBwIDwgdGhpcy5wb2ludHNbaV0uY29tbW9ucy5sZW5ndGg7IHArKykge1xuXHRcdFx0XHR0aGlzLnBvaW50c1tpXS5jb21tb25zW3BdID0gdGhpcy5wb2ludHNbdGhpcy5wb2ludHNbaV0uY29tbW9uc1twXV07XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0X2NyZWF0ZUFuaW1hdGlvbigpIHtcdFxuXHRcdHRoaXMuX2NyZWF0ZVBvaW50cygpO1xuXHRcdHRoaXMuX2NyZWF0ZVBvaW50TGlua3MoKTtcblx0fVxuXHRzdGFydChpbmRleCkge1xuXHRcdHRoaXMucG9pbnRzW2luZGV4IHx8IDBdLnN0YXJ0KCk7XG5cdH1cblxuXHR1cGRhdGUoKSB7XG5cdFx0aWYodGhpcy5zcGVlZCA8IDAuNSkgXG5cdFx0XHR0aGlzLnNwZWVkICs9IHRoaXMuYWNjZWxlcmF0aW9uO1xuXG5cdFx0Zm9yKGxldCBpID0gdGhpcy5wb2ludHMubGVuZ3RoOyBpOykge1xuXHRcdFx0LS1pOyB0aGlzLnBvaW50c1tpXS51cGRhdGUoKTtcblx0XHR9XG5cdH1cblx0ZHJhdygpIHtcblx0XHR0aGlzLmN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy53LCB0aGlzLmgpO1xuXG5cdFx0Zm9yKGxldCBpID0gdGhpcy5wb2ludHMubGVuZ3RoOyBpOykge1xuXHRcdFx0LS1pOyB0aGlzLnBvaW50c1tpXS5kcmF3KCk7XG5cdFx0fVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHR0aGlzLncgPSB0aGlzLnJvb3Qub2Zmc2V0V2lkdGg7XG5cdFx0dGhpcy5oID0gdGhpcy5yb290Lm9mZnNldEhlaWdodDtcblx0XHR0aGlzLnZpZXcud2lkdGggPSB0aGlzLnc7XG5cdFx0dGhpcy52aWV3LmhlaWdodCA9IHRoaXMuaDtcblx0XHR0aGlzLnpvb20gPSB0aGlzLncvdGhpcy5yb290U2NhbGU7XG5cblx0XHRmb3IobGV0IGkgPSB0aGlzLnBvaW50cy5sZW5ndGg7IGk7KSB7XG5cdFx0XHQtLWk7IHRoaXMucG9pbnRzW2ldLnJlc2l6ZSgpO1xuXHRcdH1cblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFBvbHlFZmZlY3Q7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmNvbnN0IFBvbHlFZmZlY3QgPSByZXF1aXJlKCcuL1BvbHlFZmZlY3QuanMnKTtcblxudmFyIFBvbHlSdW4gPSB7XG5cdGVmZmVjdHM6IHt9LFxuXG5cdGFkZChrZXksIGNvbmZpZykge1xuXHRcdGNvbmZpZy5yb290ID0gdGhpcztcblxuXHRcdGxldCBlZmYgPSBuZXcgUG9seUVmZmVjdChjb25maWcpO1xuXHRcdHRoaXMuZWZmZWN0c1trZXldID0gZWZmO1xuXG5cdFx0cmV0dXJuIGVmZjtcblx0fSxcblx0cmVtb3ZlKGtleSkge1xuXHRcdGRlbGV0ZSB0aGlzLmVmZmVjdHNba2V5XTtcblx0fSxcblxuXHR1cGRhdGUoKSB7XG5cdFx0Zm9yKGxldCBrZXkgaW4gdGhpcy5lZmZlY3RzKSB7XG5cdFx0XHR0aGlzLmVmZmVjdHNba2V5XS51cGRhdGUoKTtcblx0XHRcdHRoaXMuZWZmZWN0c1trZXldLmRyYXcoKTtcblx0XHR9XG5cdH1cbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBQb2x5UnVuOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgX2dsb2JhbCA9IHdpbmRvdyB8fCB7fTtcbl9nbG9iYWwuUG9seVJ1biA9IHJlcXVpcmUoJy4vUG9seVJ1bicpO1xuXG5pZih0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykgXG5cdG1vZHVsZS5leHBvcnRzID0gUG9seVJ1bjsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGhlbHBlciA9IHtcblx0dG9SYWRpYW5zKGRlZykge1xuXHRcdHJldHVybiBkZWcgKiBNYXRoLlBJLzE4MDtcblx0fSxcblx0dG9EZWdyZWUocmFkKSB7XG5cdFx0cmV0dXJuIHJhZCAvIE1hdGguUEkgKiAxODA7XG5cdH0sXG5cblx0cmFuZFJhbmdlKG1pbiwgbWF4LCBpc1JvdW5kID0gdHJ1ZSkge1xuXHRcdHZhciByYW5kID0gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSArIG1pbjtcblxuXHRcdGlmKGlzUm91bmQpIHJldHVybiBNYXRoLmZsb29yKHJhbmQpO1xuXHRcdGVsc2UgcmV0dXJuIHJhbmQ7XG5cdH0sXG5cdGNvbXBhcmUoYSwgYiwgZSkge1xuXHRcdHJldHVybiBlID8gYSA+IGItZSAmJiBhIDwgYitlIDogYSA9PSBiO1xuXHR9LFxuXG5cdGxlcnAodjAsIHYxLCB0KSB7XG5cdFx0cmV0dXJuICgxLXQpKnYwICsgdCp2MTtcblx0fSxcblxuXHRpc0ZpbmRWYWx1ZUluQXJyYXkoYXJyLCB2YWwpIHtcblx0XHRmb3IobGV0IGkgPSBhcnIubGVuZ2h0OyBpOyApIHtcblx0XHRcdCsraTsgaWYoYXJyW2ldID09IHZhbCkgcmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fSxcblxuXHRpcyh2LCBhLCBiKSB7XG5cdFx0aWYoYiAhPSBudWxsKSByZXR1cm4gdiAhPSBudWxsID8gYSA6IGI7XG5cdFx0ZWxzZSByZXR1cm4gdiAhPSBudWxsID8gdiA6IGE7XG5cdH0sXG5cdGlzT2JqKHYsIGEsIGIpIHtcblx0XHRpZihiICE9IG51bGwpIHJldHVybiB0eXBlb2YgdiA9PT0gJ29iamVjdCcgPyBhIDogYjtcblx0XHRlbHNlIHJldHVybiB0eXBlb2YgdiA9PT0gJ29iamVjdCcgPyB2IDogYTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGhlbHBlcjsiXX0=
