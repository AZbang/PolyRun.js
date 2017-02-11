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
},{"./helper":6}],3:[function(require,module,exports){
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
},{"./Point":2,"./helper":6,"delaunay-fast":1}],4:[function(require,module,exports){
"use strict";

const PolyEffect = require('./PolyEffect.js');

var PolyRun = {
	effects: {},

	add(key, config) {
		config.root = this;

		let eff = new PolyEffect(config);
		this.effects[key] = eff;
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
	}
}

module.exports = helper;
},{}]},{},[5])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2F6YmFuZy9Qb2x5UnVuLmpzL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS9hemJhbmcvUG9seVJ1bi5qcy9ub2RlX21vZHVsZXMvZGVsYXVuYXktZmFzdC9kZWxhdW5heS5qcyIsIi9ob21lL2F6YmFuZy9Qb2x5UnVuLmpzL3NyYy9Qb2ludC5qcyIsIi9ob21lL2F6YmFuZy9Qb2x5UnVuLmpzL3NyYy9Qb2x5RWZmZWN0LmpzIiwiL2hvbWUvYXpiYW5nL1BvbHlSdW4uanMvc3JjL1BvbHlSdW4uanMiLCIvaG9tZS9hemJhbmcvUG9seVJ1bi5qcy9zcmMvZmFrZV9hMWY2NmRjOS5qcyIsIi9ob21lL2F6YmFuZy9Qb2x5UnVuLmpzL3NyYy9oZWxwZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBEZWxhdW5heTtcblxuKGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcblxuICB2YXIgRVBTSUxPTiA9IDEuMCAvIDEwNDg1NzYuMDtcblxuICBmdW5jdGlvbiBzdXBlcnRyaWFuZ2xlKHZlcnRpY2VzKSB7XG4gICAgdmFyIHhtaW4gPSBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFksXG4gICAgICAgIHltaW4gPSBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFksXG4gICAgICAgIHhtYXggPSBOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFksXG4gICAgICAgIHltYXggPSBOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFksXG4gICAgICAgIGksIGR4LCBkeSwgZG1heCwgeG1pZCwgeW1pZDtcblxuICAgIGZvcihpID0gdmVydGljZXMubGVuZ3RoOyBpLS07ICkge1xuICAgICAgaWYodmVydGljZXNbaV1bMF0gPCB4bWluKSB4bWluID0gdmVydGljZXNbaV1bMF07XG4gICAgICBpZih2ZXJ0aWNlc1tpXVswXSA+IHhtYXgpIHhtYXggPSB2ZXJ0aWNlc1tpXVswXTtcbiAgICAgIGlmKHZlcnRpY2VzW2ldWzFdIDwgeW1pbikgeW1pbiA9IHZlcnRpY2VzW2ldWzFdO1xuICAgICAgaWYodmVydGljZXNbaV1bMV0gPiB5bWF4KSB5bWF4ID0gdmVydGljZXNbaV1bMV07XG4gICAgfVxuXG4gICAgZHggPSB4bWF4IC0geG1pbjtcbiAgICBkeSA9IHltYXggLSB5bWluO1xuICAgIGRtYXggPSBNYXRoLm1heChkeCwgZHkpO1xuICAgIHhtaWQgPSB4bWluICsgZHggKiAwLjU7XG4gICAgeW1pZCA9IHltaW4gKyBkeSAqIDAuNTtcblxuICAgIHJldHVybiBbXG4gICAgICBbeG1pZCAtIDIwICogZG1heCwgeW1pZCAtICAgICAgZG1heF0sXG4gICAgICBbeG1pZCAgICAgICAgICAgICwgeW1pZCArIDIwICogZG1heF0sXG4gICAgICBbeG1pZCArIDIwICogZG1heCwgeW1pZCAtICAgICAgZG1heF1cbiAgICBdO1xuICB9XG5cbiAgZnVuY3Rpb24gY2lyY3VtY2lyY2xlKHZlcnRpY2VzLCBpLCBqLCBrKSB7XG4gICAgdmFyIHgxID0gdmVydGljZXNbaV1bMF0sXG4gICAgICAgIHkxID0gdmVydGljZXNbaV1bMV0sXG4gICAgICAgIHgyID0gdmVydGljZXNbal1bMF0sXG4gICAgICAgIHkyID0gdmVydGljZXNbal1bMV0sXG4gICAgICAgIHgzID0gdmVydGljZXNba11bMF0sXG4gICAgICAgIHkzID0gdmVydGljZXNba11bMV0sXG4gICAgICAgIGZhYnN5MXkyID0gTWF0aC5hYnMoeTEgLSB5MiksXG4gICAgICAgIGZhYnN5MnkzID0gTWF0aC5hYnMoeTIgLSB5MyksXG4gICAgICAgIHhjLCB5YywgbTEsIG0yLCBteDEsIG14MiwgbXkxLCBteTIsIGR4LCBkeTtcblxuICAgIC8qIENoZWNrIGZvciBjb2luY2lkZW50IHBvaW50cyAqL1xuICAgIGlmKGZhYnN5MXkyIDwgRVBTSUxPTiAmJiBmYWJzeTJ5MyA8IEVQU0lMT04pXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFZWshIENvaW5jaWRlbnQgcG9pbnRzIVwiKTtcblxuICAgIGlmKGZhYnN5MXkyIDwgRVBTSUxPTikge1xuICAgICAgbTIgID0gLSgoeDMgLSB4MikgLyAoeTMgLSB5MikpO1xuICAgICAgbXgyID0gKHgyICsgeDMpIC8gMi4wO1xuICAgICAgbXkyID0gKHkyICsgeTMpIC8gMi4wO1xuICAgICAgeGMgID0gKHgyICsgeDEpIC8gMi4wO1xuICAgICAgeWMgID0gbTIgKiAoeGMgLSBteDIpICsgbXkyO1xuICAgIH1cblxuICAgIGVsc2UgaWYoZmFic3kyeTMgPCBFUFNJTE9OKSB7XG4gICAgICBtMSAgPSAtKCh4MiAtIHgxKSAvICh5MiAtIHkxKSk7XG4gICAgICBteDEgPSAoeDEgKyB4MikgLyAyLjA7XG4gICAgICBteTEgPSAoeTEgKyB5MikgLyAyLjA7XG4gICAgICB4YyAgPSAoeDMgKyB4MikgLyAyLjA7XG4gICAgICB5YyAgPSBtMSAqICh4YyAtIG14MSkgKyBteTE7XG4gICAgfVxuXG4gICAgZWxzZSB7XG4gICAgICBtMSAgPSAtKCh4MiAtIHgxKSAvICh5MiAtIHkxKSk7XG4gICAgICBtMiAgPSAtKCh4MyAtIHgyKSAvICh5MyAtIHkyKSk7XG4gICAgICBteDEgPSAoeDEgKyB4MikgLyAyLjA7XG4gICAgICBteDIgPSAoeDIgKyB4MykgLyAyLjA7XG4gICAgICBteTEgPSAoeTEgKyB5MikgLyAyLjA7XG4gICAgICBteTIgPSAoeTIgKyB5MykgLyAyLjA7XG4gICAgICB4YyAgPSAobTEgKiBteDEgLSBtMiAqIG14MiArIG15MiAtIG15MSkgLyAobTEgLSBtMik7XG4gICAgICB5YyAgPSAoZmFic3kxeTIgPiBmYWJzeTJ5MykgP1xuICAgICAgICBtMSAqICh4YyAtIG14MSkgKyBteTEgOlxuICAgICAgICBtMiAqICh4YyAtIG14MikgKyBteTI7XG4gICAgfVxuXG4gICAgZHggPSB4MiAtIHhjO1xuICAgIGR5ID0geTIgLSB5YztcbiAgICByZXR1cm4ge2k6IGksIGo6IGosIGs6IGssIHg6IHhjLCB5OiB5YywgcjogZHggKiBkeCArIGR5ICogZHl9O1xuICB9XG5cbiAgZnVuY3Rpb24gZGVkdXAoZWRnZXMpIHtcbiAgICB2YXIgaSwgaiwgYSwgYiwgbSwgbjtcblxuICAgIGZvcihqID0gZWRnZXMubGVuZ3RoOyBqOyApIHtcbiAgICAgIGIgPSBlZGdlc1stLWpdO1xuICAgICAgYSA9IGVkZ2VzWy0tal07XG5cbiAgICAgIGZvcihpID0gajsgaTsgKSB7XG4gICAgICAgIG4gPSBlZGdlc1stLWldO1xuICAgICAgICBtID0gZWRnZXNbLS1pXTtcblxuICAgICAgICBpZigoYSA9PT0gbSAmJiBiID09PSBuKSB8fCAoYSA9PT0gbiAmJiBiID09PSBtKSkge1xuICAgICAgICAgIGVkZ2VzLnNwbGljZShqLCAyKTtcbiAgICAgICAgICBlZGdlcy5zcGxpY2UoaSwgMik7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBEZWxhdW5heSA9IHtcbiAgICB0cmlhbmd1bGF0ZTogZnVuY3Rpb24odmVydGljZXMsIGtleSkge1xuICAgICAgdmFyIG4gPSB2ZXJ0aWNlcy5sZW5ndGgsXG4gICAgICAgICAgaSwgaiwgaW5kaWNlcywgc3QsIG9wZW4sIGNsb3NlZCwgZWRnZXMsIGR4LCBkeSwgYSwgYiwgYztcblxuICAgICAgLyogQmFpbCBpZiB0aGVyZSBhcmVuJ3QgZW5vdWdoIHZlcnRpY2VzIHRvIGZvcm0gYW55IHRyaWFuZ2xlcy4gKi9cbiAgICAgIGlmKG4gPCAzKVxuICAgICAgICByZXR1cm4gW107XG5cbiAgICAgIC8qIFNsaWNlIG91dCB0aGUgYWN0dWFsIHZlcnRpY2VzIGZyb20gdGhlIHBhc3NlZCBvYmplY3RzLiAoRHVwbGljYXRlIHRoZVxuICAgICAgICogYXJyYXkgZXZlbiBpZiB3ZSBkb24ndCwgdGhvdWdoLCBzaW5jZSB3ZSBuZWVkIHRvIG1ha2UgYSBzdXBlcnRyaWFuZ2xlXG4gICAgICAgKiBsYXRlciBvbiEpICovXG4gICAgICB2ZXJ0aWNlcyA9IHZlcnRpY2VzLnNsaWNlKDApO1xuXG4gICAgICBpZihrZXkpXG4gICAgICAgIGZvcihpID0gbjsgaS0tOyApXG4gICAgICAgICAgdmVydGljZXNbaV0gPSB2ZXJ0aWNlc1tpXVtrZXldO1xuXG4gICAgICAvKiBNYWtlIGFuIGFycmF5IG9mIGluZGljZXMgaW50byB0aGUgdmVydGV4IGFycmF5LCBzb3J0ZWQgYnkgdGhlXG4gICAgICAgKiB2ZXJ0aWNlcycgeC1wb3NpdGlvbi4gKi9cbiAgICAgIGluZGljZXMgPSBuZXcgQXJyYXkobik7XG5cbiAgICAgIGZvcihpID0gbjsgaS0tOyApXG4gICAgICAgIGluZGljZXNbaV0gPSBpO1xuXG4gICAgICBpbmRpY2VzLnNvcnQoZnVuY3Rpb24oaSwgaikge1xuICAgICAgICByZXR1cm4gdmVydGljZXNbal1bMF0gLSB2ZXJ0aWNlc1tpXVswXTtcbiAgICAgIH0pO1xuXG4gICAgICAvKiBOZXh0LCBmaW5kIHRoZSB2ZXJ0aWNlcyBvZiB0aGUgc3VwZXJ0cmlhbmdsZSAod2hpY2ggY29udGFpbnMgYWxsIG90aGVyXG4gICAgICAgKiB0cmlhbmdsZXMpLCBhbmQgYXBwZW5kIHRoZW0gb250byB0aGUgZW5kIG9mIGEgKGNvcHkgb2YpIHRoZSB2ZXJ0ZXhcbiAgICAgICAqIGFycmF5LiAqL1xuICAgICAgc3QgPSBzdXBlcnRyaWFuZ2xlKHZlcnRpY2VzKTtcbiAgICAgIHZlcnRpY2VzLnB1c2goc3RbMF0sIHN0WzFdLCBzdFsyXSk7XG4gICAgICBcbiAgICAgIC8qIEluaXRpYWxpemUgdGhlIG9wZW4gbGlzdCAoY29udGFpbmluZyB0aGUgc3VwZXJ0cmlhbmdsZSBhbmQgbm90aGluZ1xuICAgICAgICogZWxzZSkgYW5kIHRoZSBjbG9zZWQgbGlzdCAod2hpY2ggaXMgZW1wdHkgc2luY2Ugd2UgaGF2bid0IHByb2Nlc3NlZFxuICAgICAgICogYW55IHRyaWFuZ2xlcyB5ZXQpLiAqL1xuICAgICAgb3BlbiAgID0gW2NpcmN1bWNpcmNsZSh2ZXJ0aWNlcywgbiArIDAsIG4gKyAxLCBuICsgMildO1xuICAgICAgY2xvc2VkID0gW107XG4gICAgICBlZGdlcyAgPSBbXTtcblxuICAgICAgLyogSW5jcmVtZW50YWxseSBhZGQgZWFjaCB2ZXJ0ZXggdG8gdGhlIG1lc2guICovXG4gICAgICBmb3IoaSA9IGluZGljZXMubGVuZ3RoOyBpLS07IGVkZ2VzLmxlbmd0aCA9IDApIHtcbiAgICAgICAgYyA9IGluZGljZXNbaV07XG5cbiAgICAgICAgLyogRm9yIGVhY2ggb3BlbiB0cmlhbmdsZSwgY2hlY2sgdG8gc2VlIGlmIHRoZSBjdXJyZW50IHBvaW50IGlzXG4gICAgICAgICAqIGluc2lkZSBpdCdzIGNpcmN1bWNpcmNsZS4gSWYgaXQgaXMsIHJlbW92ZSB0aGUgdHJpYW5nbGUgYW5kIGFkZFxuICAgICAgICAgKiBpdCdzIGVkZ2VzIHRvIGFuIGVkZ2UgbGlzdC4gKi9cbiAgICAgICAgZm9yKGogPSBvcGVuLmxlbmd0aDsgai0tOyApIHtcbiAgICAgICAgICAvKiBJZiB0aGlzIHBvaW50IGlzIHRvIHRoZSByaWdodCBvZiB0aGlzIHRyaWFuZ2xlJ3MgY2lyY3VtY2lyY2xlLFxuICAgICAgICAgICAqIHRoZW4gdGhpcyB0cmlhbmdsZSBzaG91bGQgbmV2ZXIgZ2V0IGNoZWNrZWQgYWdhaW4uIFJlbW92ZSBpdFxuICAgICAgICAgICAqIGZyb20gdGhlIG9wZW4gbGlzdCwgYWRkIGl0IHRvIHRoZSBjbG9zZWQgbGlzdCwgYW5kIHNraXAuICovXG4gICAgICAgICAgZHggPSB2ZXJ0aWNlc1tjXVswXSAtIG9wZW5bal0ueDtcbiAgICAgICAgICBpZihkeCA+IDAuMCAmJiBkeCAqIGR4ID4gb3BlbltqXS5yKSB7XG4gICAgICAgICAgICBjbG9zZWQucHVzaChvcGVuW2pdKTtcbiAgICAgICAgICAgIG9wZW4uc3BsaWNlKGosIDEpO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLyogSWYgd2UncmUgb3V0c2lkZSB0aGUgY2lyY3VtY2lyY2xlLCBza2lwIHRoaXMgdHJpYW5nbGUuICovXG4gICAgICAgICAgZHkgPSB2ZXJ0aWNlc1tjXVsxXSAtIG9wZW5bal0ueTtcbiAgICAgICAgICBpZihkeCAqIGR4ICsgZHkgKiBkeSAtIG9wZW5bal0uciA+IEVQU0lMT04pXG4gICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgIC8qIFJlbW92ZSB0aGUgdHJpYW5nbGUgYW5kIGFkZCBpdCdzIGVkZ2VzIHRvIHRoZSBlZGdlIGxpc3QuICovXG4gICAgICAgICAgZWRnZXMucHVzaChcbiAgICAgICAgICAgIG9wZW5bal0uaSwgb3BlbltqXS5qLFxuICAgICAgICAgICAgb3BlbltqXS5qLCBvcGVuW2pdLmssXG4gICAgICAgICAgICBvcGVuW2pdLmssIG9wZW5bal0uaVxuICAgICAgICAgICk7XG4gICAgICAgICAgb3Blbi5zcGxpY2UoaiwgMSk7XG4gICAgICAgIH1cblxuICAgICAgICAvKiBSZW1vdmUgYW55IGRvdWJsZWQgZWRnZXMuICovXG4gICAgICAgIGRlZHVwKGVkZ2VzKTtcblxuICAgICAgICAvKiBBZGQgYSBuZXcgdHJpYW5nbGUgZm9yIGVhY2ggZWRnZS4gKi9cbiAgICAgICAgZm9yKGogPSBlZGdlcy5sZW5ndGg7IGo7ICkge1xuICAgICAgICAgIGIgPSBlZGdlc1stLWpdO1xuICAgICAgICAgIGEgPSBlZGdlc1stLWpdO1xuICAgICAgICAgIG9wZW4ucHVzaChjaXJjdW1jaXJjbGUodmVydGljZXMsIGEsIGIsIGMpKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvKiBDb3B5IGFueSByZW1haW5pbmcgb3BlbiB0cmlhbmdsZXMgdG8gdGhlIGNsb3NlZCBsaXN0LCBhbmQgdGhlblxuICAgICAgICogcmVtb3ZlIGFueSB0cmlhbmdsZXMgdGhhdCBzaGFyZSBhIHZlcnRleCB3aXRoIHRoZSBzdXBlcnRyaWFuZ2xlLFxuICAgICAgICogYnVpbGRpbmcgYSBsaXN0IG9mIHRyaXBsZXRzIHRoYXQgcmVwcmVzZW50IHRyaWFuZ2xlcy4gKi9cbiAgICAgIGZvcihpID0gb3Blbi5sZW5ndGg7IGktLTsgKVxuICAgICAgICBjbG9zZWQucHVzaChvcGVuW2ldKTtcbiAgICAgIG9wZW4ubGVuZ3RoID0gMDtcblxuICAgICAgZm9yKGkgPSBjbG9zZWQubGVuZ3RoOyBpLS07IClcbiAgICAgICAgaWYoY2xvc2VkW2ldLmkgPCBuICYmIGNsb3NlZFtpXS5qIDwgbiAmJiBjbG9zZWRbaV0uayA8IG4pXG4gICAgICAgICAgb3Blbi5wdXNoKGNsb3NlZFtpXS5pLCBjbG9zZWRbaV0uaiwgY2xvc2VkW2ldLmspO1xuXG4gICAgICAvKiBZYXksIHdlJ3JlIGRvbmUhICovXG4gICAgICByZXR1cm4gb3BlbjtcbiAgICB9LFxuICAgIGNvbnRhaW5zOiBmdW5jdGlvbih0cmksIHApIHtcbiAgICAgIC8qIEJvdW5kaW5nIGJveCB0ZXN0IGZpcnN0LCBmb3IgcXVpY2sgcmVqZWN0aW9ucy4gKi9cbiAgICAgIGlmKChwWzBdIDwgdHJpWzBdWzBdICYmIHBbMF0gPCB0cmlbMV1bMF0gJiYgcFswXSA8IHRyaVsyXVswXSkgfHxcbiAgICAgICAgIChwWzBdID4gdHJpWzBdWzBdICYmIHBbMF0gPiB0cmlbMV1bMF0gJiYgcFswXSA+IHRyaVsyXVswXSkgfHxcbiAgICAgICAgIChwWzFdIDwgdHJpWzBdWzFdICYmIHBbMV0gPCB0cmlbMV1bMV0gJiYgcFsxXSA8IHRyaVsyXVsxXSkgfHxcbiAgICAgICAgIChwWzFdID4gdHJpWzBdWzFdICYmIHBbMV0gPiB0cmlbMV1bMV0gJiYgcFsxXSA+IHRyaVsyXVsxXSkpXG4gICAgICAgIHJldHVybiBudWxsO1xuXG4gICAgICB2YXIgYSA9IHRyaVsxXVswXSAtIHRyaVswXVswXSxcbiAgICAgICAgICBiID0gdHJpWzJdWzBdIC0gdHJpWzBdWzBdLFxuICAgICAgICAgIGMgPSB0cmlbMV1bMV0gLSB0cmlbMF1bMV0sXG4gICAgICAgICAgZCA9IHRyaVsyXVsxXSAtIHRyaVswXVsxXSxcbiAgICAgICAgICBpID0gYSAqIGQgLSBiICogYztcblxuICAgICAgLyogRGVnZW5lcmF0ZSB0cmkuICovXG4gICAgICBpZihpID09PSAwLjApXG4gICAgICAgIHJldHVybiBudWxsO1xuXG4gICAgICB2YXIgdSA9IChkICogKHBbMF0gLSB0cmlbMF1bMF0pIC0gYiAqIChwWzFdIC0gdHJpWzBdWzFdKSkgLyBpLFxuICAgICAgICAgIHYgPSAoYSAqIChwWzFdIC0gdHJpWzBdWzFdKSAtIGMgKiAocFswXSAtIHRyaVswXVswXSkpIC8gaTtcblxuICAgICAgLyogSWYgd2UncmUgb3V0c2lkZSB0aGUgdHJpLCBmYWlsLiAqL1xuICAgICAgaWYodSA8IDAuMCB8fCB2IDwgMC4wIHx8ICh1ICsgdikgPiAxLjApXG4gICAgICAgIHJldHVybiBudWxsO1xuXG4gICAgICByZXR1cm4gW3UsIHZdO1xuICAgIH1cbiAgfTtcblxuICBpZih0eXBlb2YgbW9kdWxlICE9PSBcInVuZGVmaW5lZFwiKVxuICAgIG1vZHVsZS5leHBvcnRzID0gRGVsYXVuYXk7XG59KSgpO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmNvbnN0IGhlbHBlciA9IHJlcXVpcmUoXCIuL2hlbHBlclwiKTtcblxuY2xhc3MgUG9pbnQge1xuXHRjb25zdHJ1Y3Rvcihyb290LCBpbmRleCkge1xuXHRcdHRoaXMucm9vdCA9IHJvb3Q7XG5cdFx0dGhpcy5pbmRleCA9IGluZGV4O1xuXHRcdFxuXHRcdHRoaXMuY3R4ID0gcm9vdC5jdHg7XG5cdFx0dGhpcy5zdHlsZSA9IHJvb3Quc3R5bGU7XG5cdFx0XG5cdFx0dGhpcy54ID0gcm9vdC52ZXJ0aWNlc1tpbmRleF1bMF07XG5cdFx0dGhpcy55ID0gcm9vdC52ZXJ0aWNlc1tpbmRleF1bMV07XG5cdFx0dGhpcy5pZCA9IHJvb3QudmVydGljZXNbaW5kZXhdWzJdIHx8IDA7XG5cblx0XHR0aGlzLnN0eWxlID0gcm9vdC5zdHlsZVt0aGlzLmlkXSB8fCB7fTtcblxuXHRcdHRoaXMuY29tbW9ucyA9IFtdO1xuXHRcdHRoaXMudmFyaWFudHMgPSBbXTtcblx0XHR0aGlzLmR0Q29tbW9ucyA9IFtdO1xuXG5cdFx0dGhpcy5pc1N0YXJ0ID0gZmFsc2U7XG5cdH1cblx0bmV3TGluZUFuaW1hdGlvbigpIHtcblx0XHRpZighdGhpcy5jb21tb25zLmxlbmd0aCkgcmV0dXJuO1xuXG5cdFx0dmFyIGkgPSBoZWxwZXIucmFuZFJhbmdlKDAsIHRoaXMuY29tbW9ucy5sZW5ndGgtMSk7XG5cdFx0dGhpcy5kdENvbW1vbnMucHVzaChbe3g6IHRoaXMueCwgeTogdGhpcy55fSwgdGhpcy5jb21tb25zW2ldXSk7XG5cdFx0dGhpcy5jb21tb25zLnNwbGljZShpLCAxKTtcblx0fVxuXG5cdHN0YXJ0KCkge1xuXHRcdHRoaXMuaXNTdGFydCA9IHRydWU7XG5cdH1cblxuXHR1cGRhdGUoKSB7XG5cdFx0aWYodGhpcy5pc1N0YXJ0KSB7XG5cdFx0XHRpZihoZWxwZXIucmFuZFJhbmdlKDAsIHRoaXMucm9vdC5wcm9iYWJpbGl0eSkgPT09IDApIFxuXHRcdFx0XHR0aGlzLm5ld0xpbmVBbmltYXRpb24oKTtcblxuXHRcdFx0dGhpcy5hbmltYXRpb24oKTtcblx0XHR9XG5cdH1cblx0YW5pbWF0aW9uKCkge1xuXHRcdGZvcihsZXQgaSA9IDA7IGkgPCB0aGlzLmR0Q29tbW9ucy5sZW5ndGg7IGkrKykge1xuXHRcdFx0aWYodGhpcy5kdENvbW1vbnNbaV1bMl0pIGNvbnRpbnVlO1xuXG5cdFx0XHR2YXIgZHQgPSB0aGlzLmR0Q29tbW9uc1tpXTtcblx0XHRcdGR0WzBdLnggPSBoZWxwZXIubGVycChkdFswXS54LCBkdFsxXS54LCB0aGlzLnJvb3Quc3BlZWQpO1xuXHRcdFx0ZHRbMF0ueSA9IGhlbHBlci5sZXJwKGR0WzBdLnksIGR0WzFdLnksIHRoaXMucm9vdC5zcGVlZCk7XG5cblxuXHRcdFx0aWYoaGVscGVyLmNvbXBhcmUoZHRbMF0ueCwgZHRbMV0ueCwgMSkgJiYgaGVscGVyLmNvbXBhcmUoZHRbMF0ueSwgZHRbMV0ueSwgMSkpIHtcblx0XHRcdFx0dGhpcy5kdENvbW1vbnNbaV1bMl0gPSB0cnVlO1xuXHRcdFx0XHRkdFsxXS5zdGFydCgpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGRyYXcoKSB7XG5cdFx0aWYoIXRoaXMuaXNTdGFydCkgcmV0dXJuO1xuXG5cdFx0aWYodGhpcy5pZCA9PT0gMCkge1xuXHRcdFx0Zm9yKGxldCBrZXkgaW4gdGhpcy5yb290LnN0eWxlWzBdKSB7XG5cdFx0XHRcdHRoaXMuY3R4W2tleV0gPSB0aGlzLnJvb3Quc3R5bGVbMF1ba2V5XTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmb3IobGV0IGkgPSAwOyBpIDwgdGhpcy5kdENvbW1vbnMubGVuZ3RoOyBpKyspIHtcblxuXHRcdFx0aWYodGhpcy5pZCAhPT0gMCAmJiB0aGlzLmlkID09PSB0aGlzLmR0Q29tbW9uc1tpXVsxXS5pZCkge1xuXHRcdFx0XHRmb3IobGV0IGtleSBpbiB0aGlzLnJvb3Quc3R5bGVbdGhpcy5pZF0pIHtcblx0XHRcdFx0XHR0aGlzLmN0eFtrZXldID0gdGhpcy5yb290LnN0eWxlW3RoaXMuaWRdW2tleV07XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0dGhpcy5jdHguYmVnaW5QYXRoKCk7XG5cdFx0XHR0aGlzLmN0eC5tb3ZlVG8odGhpcy54LCB0aGlzLnkpO1xuXHRcdFx0dGhpcy5jdHgubGluZVRvKHRoaXMuZHRDb21tb25zW2ldWzBdLngsIHRoaXMuZHRDb21tb25zW2ldWzBdLnksIDAsIDAsIDIqTWF0aC5QSSk7XHRcdFxuXHRcdFx0dGhpcy5jdHguc3Ryb2tlKCk7XG5cdFx0fVxuXHRcdFxuXG5cdFx0aWYodGhpcy5jdHguaXNSZW5kZXJQb2ludCkge1xuXHRcdFx0dGhpcy5jdHguYXJjKHRoaXMueCwgdGhpcy55LCB0aGlzLmN0eC5yYWRpdXNQb2ludCB8fCAyLjUsIDAsIDIqTWF0aC5QSSk7XG5cdFx0XHR0aGlzLmN0eC5maWxsKCk7XG5cdFx0fVxuXHR9XG5cblx0cmVzaXplKCkge1x0XG5cdFx0dGhpcy54ID0gdGhpcy5yb290LnZlcnRpY2VzW3RoaXMuaW5kZXhdWzBdKnRoaXMucm9vdC56b29tO1xuXHRcdHRoaXMueSA9IHRoaXMucm9vdC52ZXJ0aWNlc1t0aGlzLmluZGV4XVsxXSp0aGlzLnJvb3Quem9vbTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFBvaW50OyIsIlwidXNlIHN0cmljdFwiO1xuXG5jb25zdCBkZWxhdW5heSA9IHJlcXVpcmUoXCJkZWxhdW5heS1mYXN0XCIpO1xuY29uc3QgUG9pbnQgPSByZXF1aXJlKFwiLi9Qb2ludFwiKTtcbmNvbnN0IGhlbHBlciA9IHJlcXVpcmUoXCIuL2hlbHBlclwiKTtcblxuY2xhc3MgUG9seUVmZmVjdCB7XG5cdGNvbnN0cnVjdG9yKGNvbmZpZyA9IHt9KSB7XG5cdFx0dGhpcy5yb290ID0gY29uZmlnLnJvb3Q7XG5cblx0XHR0aGlzLnBhcmVudCA9IGNvbmZpZy5wYXJlbnQ7XG5cdFx0dGhpcy52aWV3ID0gY29uZmlnLnZpZXc7XG5cdFx0dGhpcy5jdHggPSB0aGlzLnZpZXcuZ2V0Q29udGV4dCgnMmQnKTtcblxuXHRcdHRoaXMudyA9IGNvbmZpZy53IHx8IHRoaXMucGFyZW50Lm9mZnNldFdpZHRoO1xuXHRcdHRoaXMuaCA9IGNvbmZpZy5oIHx8IHRoaXMucGFyZW50Lm9mZnNldEhlaWdodDtcblxuXHRcdHRoaXMudmlldy53aWR0aCA9IHRoaXMudztcblx0XHR0aGlzLnZpZXcuaGVpZ2h0ID0gdGhpcy5oO1xuXHRcdHRoaXMucm9vdFNjYWxlID0gY29uZmlnLnJvb3RTY2FsZSB8fCB0aGlzLnc7XG5cdFx0dGhpcy56b29tID0gdGhpcy53L3RoaXMucm9vdFNjYWxlO1xuXHRcdFxuXG5cblxuXHRcdHRoaXMuY29tcHJlc3MgPSBjb25maWcuY29tcHJlc3MgfHwgNjtcblx0XHR0aGlzLmNlbGwgPSBjb25maWcuY2VsbCB8fCAxMDA7XG5cdFx0dGhpcy5zcGVlZCA9IGNvbmZpZy5zcGVlZCB8fCAwLjE7XG5cdFx0dGhpcy5wcm9iYWJpbGl0eSA9IGNvbmZpZy5wcm9iYWJpbGl0eSB8fCAxMDtcblx0XHR0aGlzLmFjY2VsZXJhdGlvbiA9IGNvbmZpZy5hY2NlbGVyYXRpb24gfHwgMC4wMDE7XG5cdFx0dGhpcy5zdGFydFBvaW50ID0gY29uZmlnLnN0YXJ0UG9pbnQgfHwgbnVsbDtcblx0XHR0aGlzLnN0eWxlID0gY29uZmlnLnN0eWxlIHx8IHt9O1xuXG5cblx0XHRpZihjb25maWcudmVydGljZXMpXG5cdFx0XHR0aGlzLnZlcnRpY2VzID0gY29uZmlnLnZlcnRpY2VzO1xuXHRcdGVsc2UgdGhpcy5fZ2VuZXJhdGVWZXJ0aWNlcygpO1xuXHRcdHRoaXMucG9pbnRzID0gW107XG5cdFx0dGhpcy50cmlhbmdsZXMgPSBbXTtcblxuXHRcdHRoaXMuX2NyZWF0ZSgpO1xuXHRcdHRoaXMuc3RhcnRQb2ludCAhPSBudWxsICYmIHRoaXMuc3RhcnQoKTtcblx0fVxuXHRfZ2VuZXJhdGVWZXJ0aWNlcygpIHtcblx0XHR0aGlzLnZlcnRpY2VzID0gW107XG5cblx0XHRmb3IobGV0IHkgPSAtMTsgeSA8IE1hdGgucm91bmQodGhpcy5oL3RoaXMuY2VsbCkrMTsgeSsrKSB7XG5cdFx0XHRmb3IobGV0IHggPSAtMTsgeCA8IE1hdGgucm91bmQodGhpcy53L3RoaXMuY2VsbCkrMTsgeCsrKSB7XG5cdFx0XHRcdGxldCBwb3NZID0gaGVscGVyLnJhbmRSYW5nZSh5KnRoaXMuY2VsbCt0aGlzLmNlbGwvdGhpcy5jb21wcmVzcywgKHkrMSkqdGhpcy5jZWxsLXRoaXMuY2VsbC90aGlzLmNvbXByZXNzKTtcblx0XHRcdFx0bGV0IHBvc1ggPSBoZWxwZXIucmFuZFJhbmdlKHgqdGhpcy5jZWxsK3RoaXMuY2VsbC90aGlzLmNvbXByZXNzLCAoeCsxKSp0aGlzLmNlbGwtdGhpcy5jZWxsL3RoaXMuY29tcHJlc3MpO1xuXG5cdFx0XHRcdHRoaXMudmVydGljZXMucHVzaChbcG9zWCwgcG9zWV0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHRfY3JlYXRlUG9pbnRzKCkge1xuXHRcdHZhciBpdGVyYXRpb25zQ29udHJvbCA9IDA7XG5cdFx0Zm9yKHZhciBpID0gMDsgaSA8IHRoaXMudHJpYW5nbGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgcG9pbnRzO1xuXHRcdFx0dmFyIGluZCA9IHRoaXMudHJpYW5nbGVzW2ldO1xuXG5cdFx0XHRpdGVyYXRpb25zQ29udHJvbCsrO1xuXHRcdFx0aWYoIXRoaXMucG9pbnRzW2luZF0pIHRoaXMucG9pbnRzW2luZF0gPSBuZXcgUG9pbnQodGhpcywgaW5kKTtcblxuXHRcdFx0c3dpdGNoKGl0ZXJhdGlvbnNDb250cm9sKSB7XG5cdFx0XHRcdGNhc2UgMTpcblx0XHRcdFx0XHRwb2ludHMgPSBbdGhpcy50cmlhbmdsZXNbaSsxXSwgdGhpcy50cmlhbmdsZXNbaSsyXV07XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgMjpcblx0XHRcdFx0XHRwb2ludHMgPSBbdGhpcy50cmlhbmdsZXNbaS0xXSwgdGhpcy50cmlhbmdsZXNbaSsxXV07XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgMzpcblx0XHRcdFx0XHRwb2ludHMgPSBbdGhpcy50cmlhbmdsZXNbaS0xXSwgdGhpcy50cmlhbmdsZXNbaS0yXV07XG5cdFx0XHRcdFx0aXRlcmF0aW9uc0NvbnRyb2wgPSAwO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXG5cdFx0XHRlYWNoUG9pbnRzOiBmb3IobGV0IHAgPSAwOyBwIDwgcG9pbnRzLmxlbmd0aDsgcCsrKSB7XG5cdFx0XHRcdGZvcihsZXQgaiA9IDA7IGogPCB0aGlzLnBvaW50c1tpbmRdLmNvbW1vbnMubGVuZ3RoOyBqKyspIHtcblx0XHRcdFx0XHRpZih0aGlzLnBvaW50c1tpbmRdLmNvbW1vbnNbal0gPT0gcG9pbnRzW3BdKSBjb250aW51ZSBlYWNoUG9pbnRzO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMucG9pbnRzW2luZF0uY29tbW9ucy5wdXNoKHBvaW50c1twXSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdF9jcmVhdGVQb2ludExpbmtzKCkge1xuXHRcdGZvcihsZXQgaSA9IDA7IGkgPCB0aGlzLnBvaW50cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0Zm9yKGxldCBwID0gMDsgcCA8IHRoaXMucG9pbnRzW2ldLmNvbW1vbnMubGVuZ3RoOyBwKyspIHtcblx0XHRcdFx0dGhpcy5wb2ludHNbaV0uY29tbW9uc1twXSA9IHRoaXMucG9pbnRzW3RoaXMucG9pbnRzW2ldLmNvbW1vbnNbcF1dO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdF9jcmVhdGUoKSB7XG5cdFx0dGhpcy50cmlhbmdsZXMgPSBkZWxhdW5heS50cmlhbmd1bGF0ZSh0aGlzLnZlcnRpY2VzKTtcblx0XHR0aGlzLl9jcmVhdGVQb2ludHMoKTtcblx0XHR0aGlzLl9jcmVhdGVQb2ludExpbmtzKCk7XG5cdH1cblx0c3RhcnQoaW5kZXgpIHtcblx0XHR0aGlzLnBvaW50c1tpbmRleCB8fCB0aGlzLnN0YXJ0UG9pbnRdLnN0YXJ0KCk7XG5cdH1cblxuXHR1cGRhdGUoKSB7XG5cdFx0aWYodGhpcy5zcGVlZCA8IDAuNSkgXG5cdFx0XHR0aGlzLnNwZWVkICs9IHRoaXMuYWNjZWxlcmF0aW9uO1xuXG5cdFx0Zm9yKGxldCBpID0gdGhpcy5wb2ludHMubGVuZ3RoOyBpOykge1xuXHRcdFx0LS1pOyB0aGlzLnBvaW50c1tpXS51cGRhdGUoKTtcblx0XHR9XG5cdH1cblx0ZHJhdygpIHtcblx0XHR0aGlzLmN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy53LCB0aGlzLmgpO1xuXG5cdFx0Zm9yKGxldCBpID0gdGhpcy5wb2ludHMubGVuZ3RoOyBpOykge1xuXHRcdFx0LS1pOyB0aGlzLnBvaW50c1tpXS5kcmF3KCk7XG5cdFx0fVxuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHR0aGlzLncgPSB0aGlzLnJvb3Qub2Zmc2V0V2lkdGg7XG5cdFx0dGhpcy5oID0gdGhpcy5yb290Lm9mZnNldEhlaWdodDtcblx0XHR0aGlzLnZpZXcud2lkdGggPSB0aGlzLnc7XG5cdFx0dGhpcy52aWV3LmhlaWdodCA9IHRoaXMuaDtcblx0XHR0aGlzLnpvb20gPSB0aGlzLncvdGhpcy5yb290U2NhbGU7XG5cblx0XHRmb3IobGV0IGkgPSB0aGlzLnBvaW50cy5sZW5ndGg7IGk7KSB7XG5cdFx0XHQtLWk7IHRoaXMucG9pbnRzW2ldLnJlc2l6ZSgpO1xuXHRcdH1cblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFBvbHlFZmZlY3Q7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmNvbnN0IFBvbHlFZmZlY3QgPSByZXF1aXJlKCcuL1BvbHlFZmZlY3QuanMnKTtcblxudmFyIFBvbHlSdW4gPSB7XG5cdGVmZmVjdHM6IHt9LFxuXG5cdGFkZChrZXksIGNvbmZpZykge1xuXHRcdGNvbmZpZy5yb290ID0gdGhpcztcblxuXHRcdGxldCBlZmYgPSBuZXcgUG9seUVmZmVjdChjb25maWcpO1xuXHRcdHRoaXMuZWZmZWN0c1trZXldID0gZWZmO1xuXHR9LFxuXHRyZW1vdmUoa2V5KSB7XG5cdFx0ZGVsZXRlIHRoaXMuZWZmZWN0c1trZXldO1xuXHR9LFxuXG5cdHVwZGF0ZSgpIHtcblx0XHRmb3IobGV0IGtleSBpbiB0aGlzLmVmZmVjdHMpIHtcblx0XHRcdHRoaXMuZWZmZWN0c1trZXldLnVwZGF0ZSgpO1xuXHRcdFx0dGhpcy5lZmZlY3RzW2tleV0uZHJhdygpO1xuXHRcdH1cblx0fVxufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFBvbHlSdW47IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfZ2xvYmFsID0gd2luZG93IHx8IHt9O1xuX2dsb2JhbC5Qb2x5UnVuID0gcmVxdWlyZSgnLi9Qb2x5UnVuJyk7XG5cbmlmKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSBcblx0bW9kdWxlLmV4cG9ydHMgPSBQb2x5UnVuOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgaGVscGVyID0ge1xuXHR0b1JhZGlhbnMoZGVnKSB7XG5cdFx0cmV0dXJuIGRlZyAqIE1hdGguUEkvMTgwO1xuXHR9LFxuXHR0b0RlZ3JlZShyYWQpIHtcblx0XHRyZXR1cm4gcmFkIC8gTWF0aC5QSSAqIDE4MDtcblx0fSxcblxuXHRyYW5kUmFuZ2UobWluLCBtYXgsIGlzUm91bmQgPSB0cnVlKSB7XG5cdFx0dmFyIHJhbmQgPSBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpICsgbWluO1xuXG5cdFx0aWYoaXNSb3VuZCkgcmV0dXJuIE1hdGguZmxvb3IocmFuZCk7XG5cdFx0ZWxzZSByZXR1cm4gcmFuZDtcblx0fSxcblx0Y29tcGFyZShhLCBiLCBlKSB7XG5cdFx0cmV0dXJuIGUgPyBhID4gYi1lICYmIGEgPCBiK2UgOiBhID09IGI7XG5cdH0sXG5cblx0bGVycCh2MCwgdjEsIHQpIHtcblx0XHRyZXR1cm4gKDEtdCkqdjAgKyB0KnYxO1xuXHR9LFxuXG5cdGlzRmluZFZhbHVlSW5BcnJheShhcnIsIHZhbCkge1xuXHRcdGZvcihsZXQgaSA9IGFyci5sZW5naHQ7IGk7ICkge1xuXHRcdFx0KytpOyBpZihhcnJbaV0gPT0gdmFsKSByZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaGVscGVyOyJdfQ==
