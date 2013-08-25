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


module.exports.deleteDashboard = function(callContext) {
	var dashboardId = callContext.args["id"];
	var newPath = "/dashboards/" + dashboardId + ".json";

	var confText = fs.readFileSync(staticDir + "/dashboards.conf");
	var confLines = confText.toString().split('\n');
	var newConfLines = [];
	for (var i in confLines) {
		var confLine = confLines[i];
		if (confLine.indexOf("/dashboards/" + dashboardId + ".json") != -1) {
		} else {
			newConfLines.push(confLine);
		}
	}

	var newConfText = newConfLines.join("\n");
	fs.unlink(staticDir + newPath, function(err) {
    	if(err) {
	        callContext.respondJson(500,{error:"Failed removing dashboard from '" + newPath + "':" + err});
	        return;
	    } 

		fs.writeFile(staticDir + "/dashboards.conf", newConfText, function(err) {
		    if(err) {
		        callContext.respondJson(500, {error:"Failed saving dashboards.conf: " + err});
		        return;
		    } 

		    callContext.respondJson(200, {});
		}); 
	});
};

module.exports.saveDashboard = function(callContext) {
	var dashboardText = callContext.body;
	var dashboard = JSON.parse(dashboardText);
	var newPath = "/dashboards/" + dashboard.id + ".json";

	var confText = fs.readFileSync(staticDir + "/dashboards.conf");
	var confLines = confText.toString().split('\n');
	var newConfLines = [];
	var added = false;
	for (var i in confLines) {
		var confLine = confLines[i];
		if (confLine.indexOf("/dashboards/" + dashboard.id + ".json") != -1) {
			newConfLines.push(dashboard.sidebarText + " = " + newPath);
			added = true;
		} else {
			newConfLines.push(confLine);
		}
	}

	if (!added) {
		newConfLines.push(dashboard.sidebarText + " = " + newPath);
	}

	var newConfText = newConfLines.join("\n");
	fs.writeFile(staticDir + newPath, dashboardText, function(err) {
    	if(err) {
	        callContext.respondJson(500,{error:"Failed saving dashboard to '" + newPath + "':" + err});
	        return;
	    } 

		fs.writeFile(staticDir + "/dashboards.conf", newConfText, function(err) {
		    if(err) {
		        callContext.respondJson(500, {error:"Failed saving dashboards.conf: " + err});
		        return;
		    } 

		    callContext.respondJson(200, {});
		}); 
	});
};