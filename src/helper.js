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
