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