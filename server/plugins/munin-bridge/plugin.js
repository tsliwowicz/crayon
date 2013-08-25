var fs = require("fs");

var muninConfig = [];
var muninServers = [];
var muninConfigByServer = {};
var pm = null; // pluginManager

module.exports.load = function(pluginManager) {
	pm = pluginManager;
	pm.registerDashboard("Munin Dashboard", __dirname + "/munin-dashboard.html");
	//pm.registerDashboard("Munin Mini Dashboard", __dirname + "/munin-dashboard.html?&mini=1");
	updateMuninConfig(pluginManager);
};

module.exports.getMuninConfig = function(callContext) {
	if (callContext.args.server && 
		muninConfigByServer[callContext.args.server] == null) {
		callContext.respondJson(200, []);
		pm.logger.warn("Returning empty config for server " + callContext.args.server.colorMagenta());
		return;
	}

	if (callContext.args.server) {
		callContext.respondJson(200, muninConfigByServer[callContext.args.server]);
		pm.logger.info("Returning " + muninConfigByServer[callContext.args.server].length.toString().colorMagenta() + " graphs for server " + callContext.args.server.colorMagenta());
	} else {
		callContext.respondJson(200, muninConfig);
	}
};

module.exports.getMuninServers = function(callContext) {
	callContext.respondJson(200, muninServers);
};

var updateMuninConfig = function() {
	pm.logger.info("Reading munin config dir...");
	var newMuninConfig = [];
	fs.readdir(__dirname + "/munin-configs", function(err, files) {
		if (err) {
			pm.logger.error("Failed reading munin config files: " + err);
			return;
		}
		
		pm.logger.info("Plugin is reading from " + (__dirname + "/munin-configs/").colorBlue() + " files with the format <hostname>.json");
		newMuninServers = [];
		newMuninConfigByServer = {};

		var filesRemaining = files.length;
		var readFile = function(file) {
			fs.readFile(__dirname + "/munin-configs/" + file, "utf-8", function(err, data) {
				var readFileCompleted = function() {
					if (--filesRemaining === 0) {
						pm.logger.info("Done reading files");
						muninConfig = newMuninConfig;
						muninConfigByServer = newMuninConfigByServer;
						muninServers = newMuninServers;

					}
				};
				
				if (err) {
					pm.logger.error("Failed reading munin config file: " + err);  
					readFileCompleted();
					return;
				}
				
				if (!data || data.trim() == "") {
					pm.logger.warn("Skipped empty config file: " + file);  
					readFileCompleted();
					return;
				}
				
				try {
					var serverMuninConfig = JSON.parse(data);
					var serverName = file.substring(0,file.indexOf("."));
					pm.logger.info("Loaded graph file " + file.colorBlue() + " with " + serverMuninConfig.length.toString().colorMagenta() + " graphs (server='" + serverName.colorBlue() + "')");
					newMuninConfigByServer[serverName] = serverMuninConfig;
					newMuninServers.push(serverName);
					newMuninConfig = newMuninConfig.concat(serverMuninConfig);

					readFileCompleted();
				}
				catch (ex) {
					pm.logger.error("Failed parsing json for munin config file: " + file + " error: " + ex);  
					readFileCompleted();
					return;
				}
				
			});
		};
		for (var i in files) {
			readFile(files[i]);
		}
	});
};

module.exports.updateMuninConfig = updateMuninConfig;