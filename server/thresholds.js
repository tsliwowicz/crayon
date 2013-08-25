var dates = require("./dates.js");
var prototypes = require("./prototypes.js");
var countersLib = require("./counter.js");
var fs = require('fs');
var staticDir = __dirname + '/../static';

// Set the global services for this module
var logger;
var contextLib;
module.exports.setLogger = function(l) { logger = l; };
module.exports.setContextLib = function(l) { contextLib = l; };

module.exports.saveThresholds = function(callContext) {
	var thresholdsText = callContext.body;

	fs.writeFile(staticDir + "/thresholds.conf", thresholdsText, function(err) {
	    if(err) {
	        callContext.respondJson(500, {error:"Failed saving thresholds.conf: " + err});
	        return;
	    } 

	    callContext.respondJson(200, {});
	}); 
};