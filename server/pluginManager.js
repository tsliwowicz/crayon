var glob = require("glob");

function PluginManager(logger, contextLib) {
	var me=this;
	
	me.plugins = {};
	me.logger = logger;
	me.contextLib = contextLib;
	me.registeredDashboards = [];
	me.registeredDashboardsLastModified = new Date();
}

PluginManager.prototype.loadPlugin = function(file) {
	var me=this;

	try {
		var pluginName = file.split('/')[1];
		me.logger.info("Loaindg plugin " + pluginName.colorBlue());
		me.plugins[pluginName] = require("./" + file);
		me.plugins[pluginName].load(me);
	} catch (ex) {
		me.logger.error("Failed loading plugin " + pluginName + "\n" + ex.stack);
	}
};	

PluginManager.prototype.loadPlugins = function() {
	var me=this;

	// Read plugins
	glob("plugins/*/plugin.js", function(err, files) {
		if (err) {
			me.logger.error("Failed globbing plugins: " + err);
			return;
		}

		for (var i in files) {
			me.loadPlugin(files[i]);
		}
	});
};

PluginManager.prototype.registerDashboard = function(name, uri) {
	var me=this;

	if (!name) throw new Error("Dashboard is missing property 'name'");
	if (!uri) throw new Error("Dashboard is missing property 'uri'");
	var relativeUri = uri.replace(__dirname,"");
	me.registeredDashboards.push({name: name, uri: relativeUri});
	me.registeredDashboardsLastModified = new Date();
};

PluginManager.prototype.tryRun = function(callContext) {
	var me=this;
	var parts = callContext.uri.split('/');

	if (parts.length < 4) return false;
	if (parts[1] != "plugins") return false;

	var plugin = me.plugins[parts[2]];
	var action = parts[3];

	if (!plugin) return false;
	if (!plugin[action] || (typeof plugin[action] != "function")) return false;

	plugin[action](callContext);
	return true;
};

PluginManager.prototype.getDashboards = function(callContext) {
	var me=this;
	var etag = me.registeredDashboardsLastModified.toLocaleString().replace(/[/ :]/g,"");

	var responseHeaders = {
		"Content-Type": "text/json", 
		"Last-Modified": me.registeredDashboardsLastModified,
		"ETag": etag};

	if (callContext.request.headers['if-none-match'] === etag) {
		callContext.respondText(304);
		//callContext.response.statusCode = 304;
		//callContext.response.end();
		return;
	} else {
		callContext.respondWithHeaders(200, responseHeaders, me.registeredDashboards);
	}
};

module.exports.PluginManager = PluginManager;