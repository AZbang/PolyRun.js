"use strict";

const PolyRun = require('./PolyRun');

var _global = (global || window) || {};

if(module) module.exports = PolyRun;
else _global['PolyRun'] = PolyRun;