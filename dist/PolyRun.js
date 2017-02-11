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
		this.ctx = root.ctx;
		this.style = root.style;
		
		this.index = index;

		this.x = root.vertices[index][0]*root.zoom;
		this.y = root.vertices[index][1]*root.zoom;
		this.isSelect = root.vertices[index][2];

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
			if(helper.randRange(0, this.root.probabilityCreateAnimation) === 0) this.newLineAnimation();
			this.animation();
		}
	}
	animation() {
		for(let i = 0; i < this.dtCommons.length; i++) {
			if(this.dtCommons[i][2]) continue;

			var dt = this.dtCommons[i];
			var speed = Math.min(this.root.animationSpeed, 0.8);
			dt[0].x = helper.lerp(dt[0].x, dt[1].x, speed);
			dt[0].y = helper.lerp(dt[0].y, dt[1].y, speed);


			if(helper.compare(dt[0].x, dt[1].x, 1) && helper.compare(dt[0].y, dt[1].y, 1)) {
				this.dtCommons[i][2] = true;
				dt[1].start();
			}
		}
	}

	draw() {
		if(!this.isStart) return;

		for(let i = 0; i < this.dtCommons.length; i++) {
			this.ctx.strokeStyle = this.isSelect && this.dtCommons[i][1].isSelect ? this.style.colorActiveLine : this.style.colorLine;
			this.ctx.lineWidth = this.style.lineWidth;

			this.ctx.beginPath();
			this.ctx.moveTo(this.x, this.y);
			this.ctx.lineTo(this.dtCommons[i][0].x, this.dtCommons[i][0].y, 0, 0, 2*Math.PI);		
			this.ctx.stroke();
		}
		

		if(this.style.isRenderPoint) {
			this.ctx.fillStyle = this.style.colorPoint;
			this.ctx.arc(this.x, this.y, this.style.radiusPoint || 2.5, 0, 2*Math.PI);
			this.ctx.fill();
		}
	}

	resize() {	
		this.x = this.root.vertices[this.index][0]*this.root.zoom;
		this.y = this.root.vertices[this.index][1]*this.root.zoom;
	}
}

module.exports = Point;
},{"./helper":5}],3:[function(require,module,exports){
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
},{"./Point":2,"./helper":5,"delaunay-fast":1}],4:[function(require,module,exports){
(function (global){
"use strict";

const PolyRun = require('./PolyRun');

var _global = (global || window) || {};

if(module) module.exports = PolyRun;
else _global['PolyRun'] = PolyRun;
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./PolyRun":3}],5:[function(require,module,exports){
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
	compare(a, b, err) {
		return err ? a > b-err && a < b+err : a == b;
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
},{}]},{},[4])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2F6YmFuZy9Qb2x5UnVuLmpzL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS9hemJhbmcvUG9seVJ1bi5qcy9ub2RlX21vZHVsZXMvZGVsYXVuYXktZmFzdC9kZWxhdW5heS5qcyIsIi9ob21lL2F6YmFuZy9Qb2x5UnVuLmpzL3NyYy9Qb2ludC5qcyIsIi9ob21lL2F6YmFuZy9Qb2x5UnVuLmpzL3NyYy9Qb2x5UnVuLmpzIiwiL2hvbWUvYXpiYW5nL1BvbHlSdW4uanMvc3JjL2Zha2VfNDVlYTg3YzcuanMiLCIvaG9tZS9hemJhbmcvUG9seVJ1bi5qcy9zcmMvaGVscGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMU9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgRGVsYXVuYXk7XG5cbihmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgdmFyIEVQU0lMT04gPSAxLjAgLyAxMDQ4NTc2LjA7XG5cbiAgZnVuY3Rpb24gc3VwZXJ0cmlhbmdsZSh2ZXJ0aWNlcykge1xuICAgIHZhciB4bWluID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZLFxuICAgICAgICB5bWluID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZLFxuICAgICAgICB4bWF4ID0gTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZLFxuICAgICAgICB5bWF4ID0gTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZLFxuICAgICAgICBpLCBkeCwgZHksIGRtYXgsIHhtaWQsIHltaWQ7XG5cbiAgICBmb3IoaSA9IHZlcnRpY2VzLmxlbmd0aDsgaS0tOyApIHtcbiAgICAgIGlmKHZlcnRpY2VzW2ldWzBdIDwgeG1pbikgeG1pbiA9IHZlcnRpY2VzW2ldWzBdO1xuICAgICAgaWYodmVydGljZXNbaV1bMF0gPiB4bWF4KSB4bWF4ID0gdmVydGljZXNbaV1bMF07XG4gICAgICBpZih2ZXJ0aWNlc1tpXVsxXSA8IHltaW4pIHltaW4gPSB2ZXJ0aWNlc1tpXVsxXTtcbiAgICAgIGlmKHZlcnRpY2VzW2ldWzFdID4geW1heCkgeW1heCA9IHZlcnRpY2VzW2ldWzFdO1xuICAgIH1cblxuICAgIGR4ID0geG1heCAtIHhtaW47XG4gICAgZHkgPSB5bWF4IC0geW1pbjtcbiAgICBkbWF4ID0gTWF0aC5tYXgoZHgsIGR5KTtcbiAgICB4bWlkID0geG1pbiArIGR4ICogMC41O1xuICAgIHltaWQgPSB5bWluICsgZHkgKiAwLjU7XG5cbiAgICByZXR1cm4gW1xuICAgICAgW3htaWQgLSAyMCAqIGRtYXgsIHltaWQgLSAgICAgIGRtYXhdLFxuICAgICAgW3htaWQgICAgICAgICAgICAsIHltaWQgKyAyMCAqIGRtYXhdLFxuICAgICAgW3htaWQgKyAyMCAqIGRtYXgsIHltaWQgLSAgICAgIGRtYXhdXG4gICAgXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNpcmN1bWNpcmNsZSh2ZXJ0aWNlcywgaSwgaiwgaykge1xuICAgIHZhciB4MSA9IHZlcnRpY2VzW2ldWzBdLFxuICAgICAgICB5MSA9IHZlcnRpY2VzW2ldWzFdLFxuICAgICAgICB4MiA9IHZlcnRpY2VzW2pdWzBdLFxuICAgICAgICB5MiA9IHZlcnRpY2VzW2pdWzFdLFxuICAgICAgICB4MyA9IHZlcnRpY2VzW2tdWzBdLFxuICAgICAgICB5MyA9IHZlcnRpY2VzW2tdWzFdLFxuICAgICAgICBmYWJzeTF5MiA9IE1hdGguYWJzKHkxIC0geTIpLFxuICAgICAgICBmYWJzeTJ5MyA9IE1hdGguYWJzKHkyIC0geTMpLFxuICAgICAgICB4YywgeWMsIG0xLCBtMiwgbXgxLCBteDIsIG15MSwgbXkyLCBkeCwgZHk7XG5cbiAgICAvKiBDaGVjayBmb3IgY29pbmNpZGVudCBwb2ludHMgKi9cbiAgICBpZihmYWJzeTF5MiA8IEVQU0lMT04gJiYgZmFic3kyeTMgPCBFUFNJTE9OKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRWVrISBDb2luY2lkZW50IHBvaW50cyFcIik7XG5cbiAgICBpZihmYWJzeTF5MiA8IEVQU0lMT04pIHtcbiAgICAgIG0yICA9IC0oKHgzIC0geDIpIC8gKHkzIC0geTIpKTtcbiAgICAgIG14MiA9ICh4MiArIHgzKSAvIDIuMDtcbiAgICAgIG15MiA9ICh5MiArIHkzKSAvIDIuMDtcbiAgICAgIHhjICA9ICh4MiArIHgxKSAvIDIuMDtcbiAgICAgIHljICA9IG0yICogKHhjIC0gbXgyKSArIG15MjtcbiAgICB9XG5cbiAgICBlbHNlIGlmKGZhYnN5MnkzIDwgRVBTSUxPTikge1xuICAgICAgbTEgID0gLSgoeDIgLSB4MSkgLyAoeTIgLSB5MSkpO1xuICAgICAgbXgxID0gKHgxICsgeDIpIC8gMi4wO1xuICAgICAgbXkxID0gKHkxICsgeTIpIC8gMi4wO1xuICAgICAgeGMgID0gKHgzICsgeDIpIC8gMi4wO1xuICAgICAgeWMgID0gbTEgKiAoeGMgLSBteDEpICsgbXkxO1xuICAgIH1cblxuICAgIGVsc2Uge1xuICAgICAgbTEgID0gLSgoeDIgLSB4MSkgLyAoeTIgLSB5MSkpO1xuICAgICAgbTIgID0gLSgoeDMgLSB4MikgLyAoeTMgLSB5MikpO1xuICAgICAgbXgxID0gKHgxICsgeDIpIC8gMi4wO1xuICAgICAgbXgyID0gKHgyICsgeDMpIC8gMi4wO1xuICAgICAgbXkxID0gKHkxICsgeTIpIC8gMi4wO1xuICAgICAgbXkyID0gKHkyICsgeTMpIC8gMi4wO1xuICAgICAgeGMgID0gKG0xICogbXgxIC0gbTIgKiBteDIgKyBteTIgLSBteTEpIC8gKG0xIC0gbTIpO1xuICAgICAgeWMgID0gKGZhYnN5MXkyID4gZmFic3kyeTMpID9cbiAgICAgICAgbTEgKiAoeGMgLSBteDEpICsgbXkxIDpcbiAgICAgICAgbTIgKiAoeGMgLSBteDIpICsgbXkyO1xuICAgIH1cblxuICAgIGR4ID0geDIgLSB4YztcbiAgICBkeSA9IHkyIC0geWM7XG4gICAgcmV0dXJuIHtpOiBpLCBqOiBqLCBrOiBrLCB4OiB4YywgeTogeWMsIHI6IGR4ICogZHggKyBkeSAqIGR5fTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlZHVwKGVkZ2VzKSB7XG4gICAgdmFyIGksIGosIGEsIGIsIG0sIG47XG5cbiAgICBmb3IoaiA9IGVkZ2VzLmxlbmd0aDsgajsgKSB7XG4gICAgICBiID0gZWRnZXNbLS1qXTtcbiAgICAgIGEgPSBlZGdlc1stLWpdO1xuXG4gICAgICBmb3IoaSA9IGo7IGk7ICkge1xuICAgICAgICBuID0gZWRnZXNbLS1pXTtcbiAgICAgICAgbSA9IGVkZ2VzWy0taV07XG5cbiAgICAgICAgaWYoKGEgPT09IG0gJiYgYiA9PT0gbikgfHwgKGEgPT09IG4gJiYgYiA9PT0gbSkpIHtcbiAgICAgICAgICBlZGdlcy5zcGxpY2UoaiwgMik7XG4gICAgICAgICAgZWRnZXMuc3BsaWNlKGksIDIpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgRGVsYXVuYXkgPSB7XG4gICAgdHJpYW5ndWxhdGU6IGZ1bmN0aW9uKHZlcnRpY2VzLCBrZXkpIHtcbiAgICAgIHZhciBuID0gdmVydGljZXMubGVuZ3RoLFxuICAgICAgICAgIGksIGosIGluZGljZXMsIHN0LCBvcGVuLCBjbG9zZWQsIGVkZ2VzLCBkeCwgZHksIGEsIGIsIGM7XG5cbiAgICAgIC8qIEJhaWwgaWYgdGhlcmUgYXJlbid0IGVub3VnaCB2ZXJ0aWNlcyB0byBmb3JtIGFueSB0cmlhbmdsZXMuICovXG4gICAgICBpZihuIDwgMylcbiAgICAgICAgcmV0dXJuIFtdO1xuXG4gICAgICAvKiBTbGljZSBvdXQgdGhlIGFjdHVhbCB2ZXJ0aWNlcyBmcm9tIHRoZSBwYXNzZWQgb2JqZWN0cy4gKER1cGxpY2F0ZSB0aGVcbiAgICAgICAqIGFycmF5IGV2ZW4gaWYgd2UgZG9uJ3QsIHRob3VnaCwgc2luY2Ugd2UgbmVlZCB0byBtYWtlIGEgc3VwZXJ0cmlhbmdsZVxuICAgICAgICogbGF0ZXIgb24hKSAqL1xuICAgICAgdmVydGljZXMgPSB2ZXJ0aWNlcy5zbGljZSgwKTtcblxuICAgICAgaWYoa2V5KVxuICAgICAgICBmb3IoaSA9IG47IGktLTsgKVxuICAgICAgICAgIHZlcnRpY2VzW2ldID0gdmVydGljZXNbaV1ba2V5XTtcblxuICAgICAgLyogTWFrZSBhbiBhcnJheSBvZiBpbmRpY2VzIGludG8gdGhlIHZlcnRleCBhcnJheSwgc29ydGVkIGJ5IHRoZVxuICAgICAgICogdmVydGljZXMnIHgtcG9zaXRpb24uICovXG4gICAgICBpbmRpY2VzID0gbmV3IEFycmF5KG4pO1xuXG4gICAgICBmb3IoaSA9IG47IGktLTsgKVxuICAgICAgICBpbmRpY2VzW2ldID0gaTtcblxuICAgICAgaW5kaWNlcy5zb3J0KGZ1bmN0aW9uKGksIGopIHtcbiAgICAgICAgcmV0dXJuIHZlcnRpY2VzW2pdWzBdIC0gdmVydGljZXNbaV1bMF07XG4gICAgICB9KTtcblxuICAgICAgLyogTmV4dCwgZmluZCB0aGUgdmVydGljZXMgb2YgdGhlIHN1cGVydHJpYW5nbGUgKHdoaWNoIGNvbnRhaW5zIGFsbCBvdGhlclxuICAgICAgICogdHJpYW5nbGVzKSwgYW5kIGFwcGVuZCB0aGVtIG9udG8gdGhlIGVuZCBvZiBhIChjb3B5IG9mKSB0aGUgdmVydGV4XG4gICAgICAgKiBhcnJheS4gKi9cbiAgICAgIHN0ID0gc3VwZXJ0cmlhbmdsZSh2ZXJ0aWNlcyk7XG4gICAgICB2ZXJ0aWNlcy5wdXNoKHN0WzBdLCBzdFsxXSwgc3RbMl0pO1xuICAgICAgXG4gICAgICAvKiBJbml0aWFsaXplIHRoZSBvcGVuIGxpc3QgKGNvbnRhaW5pbmcgdGhlIHN1cGVydHJpYW5nbGUgYW5kIG5vdGhpbmdcbiAgICAgICAqIGVsc2UpIGFuZCB0aGUgY2xvc2VkIGxpc3QgKHdoaWNoIGlzIGVtcHR5IHNpbmNlIHdlIGhhdm4ndCBwcm9jZXNzZWRcbiAgICAgICAqIGFueSB0cmlhbmdsZXMgeWV0KS4gKi9cbiAgICAgIG9wZW4gICA9IFtjaXJjdW1jaXJjbGUodmVydGljZXMsIG4gKyAwLCBuICsgMSwgbiArIDIpXTtcbiAgICAgIGNsb3NlZCA9IFtdO1xuICAgICAgZWRnZXMgID0gW107XG5cbiAgICAgIC8qIEluY3JlbWVudGFsbHkgYWRkIGVhY2ggdmVydGV4IHRvIHRoZSBtZXNoLiAqL1xuICAgICAgZm9yKGkgPSBpbmRpY2VzLmxlbmd0aDsgaS0tOyBlZGdlcy5sZW5ndGggPSAwKSB7XG4gICAgICAgIGMgPSBpbmRpY2VzW2ldO1xuXG4gICAgICAgIC8qIEZvciBlYWNoIG9wZW4gdHJpYW5nbGUsIGNoZWNrIHRvIHNlZSBpZiB0aGUgY3VycmVudCBwb2ludCBpc1xuICAgICAgICAgKiBpbnNpZGUgaXQncyBjaXJjdW1jaXJjbGUuIElmIGl0IGlzLCByZW1vdmUgdGhlIHRyaWFuZ2xlIGFuZCBhZGRcbiAgICAgICAgICogaXQncyBlZGdlcyB0byBhbiBlZGdlIGxpc3QuICovXG4gICAgICAgIGZvcihqID0gb3Blbi5sZW5ndGg7IGotLTsgKSB7XG4gICAgICAgICAgLyogSWYgdGhpcyBwb2ludCBpcyB0byB0aGUgcmlnaHQgb2YgdGhpcyB0cmlhbmdsZSdzIGNpcmN1bWNpcmNsZSxcbiAgICAgICAgICAgKiB0aGVuIHRoaXMgdHJpYW5nbGUgc2hvdWxkIG5ldmVyIGdldCBjaGVja2VkIGFnYWluLiBSZW1vdmUgaXRcbiAgICAgICAgICAgKiBmcm9tIHRoZSBvcGVuIGxpc3QsIGFkZCBpdCB0byB0aGUgY2xvc2VkIGxpc3QsIGFuZCBza2lwLiAqL1xuICAgICAgICAgIGR4ID0gdmVydGljZXNbY11bMF0gLSBvcGVuW2pdLng7XG4gICAgICAgICAgaWYoZHggPiAwLjAgJiYgZHggKiBkeCA+IG9wZW5bal0ucikge1xuICAgICAgICAgICAgY2xvc2VkLnB1c2gob3BlbltqXSk7XG4gICAgICAgICAgICBvcGVuLnNwbGljZShqLCAxKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8qIElmIHdlJ3JlIG91dHNpZGUgdGhlIGNpcmN1bWNpcmNsZSwgc2tpcCB0aGlzIHRyaWFuZ2xlLiAqL1xuICAgICAgICAgIGR5ID0gdmVydGljZXNbY11bMV0gLSBvcGVuW2pdLnk7XG4gICAgICAgICAgaWYoZHggKiBkeCArIGR5ICogZHkgLSBvcGVuW2pdLnIgPiBFUFNJTE9OKVxuICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICAvKiBSZW1vdmUgdGhlIHRyaWFuZ2xlIGFuZCBhZGQgaXQncyBlZGdlcyB0byB0aGUgZWRnZSBsaXN0LiAqL1xuICAgICAgICAgIGVkZ2VzLnB1c2goXG4gICAgICAgICAgICBvcGVuW2pdLmksIG9wZW5bal0uaixcbiAgICAgICAgICAgIG9wZW5bal0uaiwgb3BlbltqXS5rLFxuICAgICAgICAgICAgb3BlbltqXS5rLCBvcGVuW2pdLmlcbiAgICAgICAgICApO1xuICAgICAgICAgIG9wZW4uc3BsaWNlKGosIDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyogUmVtb3ZlIGFueSBkb3VibGVkIGVkZ2VzLiAqL1xuICAgICAgICBkZWR1cChlZGdlcyk7XG5cbiAgICAgICAgLyogQWRkIGEgbmV3IHRyaWFuZ2xlIGZvciBlYWNoIGVkZ2UuICovXG4gICAgICAgIGZvcihqID0gZWRnZXMubGVuZ3RoOyBqOyApIHtcbiAgICAgICAgICBiID0gZWRnZXNbLS1qXTtcbiAgICAgICAgICBhID0gZWRnZXNbLS1qXTtcbiAgICAgICAgICBvcGVuLnB1c2goY2lyY3VtY2lyY2xlKHZlcnRpY2VzLCBhLCBiLCBjKSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLyogQ29weSBhbnkgcmVtYWluaW5nIG9wZW4gdHJpYW5nbGVzIHRvIHRoZSBjbG9zZWQgbGlzdCwgYW5kIHRoZW5cbiAgICAgICAqIHJlbW92ZSBhbnkgdHJpYW5nbGVzIHRoYXQgc2hhcmUgYSB2ZXJ0ZXggd2l0aCB0aGUgc3VwZXJ0cmlhbmdsZSxcbiAgICAgICAqIGJ1aWxkaW5nIGEgbGlzdCBvZiB0cmlwbGV0cyB0aGF0IHJlcHJlc2VudCB0cmlhbmdsZXMuICovXG4gICAgICBmb3IoaSA9IG9wZW4ubGVuZ3RoOyBpLS07IClcbiAgICAgICAgY2xvc2VkLnB1c2gob3BlbltpXSk7XG4gICAgICBvcGVuLmxlbmd0aCA9IDA7XG5cbiAgICAgIGZvcihpID0gY2xvc2VkLmxlbmd0aDsgaS0tOyApXG4gICAgICAgIGlmKGNsb3NlZFtpXS5pIDwgbiAmJiBjbG9zZWRbaV0uaiA8IG4gJiYgY2xvc2VkW2ldLmsgPCBuKVxuICAgICAgICAgIG9wZW4ucHVzaChjbG9zZWRbaV0uaSwgY2xvc2VkW2ldLmosIGNsb3NlZFtpXS5rKTtcblxuICAgICAgLyogWWF5LCB3ZSdyZSBkb25lISAqL1xuICAgICAgcmV0dXJuIG9wZW47XG4gICAgfSxcbiAgICBjb250YWluczogZnVuY3Rpb24odHJpLCBwKSB7XG4gICAgICAvKiBCb3VuZGluZyBib3ggdGVzdCBmaXJzdCwgZm9yIHF1aWNrIHJlamVjdGlvbnMuICovXG4gICAgICBpZigocFswXSA8IHRyaVswXVswXSAmJiBwWzBdIDwgdHJpWzFdWzBdICYmIHBbMF0gPCB0cmlbMl1bMF0pIHx8XG4gICAgICAgICAocFswXSA+IHRyaVswXVswXSAmJiBwWzBdID4gdHJpWzFdWzBdICYmIHBbMF0gPiB0cmlbMl1bMF0pIHx8XG4gICAgICAgICAocFsxXSA8IHRyaVswXVsxXSAmJiBwWzFdIDwgdHJpWzFdWzFdICYmIHBbMV0gPCB0cmlbMl1bMV0pIHx8XG4gICAgICAgICAocFsxXSA+IHRyaVswXVsxXSAmJiBwWzFdID4gdHJpWzFdWzFdICYmIHBbMV0gPiB0cmlbMl1bMV0pKVxuICAgICAgICByZXR1cm4gbnVsbDtcblxuICAgICAgdmFyIGEgPSB0cmlbMV1bMF0gLSB0cmlbMF1bMF0sXG4gICAgICAgICAgYiA9IHRyaVsyXVswXSAtIHRyaVswXVswXSxcbiAgICAgICAgICBjID0gdHJpWzFdWzFdIC0gdHJpWzBdWzFdLFxuICAgICAgICAgIGQgPSB0cmlbMl1bMV0gLSB0cmlbMF1bMV0sXG4gICAgICAgICAgaSA9IGEgKiBkIC0gYiAqIGM7XG5cbiAgICAgIC8qIERlZ2VuZXJhdGUgdHJpLiAqL1xuICAgICAgaWYoaSA9PT0gMC4wKVxuICAgICAgICByZXR1cm4gbnVsbDtcblxuICAgICAgdmFyIHUgPSAoZCAqIChwWzBdIC0gdHJpWzBdWzBdKSAtIGIgKiAocFsxXSAtIHRyaVswXVsxXSkpIC8gaSxcbiAgICAgICAgICB2ID0gKGEgKiAocFsxXSAtIHRyaVswXVsxXSkgLSBjICogKHBbMF0gLSB0cmlbMF1bMF0pKSAvIGk7XG5cbiAgICAgIC8qIElmIHdlJ3JlIG91dHNpZGUgdGhlIHRyaSwgZmFpbC4gKi9cbiAgICAgIGlmKHUgPCAwLjAgfHwgdiA8IDAuMCB8fCAodSArIHYpID4gMS4wKVxuICAgICAgICByZXR1cm4gbnVsbDtcblxuICAgICAgcmV0dXJuIFt1LCB2XTtcbiAgICB9XG4gIH07XG5cbiAgaWYodHlwZW9mIG1vZHVsZSAhPT0gXCJ1bmRlZmluZWRcIilcbiAgICBtb2R1bGUuZXhwb3J0cyA9IERlbGF1bmF5O1xufSkoKTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5jb25zdCBoZWxwZXIgPSByZXF1aXJlKFwiLi9oZWxwZXJcIik7XG5cbmNsYXNzIFBvaW50IHtcblx0Y29uc3RydWN0b3Iocm9vdCwgaW5kZXgpIHtcblx0XHR0aGlzLnJvb3QgPSByb290O1xuXHRcdHRoaXMuY3R4ID0gcm9vdC5jdHg7XG5cdFx0dGhpcy5zdHlsZSA9IHJvb3Quc3R5bGU7XG5cdFx0XG5cdFx0dGhpcy5pbmRleCA9IGluZGV4O1xuXG5cdFx0dGhpcy54ID0gcm9vdC52ZXJ0aWNlc1tpbmRleF1bMF0qcm9vdC56b29tO1xuXHRcdHRoaXMueSA9IHJvb3QudmVydGljZXNbaW5kZXhdWzFdKnJvb3Quem9vbTtcblx0XHR0aGlzLmlzU2VsZWN0ID0gcm9vdC52ZXJ0aWNlc1tpbmRleF1bMl07XG5cblx0XHR0aGlzLmNvbW1vbnMgPSBbXTtcblx0XHR0aGlzLnZhcmlhbnRzID0gW107XG5cdFx0dGhpcy5kdENvbW1vbnMgPSBbXTtcblxuXHRcdHRoaXMuaXNTdGFydCA9IGZhbHNlO1xuXHR9XG5cdG5ld0xpbmVBbmltYXRpb24oKSB7XG5cdFx0aWYoIXRoaXMuY29tbW9ucy5sZW5ndGgpIHJldHVybjtcblxuXHRcdHZhciBpID0gaGVscGVyLnJhbmRSYW5nZSgwLCB0aGlzLmNvbW1vbnMubGVuZ3RoLTEpO1xuXHRcdHRoaXMuZHRDb21tb25zLnB1c2goW3t4OiB0aGlzLngsIHk6IHRoaXMueX0sIHRoaXMuY29tbW9uc1tpXV0pO1xuXHRcdHRoaXMuY29tbW9ucy5zcGxpY2UoaSwgMSk7XG5cdH1cblxuXHRzdGFydCgpIHtcblx0XHR0aGlzLmlzU3RhcnQgPSB0cnVlO1xuXHR9XG5cblx0dXBkYXRlKCkge1xuXHRcdGlmKHRoaXMuaXNTdGFydCkge1xuXHRcdFx0aWYoaGVscGVyLnJhbmRSYW5nZSgwLCB0aGlzLnJvb3QucHJvYmFiaWxpdHlDcmVhdGVBbmltYXRpb24pID09PSAwKSB0aGlzLm5ld0xpbmVBbmltYXRpb24oKTtcblx0XHRcdHRoaXMuYW5pbWF0aW9uKCk7XG5cdFx0fVxuXHR9XG5cdGFuaW1hdGlvbigpIHtcblx0XHRmb3IobGV0IGkgPSAwOyBpIDwgdGhpcy5kdENvbW1vbnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdGlmKHRoaXMuZHRDb21tb25zW2ldWzJdKSBjb250aW51ZTtcblxuXHRcdFx0dmFyIGR0ID0gdGhpcy5kdENvbW1vbnNbaV07XG5cdFx0XHR2YXIgc3BlZWQgPSBNYXRoLm1pbih0aGlzLnJvb3QuYW5pbWF0aW9uU3BlZWQsIDAuOCk7XG5cdFx0XHRkdFswXS54ID0gaGVscGVyLmxlcnAoZHRbMF0ueCwgZHRbMV0ueCwgc3BlZWQpO1xuXHRcdFx0ZHRbMF0ueSA9IGhlbHBlci5sZXJwKGR0WzBdLnksIGR0WzFdLnksIHNwZWVkKTtcblxuXG5cdFx0XHRpZihoZWxwZXIuY29tcGFyZShkdFswXS54LCBkdFsxXS54LCAxKSAmJiBoZWxwZXIuY29tcGFyZShkdFswXS55LCBkdFsxXS55LCAxKSkge1xuXHRcdFx0XHR0aGlzLmR0Q29tbW9uc1tpXVsyXSA9IHRydWU7XG5cdFx0XHRcdGR0WzFdLnN0YXJ0KCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0ZHJhdygpIHtcblx0XHRpZighdGhpcy5pc1N0YXJ0KSByZXR1cm47XG5cblx0XHRmb3IobGV0IGkgPSAwOyBpIDwgdGhpcy5kdENvbW1vbnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHRoaXMuY3R4LnN0cm9rZVN0eWxlID0gdGhpcy5pc1NlbGVjdCAmJiB0aGlzLmR0Q29tbW9uc1tpXVsxXS5pc1NlbGVjdCA/IHRoaXMuc3R5bGUuY29sb3JBY3RpdmVMaW5lIDogdGhpcy5zdHlsZS5jb2xvckxpbmU7XG5cdFx0XHR0aGlzLmN0eC5saW5lV2lkdGggPSB0aGlzLnN0eWxlLmxpbmVXaWR0aDtcblxuXHRcdFx0dGhpcy5jdHguYmVnaW5QYXRoKCk7XG5cdFx0XHR0aGlzLmN0eC5tb3ZlVG8odGhpcy54LCB0aGlzLnkpO1xuXHRcdFx0dGhpcy5jdHgubGluZVRvKHRoaXMuZHRDb21tb25zW2ldWzBdLngsIHRoaXMuZHRDb21tb25zW2ldWzBdLnksIDAsIDAsIDIqTWF0aC5QSSk7XHRcdFxuXHRcdFx0dGhpcy5jdHguc3Ryb2tlKCk7XG5cdFx0fVxuXHRcdFxuXG5cdFx0aWYodGhpcy5zdHlsZS5pc1JlbmRlclBvaW50KSB7XG5cdFx0XHR0aGlzLmN0eC5maWxsU3R5bGUgPSB0aGlzLnN0eWxlLmNvbG9yUG9pbnQ7XG5cdFx0XHR0aGlzLmN0eC5hcmModGhpcy54LCB0aGlzLnksIHRoaXMuc3R5bGUucmFkaXVzUG9pbnQgfHwgMi41LCAwLCAyKk1hdGguUEkpO1xuXHRcdFx0dGhpcy5jdHguZmlsbCgpO1xuXHRcdH1cblx0fVxuXG5cdHJlc2l6ZSgpIHtcdFxuXHRcdHRoaXMueCA9IHRoaXMucm9vdC52ZXJ0aWNlc1t0aGlzLmluZGV4XVswXSp0aGlzLnJvb3Quem9vbTtcblx0XHR0aGlzLnkgPSB0aGlzLnJvb3QudmVydGljZXNbdGhpcy5pbmRleF1bMV0qdGhpcy5yb290Lnpvb207XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQb2ludDsiLCJcInVzZSBzdHJpY3RcIjtcblxuY29uc3QgZGVsYXVuYXkgPSByZXF1aXJlKFwiZGVsYXVuYXktZmFzdFwiKTtcbmNvbnN0IFBvaW50ID0gcmVxdWlyZShcIi4vUG9pbnRcIik7XG5jb25zdCBoZWxwZXIgPSByZXF1aXJlKFwiLi9oZWxwZXJcIik7XG5cbmNsYXNzIFBvbHlSdW4ge1xuXHRjb25zdHJ1Y3Rvcihjb25maWcgPSB7fSkge1xuXHRcdHRoaXMucm9vdCA9IGNvbmZpZy5yb290O1xuXHRcdHRoaXMudmlldyA9IGNvbmZpZy52aWV3O1xuXHRcdHRoaXMuY3R4ID0gdGhpcy52aWV3LmdldENvbnRleHQoJzJkJyk7XG5cblx0XHR0aGlzLncgPSB0aGlzLnJvb3Qud2lkdGgoKTtcblx0XHR0aGlzLmggPSB0aGlzLnJvb3QuaGVpZ2h0KCk7XG5cblx0XHR0aGlzLnZpZXcud2lkdGggPSB0aGlzLnc7XG5cdFx0dGhpcy52aWV3LmhlaWdodCA9IHRoaXMuaDtcblx0XHR0aGlzLnJvb3RTY2FsZSA9IGNvbmZpZy5yb290U2NhbGUgfHwgdGhpcy53O1xuXHRcdHRoaXMuem9vbSA9IHRoaXMudy90aGlzLnJvb3RTY2FsZTtcblxuXHRcdHRoaXMuY2VsbCA9IGNvbmZpZy5jZWxsIHx8IDEwMDtcblxuXHRcdGlmKGNvbmZpZy52ZXJ0aWNlcylcblx0XHRcdHRoaXMudmVydGljZXMgPSBjb25maWcudmVydGljZXM7XG5cdFx0ZWxzZSB0aGlzLl9nZW5lcmF0ZVZlcnRpY2VzKCk7XG5cblxuXHRcdHRoaXMuYW5pbWF0aW9uU3BlZWQgPSBjb25maWcuYW5pbWF0aW9uU3BlZWQgfHwgMC4xO1xuXHRcdHRoaXMucHJvYmFiaWxpdHlDcmVhdGVBbmltYXRpb24gPSBjb25maWcucHJvYmFiaWxpdHlDcmVhdGVBbmltYXRpb24gfHwgMTA7XG5cdFx0dGhpcy5zdGFydFBvaW50ID0gY29uZmlnLnN0YXJ0UG9pbnQ7XG5cblx0XHR0aGlzLnN0eWxlID0gY29uZmlnLnN0eWxlIHx8IHt9O1xuXG5cdFx0dGhpcy5wb2ludHMgPSBbXTtcblx0XHR0aGlzLnRyaWFuZ2xlcyA9IFtdO1xuXG5cdFx0dGhpcy5BQ0NFTEVSQVRJT05fQU5JTUFUSU9OID0gMC4wMDE7XG5cblx0XHR0aGlzLl9jcmVhdGUoKTtcblx0XHR0aGlzLnBvaW50c1t0aGlzLnN0YXJ0UG9pbnRdLnN0YXJ0KCk7XG5cdH1cblx0X2dlbmVyYXRlVmVydGljZXMoKSB7XG5cdFx0dGhpcy52ZXJ0aWNlcyA9IFtdO1xuXG5cdFx0Zm9yKGxldCB5ID0gLTE7IHkgPCBNYXRoLnJvdW5kKHRoaXMuaC90aGlzLmNlbGwpKzE7IHkrKykge1xuXHRcdFx0Zm9yKGxldCB4ID0gLTE7IHggPCBNYXRoLnJvdW5kKHRoaXMudy90aGlzLmNlbGwpKzE7IHgrKykge1xuXHRcdFx0XHRsZXQgcG9zWSA9IGhlbHBlci5yYW5kUmFuZ2UoeSp0aGlzLmNlbGwrdGhpcy5jZWxsLzYsICh5KzEpKnRoaXMuY2VsbC10aGlzLmNlbGwvNik7XG5cdFx0XHRcdGxldCBwb3NYID0gaGVscGVyLnJhbmRSYW5nZSh4KnRoaXMuY2VsbCt0aGlzLmNlbGwvNiwgKHgrMSkqdGhpcy5jZWxsLXRoaXMuY2VsbC82KTtcblxuXHRcdFx0XHR0aGlzLnZlcnRpY2VzLnB1c2goW3Bvc1gsIHBvc1ldKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0X2NyZWF0ZVBvaW50cygpIHtcblx0XHR2YXIgaXRlcmF0aW9uc0NvbnRyb2wgPSAwO1xuXHRcdGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLnRyaWFuZ2xlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHBvaW50cztcblx0XHRcdHZhciBpbmQgPSB0aGlzLnRyaWFuZ2xlc1tpXTtcblxuXHRcdFx0aXRlcmF0aW9uc0NvbnRyb2wrKztcblx0XHRcdGlmKCF0aGlzLnBvaW50c1tpbmRdKSB0aGlzLnBvaW50c1tpbmRdID0gbmV3IFBvaW50KHRoaXMsIGluZCk7XG5cblx0XHRcdHN3aXRjaChpdGVyYXRpb25zQ29udHJvbCkge1xuXHRcdFx0XHRjYXNlIDE6XG5cdFx0XHRcdFx0cG9pbnRzID0gW3RoaXMudHJpYW5nbGVzW2krMV0sIHRoaXMudHJpYW5nbGVzW2krMl1dO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIDI6XG5cdFx0XHRcdFx0cG9pbnRzID0gW3RoaXMudHJpYW5nbGVzW2ktMV0sIHRoaXMudHJpYW5nbGVzW2krMV1dO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIDM6XG5cdFx0XHRcdFx0cG9pbnRzID0gW3RoaXMudHJpYW5nbGVzW2ktMV0sIHRoaXMudHJpYW5nbGVzW2ktMl1dO1xuXHRcdFx0XHRcdGl0ZXJhdGlvbnNDb250cm9sID0gMDtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdH1cblxuXHRcdFx0ZWFjaFBvaW50czogZm9yKGxldCBwID0gMDsgcCA8IHBvaW50cy5sZW5ndGg7IHArKykge1xuXHRcdFx0XHRmb3IobGV0IGogPSAwOyBqIDwgdGhpcy5wb2ludHNbaW5kXS5jb21tb25zLmxlbmd0aDsgaisrKSB7XG5cdFx0XHRcdFx0aWYodGhpcy5wb2ludHNbaW5kXS5jb21tb25zW2pdID09IHBvaW50c1twXSkgY29udGludWUgZWFjaFBvaW50cztcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLnBvaW50c1tpbmRdLmNvbW1vbnMucHVzaChwb2ludHNbcF0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHRfY3JlYXRlUG9pbnRMaW5rcygpIHtcblx0XHRmb3IobGV0IGkgPSAwOyBpIDwgdGhpcy5wb2ludHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdGZvcihsZXQgcCA9IDA7IHAgPCB0aGlzLnBvaW50c1tpXS5jb21tb25zLmxlbmd0aDsgcCsrKSB7XG5cdFx0XHRcdHRoaXMucG9pbnRzW2ldLmNvbW1vbnNbcF0gPSB0aGlzLnBvaW50c1t0aGlzLnBvaW50c1tpXS5jb21tb25zW3BdXTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRfY3JlYXRlKCkge1xuXHRcdHRoaXMudHJpYW5nbGVzID0gZGVsYXVuYXkudHJpYW5ndWxhdGUodGhpcy52ZXJ0aWNlcyk7XG5cdFx0dGhpcy5fY3JlYXRlUG9pbnRzKCk7XG5cdFx0dGhpcy5fY3JlYXRlUG9pbnRMaW5rcygpO1xuXHR9XG5cdHN0YXJ0KCkge1xuXHRcdHRoaXMubG9vcCgpO1xuXHR9XG5cblx0bG9vcCh0aW1lKSB7XG5cdFx0dGhpcy51cGRhdGUodGltZSk7XG5cdFx0dGhpcy5kcmF3KHRpbWUpO1xuXG5cdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHRoaXMubG9vcCgpKTtcblx0fVxuXG5cdHVwZGF0ZSh0aW1lKSB7XG5cdFx0aWYodGhpcy5hbmltYXRpb25TcGVlZCA8IDAuNSkgdGhpcy5hbmltYXRpb25TcGVlZCArPSB0aGlzLkFDQ0VMRVJBVElPTl9BTklNQVRJT047XG5cblx0XHRmb3IobGV0IGkgPSB0aGlzLnBvaW50cy5sZW5ndGg7IGk7KSB7XG5cdFx0XHQtLWk7IHRoaXMucG9pbnRzW2ldLnVwZGF0ZSh0aW1lKTtcblx0XHR9XG5cdH1cdFxuXHRkcmF3KHRpbWUpIHtcblx0XHR0aGlzLmN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy53LCB0aGlzLmgpO1xuXG5cdFx0Zm9yKGxldCBpID0gdGhpcy5wb2ludHMubGVuZ3RoOyBpOykge1xuXHRcdFx0LS1pOyB0aGlzLnBvaW50c1tpXS5kcmF3KHRpbWUpO1xuXHRcdH1cblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0dGhpcy53ID0gdGhpcy5yb290LndpZHRoKCk7XG5cdFx0dGhpcy5oID0gdGhpcy5yb290LmhlaWdodCgpO1xuXHRcdHRoaXMudmlldy53aWR0aCA9IHRoaXMudztcblx0XHR0aGlzLnZpZXcuaGVpZ2h0ID0gdGhpcy5oO1xuXHRcdHRoaXMuem9vbSA9IHRoaXMudy90aGlzLnJvb3RTY2FsZTtcblxuXHRcdGZvcihsZXQgaSA9IHRoaXMucG9pbnRzLmxlbmd0aDsgaTspIHtcblx0XHRcdC0taTsgdGhpcy5wb2ludHNbaV0ucmVzaXplKCk7XG5cdFx0fVxuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUG9seVJ1bjsiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG5cInVzZSBzdHJpY3RcIjtcblxuY29uc3QgUG9seVJ1biA9IHJlcXVpcmUoJy4vUG9seVJ1bicpO1xuXG52YXIgX2dsb2JhbCA9IChnbG9iYWwgfHwgd2luZG93KSB8fCB7fTtcblxuaWYobW9kdWxlKSBtb2R1bGUuZXhwb3J0cyA9IFBvbHlSdW47XG5lbHNlIF9nbG9iYWxbJ1BvbHlSdW4nXSA9IFBvbHlSdW47XG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgaGVscGVyID0ge1xuXHR0b1JhZGlhbnMoZGVnKSB7XG5cdFx0cmV0dXJuIGRlZyAqIE1hdGguUEkvMTgwO1xuXHR9LFxuXHR0b0RlZ3JlZShyYWQpIHtcblx0XHRyZXR1cm4gcmFkIC8gTWF0aC5QSSAqIDE4MDtcblx0fSxcblxuXHRyYW5kUmFuZ2UobWluLCBtYXgsIGlzUm91bmQgPSB0cnVlKSB7XG5cdFx0dmFyIHJhbmQgPSBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpICsgbWluO1xuXG5cdFx0aWYoaXNSb3VuZCkgcmV0dXJuIE1hdGguZmxvb3IocmFuZCk7XG5cdFx0ZWxzZSByZXR1cm4gcmFuZDtcblx0fSxcblx0Y29tcGFyZShhLCBiLCBlcnIpIHtcblx0XHRyZXR1cm4gZXJyID8gYSA+IGItZXJyICYmIGEgPCBiK2VyciA6IGEgPT0gYjtcblx0fSxcblxuXHRsZXJwKHYwLCB2MSwgdCkge1xuXHRcdHJldHVybiAoMS10KSp2MCArIHQqdjE7XG5cdH0sXG5cblx0aXNGaW5kVmFsdWVJbkFycmF5KGFyciwgdmFsKSB7XG5cdFx0Zm9yKGxldCBpID0gYXJyLmxlbmdodDsgaTsgKSB7XG5cdFx0XHQrK2k7IGlmKGFycltpXSA9PSB2YWwpIHJldHVybiB0cnVlO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBoZWxwZXI7Il19
