var configLib = require("./configuration.js");
var dates = require("./dates.js");
var prototypes = require("./prototypes.js");
var ObjectID = require('mongodb').ObjectID;
var countersLib = require("./counter.js");
var mail = require("./crayonMail.js");
var fs = require('fs');
var staticDir = __dirname + '/../static'
var minutesDelayLagAssuranceForAggregation = 1;

function JobManager(logger, mongo) {
	var me=this;
	
	me.logger = logger;
	me.mongo = mongo;
	me.hourTimer = setInterval(function() { me.hourElapsed(); }, 1000*60*60);
	me.minuteTimer = setInterval(function() { me.minuteElapsed(); }, 1000*60);
	me.minuteElapsed();
	me.hourElapsed();

	//me.minuteTimer = setInterval(function() { me.checkThresholds(); }, 1000*5);
	//me.checkThresholds();
	if (!me.logger) throw new Error("Logger is undefined");
}

var previousAlerts = {};

JobManager.prototype.checkThresholds = function() {
	var me=this;

	try {

		var confText = fs.readFileSync(staticDir + "/thresholds.conf");
		var thresholds = JSON.parse(confText);
		for (var i = 0; i<thresholds.length; ++i) {

			// Skip disabled thresholds
			if (thresholds[i].enabled != null && thresholds[i].enabled == false) continue;

			// Check the threshold
			me.mongo.checkThreshold(thresholds[i], 's', function(threshold, matches) {
				var alertedThresholds = [];
				var alertedThresholdsNoVariables = [];
				for (i in matches) {
					var match = matches[i];
					var server = match._id 
					var val = match.v;

					var excludeMatch = false;
					for (excludeIndex in threshold.excludeServers) {
						var serverRegexToExclude = threshold.excludeServers[excludeIndex];
						if (server.match(serverRegexToExclude)) {
							excludeMatch = true;
							break;
						}
					}

					if (excludeMatch) continue;
					alertedThresholdsNoVariables.push({server: server, threshold: threshold.condition});
					alertedThresholds.push({server: server, value: val, threshold: threshold.condition});
				}

				if (alertedThresholds.length > 0) {

					var alertData = JSON.stringify(alertedThresholds);
					var alertDataNoVariables = JSON.stringify(alertedThresholdsNoVariables);

					// Skip thresholds in silense period if it's the same alert
					var previousAlert = previousAlerts[JSON.stringify(threshold)];

					if (previousAlert && 
						previousAlert.alertTime.addMinutes(threshold.minutesBetweenAlerts||10) > new Date() &&
						previousAlert.alertDataNoVariables == alertDataNoVariables) {
						me.logger.info("Skipping Threshold Alert due to silence period: " + (threshold.description||"missing threshold 'description' attribute") + "\n" + alertData);
						return;
					} else {
						previousAlerts[JSON.stringify(threshold)] = { alertTime: new Date(), alertData: alertData, alertDataNoVariables: alertDataNoVariables};
					}

					var desc = (threshold.description||"[no description] missing threshold 'description' attribute");
					me.logger.info("Threshold Alert: ".colorRed() + desc + "\n" + alertData);

					if (!threshold.noMail) {
						mail.send({
							text:    "Threshold definition:\n" +  JSON.stringify(threshold) + "\n\nAlert Data:\n" + alertData, 
							subject: "[Crayon] Threshold Passed: " + desc,
							mailTo: threshold.mailTo
						});
					}
				}
			});
		}
	} catch (ex) {
		me.logger.error("Failed checking thresholds: " + ex.stack);
	}
}

JobManager.prototype.minuteElapsed = function() {
	var me=this;

	var config = configLib.getConfig();
	if (config.hoursToRetainSamples) me.archive(config.hoursToRetainSamples);

	// Aggregation
	// Note: this could be spread accross multiple timers, but because this seems to operate very fast, I'll keep it here
	// Also note that we add a lag of minutes because we're using write concern 0 and we want to be sure everything flushed
	me.aggregateSecondsToMinutes(function() { 
		setTimeout(function() {
			me.aggregateMinutesToHours(function() {
				setTimeout(function() { me.aggregateHoursToDays(function() {}); }, 10000 );
			});
		}, 10000)
	});

	me.checkThresholds();
}

JobManager.prototype.hourElapsed = function() {
	var me=this;

	me.logger.info("[JobManager] Hour elapsed");

	try {
		var config = configLib.getConfig();

		// Archive
		if (config.hoursToRetainSamples) me.archive(config.hoursToRetainSamples);

	} catch (ex) {
		me.logger.error("Failed performing hour elapsed tasks\n" + ex.stack);
	}
}	

JobManager.prototype.archive = function(retention) {
	var me=this;
	try {
		me.logger.info("[JobManager] JOB: Archiving");
		setTimeout(function() {if (retention.days) me.mongo.archive('d', new Date().addHours(-retention.days)); }, 100);
		setTimeout(function() {if (retention.hours) me.mongo.archive('h', new Date().addHours(-retention.hours)); }, 10000);
		setTimeout(function() {if (retention.minutes) me.mongo.archive('m', new Date().addHours(-retention.minutes)); }, 20000);
		setTimeout(function() {if (retention.seconds) me.mongo.archive('s', new Date().addHours(-retention.seconds)); }, 30000);
	} catch (ex) {
		me.logger.error("Archiving job failed with exception: " + ex.stack);
	}
}

JobManager.prototype.aggregateSecondsToMinutes = function(callback) {
	var me=this;
	try {
		me.logger.info("[JobManager] JOB: Aggregating seconds to minutes");
		var now = new Date().addMinutes(-minutesDelayLagAssuranceForAggregation);
		var fromStr = now.addMinutes(-1).toISOString().replace("T", " ").substring(0,16);
		var toStr = now.toISOString().replace("T", " ").substring(0,16);
		me.mongo.aggregate(fromStr, toStr, "s", "m",callback);
	} catch (ex) {
		me.logger.error("Aggregation job failed with exception: " + ex.stack);
	}
}

JobManager.prototype.aggregateMinutesToHours = function(callback) {
	var me=this;
	try {
		me.logger.info("[JobManager] JOB: Aggregating minutes to hours");
		var now = new Date().addMinutes(-minutesDelayLagAssuranceForAggregation);
		var fromStr = now.addHours(-1).toISOString().replace("T", " ").substring(0,13);
		var toStr = now.toISOString().replace("T", " ").substring(0,13);
		me.mongo.aggregate(fromStr, toStr, "m", "h",callback);
	} catch (ex) {
		me.logger.error("Aggregation job failed with exception: " + ex.stack);
	}
}

JobManager.prototype.aggregateHoursToDays = function(callback) {
	var me=this;
	try {
		me.logger.info("[JobManager] JOB: Aggregating hours to days");
		var now = new Date().addMinutes(-minutesDelayLagAssuranceForAggregation);
		var fromStr = now.addDays(-1).toISOString().replace("T", " ").substring(0,10);
		var toStr = now.toISOString().replace("T", " ").substring(0,10);
		me.mongo.aggregate(fromStr, toStr, "h", "d",callback);
	} catch (ex) {
		me.logger.error("Aggregation job failed with exception: " + ex.stack);
	}
}


module.exports.JobManager = JobManager;