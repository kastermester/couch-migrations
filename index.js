'use strict';
var semver = require('semver');
if (semver.satisfies(process.versions.node, '>=1.0.0')) {
	module.exports = require('./lib/index.js');
} else {
	module.exports = require('./legacy-lib/index.js');
}
