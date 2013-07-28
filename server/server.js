// Global members
var serverPort = 54321;
var isJobManager = false;

for (argIndex in process.argv) {
	var arg = process.argv[argIndex];
	if (arg.indexOf("--port=") == 0) serverPort=Number(arg.substring("--port=".length));
	if (arg.indexOf("--jobmanager") == 0) isJobManager = true;
}
console.log(process.argv);

// Priority imports
var countersLib = require("./counter.js");
countersLib.setCrayonId(serverPort);

// Imports
var sys = require("sys");
var http = require("http");  
var path = require("path");
var fs = require("fs");
var mongo = require('./mongo-util.js');
var logger = require("./logger.js");
var contextLib = require("./callContext.js");
var measurements = require("./measurements.js");
var dashboards = require("./dashboards.js");
var thresholds = require("./thresholds.js");
var configLib = require("./configuration.js");
var pluginManager = new (require("./pluginManager.js").PluginManager)(logger,contextLib,mongo);
var JobManager = require("./jobManager.js").JobManager;
var mail = require("./crayonMail.js");
var rabbitmq = require("./rabbitmq-util.js");

// Pass global instances to sub modules
contextLib.setLogger(logger);
mongo.setLogger(logger);
configLib.setLogger(logger);
measurements.setLogger(logger);
measurements.setContextLib(contextLib);
measurements.setMongo(mongo);
dashboards.setLogger(logger);
dashboards.setContextLib(contextLib);
dashboards.setMongo(mongo);
thresholds.setLogger(logger);
thresholds.setContextLib(contextLib);
thresholds.setMongo(mongo);

// Init sub modules
pluginManager.loadPlugins();

// ===================================
// =========== Startup ===============
// ===================================

mail.connect(function(err) {
	if (err) return;

	mongo.connect(function (err) {
		if (err) return;

		// Start server
		logger.info("Creating server on " + serverPort.toString().colorMagenta() + "...");
		var httpServer = http.createServer(function(request,response){  
			
			//logger.info("Got request: [" + (request.method||"NoMethod") + "] " + request.url.colorBlue());
			var callContext = new contextLib.CallContext(request, response);

			callContext.parseArgs(function(err) {
				if (err) {
					callContext.respondText(400, "Error parsing arguments of post request: " + err)
					logger.error("Error parsing arguments of post request: " + err);
					return;
				}

				if (callContext.uri == "/addAggregate") {
					return measurements.addAggregate(callContext);
				} else if (callContext.uri == "/addRaw") {
					return measurements.addRaw(callContext);
				} else if (callContext.uri == "/find") {
					return measurements.find(callContext);
				} else if (callContext.uri == "/dashboards") {
					return pluginManager.getDashboards(callContext);
				} else if (callContext.uri == "/matchSeriesName") {
					return measurements.matchSeriesName(callContext);
				} else if (callContext.uri == "/getPort") {
					return callContext.respondText(200, serverPort.toString());
				} else if (callContext.uri == "/echo") {
					return callContext.respondJson(200, callContext.args||{});
				} else if (callContext.uri == "/getConfig") {
					return callContext.respondJson(200,configLib.getConfig());
				} else if (callContext.uri == "/setConfig") {
					configLib.setConfig(callContext.body);
					return callContext.respondText(200,"OK");
				} else if (callContext.uri == "/saveDashboard") {
					return dashboards.saveDashboard(callContext);
				} else if (callContext.uri == "/deleteDashboard") {
					return dashboards.deleteDashboard(callContext);
				} else if (callContext.uri == "/saveThresholds") {
					return thresholds.saveThresholds(callContext);
				} else if (callContext.uri.indexOf("plugins/") > 0 && pluginManager.tryRun(callContext)) {
					return;
				}
				
				callContext.getRequestedFile();
			});
		});
		httpServer.listen(serverPort);	
		logger.info("Server started");

		if (isJobManager) {
			var jobManager = new JobManager(logger,mongo);
		} else {
			rabbitmq.connect();
		}
	});
});