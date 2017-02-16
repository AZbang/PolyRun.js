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