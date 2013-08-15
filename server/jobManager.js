var configLib = require("./configuration.js");
var dates = require("./dates.js");
var prototypes = require("./prototypes.js");
var countersLib = require("./counter.js");
var mail = require("./crayonMail.js");
var exec = require('child_process').exec;
var fs = require('fs');
var staticDir = __dirname + '/../static'
var minutesDelayLagAssuranceForAggregation = 1;

function JobManager(logger) {
	var me=this;
	
	me.logger = logger;
	me.hourTimer = setInterval(function() { me.hourElapsed(new Date()); }, 1000*60*60);
	me.minuteTimer = setInterval(function() { me.minuteElapsed(new Date()); }, 1000*60);
	me.halfMinuteTimer = setInterval(function() { me.halfMinuteElapsed(new Date()); }, 1000*30);
	me.halfMinuteElapsed(new Date());
	me.minuteElapsed(new Date());
	me.hourElapsed(new Date());

	//me.minuteTimer = setInterval(function() { me.checkThresholds(); }, 1000*5);
	//me.checkThresholds();
	if (!me.logger) throw new Error("Logger is undefined");
}

JobManager.prototype.halfMinuteElapsed = function(now) {
	var me=this;

	try {
		var msBefore = new Date().getTime();
				
		var config = configLib.getConfig();

		var hoursToKeepRawData = 1;
		if (config.hoursToRetainSamples && config.hoursToRetainSamples.raw) hoursToKeepRawData = config.hoursToRetainSamples.raw;
		var rawTime = new Date().addMinutes(-60 * hoursToKeepRawData).toISOString().substring(0,16);
		var rawFolder = "minutes_ram";
		var rawCounter = countersLib.getOrCreateCounter(countersLib.systemCounterDefaultInterval, "Raw Archive ms", "crayon")
		me.archive(msBefore, rawTime, rawFolder, rawCounter);

		var hoursToKeepMinutesData = 24;
		if (config.hoursToRetainSamples && config.hoursToRetainSamples.minutes) hoursToKeepMinutesData = config.hoursToRetainSamples.minutes;
		var mTime = new Date().addMinutes(-60 * hoursToKeepMinutesData).toISOString().substring(0,15);
		var mFolder = "minutes";
		var mCounter = countersLib.getOrCreateCounter(countersLib.systemCounterDefaultInterval, "Minutes Archive ms", "crayon")
		me.archive(msBefore, mTime, mFolder, mCounter);

		var hoursToKeepHoursData = 336;
		if (config.hoursToRetainSamples && config.hoursToRetainSamples.hours) hoursToKeepMinutesData = config.hoursToRetainSamples.hours;
		var hTime = new Date().addMinutes(-60 * hoursToKeepHoursData).toISOString().substring(0,13);
		var hFolder = "hours";
		var hCounter = countersLib.getOrCreateCounter(countersLib.systemCounterDefaultInterval, "Hours Archive ms", "crayon")
		me.archive(msBefore, hTime, hFolder, hCounter);

		var hoursToKeepDaysData = 365;
		if (config.hoursToRetainSamples && config.hoursToRetainSamples.days) hoursToKeepMinutesData = config.hoursToRetainSamples.days;
		var dTime = new Date().addMinutes(-60 * hoursToKeepDaysData).toISOString().substring(0,10);
		var dFolder = "days";
		var dCounter = countersLib.getOrCreateCounter(countersLib.systemCounterDefaultInterval, "Days Archive ms", "crayon")
		me.archive(msBefore, dTime, dFolder, dCounter);

	} catch (ex) {
		me.logger.error("Exception removing minute dir: " + ex.stack);
	}
}

JobManager.prototype.archive = function(msBefore, time, folder, counter) {
	if (!folder) return;

	var me=this;

	var cmd = "rm -rf $(ls "+folder+"/ | awk '{if ($1 < \"" + time + "\") print}' | sed 's|^|./"+ folder +"/|')";
	me.logger.info("Starting archive with command: " + cmd.colorBlue());
	exec(cmd, function(error, out, err) {  
		if (error) {
			me.logger.error("Failed archiving " + time + ": " + error);
		} else if (err) {
			me.logger.error("Error archiving " + time + ": " + error);
		}

		var msAfter = new Date().getTime();
		var duration = msAfter-msBefore;
		counter.addSample(duration);
	});
}

JobManager.prototype.minuteElapsed = function(now) {
	var me=this;

	if (now.getUTCMinutes() % 10 == 0) {
		try {
			var msBefore = new Date().getTime();
			me.logger.info("Started aggregating minutes");

			// Aggregate previous 10 minutes
			
			var inputForAggregation = "";
			for (i = -10; i < 0; ++i) {
				var timeAgo = now.addMinutes(i);
				inputForAggregation += " minutes_ram/" + timeAgo.toISOString().substring(0,16) + "/*/*";
			}

			exec("awk -v suffix="+ now.getUTCMinutes() +" -f aggregateMinutes.sh " + inputForAggregation, function(error, out, err) {  
				if (error) {
					me.logger.error("Failed aggregating minutes " + inputForAggregation + ": " + error);
				} else if (err) {
					me.logger.error("Error aggregating minutes " + inputForAggregation + ": " + error);
				} else {
					me.logger.debug(out);
				}

				var msAfter = new Date().getTime();
				var duration = msAfter-msBefore;
				me.logger.info("Finished aggregating minutes within " + (duration + "ms").colorMagenta());
				countersLib.getOrCreateCounter(countersLib.systemCounterDefaultInterval, "Raw Aggregation ms", "crayon").addSample(duration);
			});
		} catch (ex) {
			me.logger.error("Exception aggregating minutes: " + ex.stack);
		}
	}

	if (now.getUTCMinutes() == 15) {
		try {
			var msBefore = new Date().getTime();
			me.logger.info("Started aggregating hours");

			// Aggregate previous 10 minutes
			
			var inputForAggregation = "";
			for (i = -6; i < 0; ++i) {
				var timeAgo = now.addMinutes(-15).addMinutes(i*10);
				inputForAggregation += " minutes/" + timeAgo.toISOString().substring(0,15) + "/*/*";
			}

			exec("awk -v suffix="+ now.getUTCHours() +" -f aggregateHours.sh " + inputForAggregation, function(error, out, err) {  
				if (error) {
					me.logger.error("Failed aggregating hours " + inputForAggregation + ": " + error);
				} else if (err) {
					me.logger.error("Error aggregating hours " + inputForAggregation + ": " + error);
				} else {
					me.logger.debug(out);
				}

				var msAfter = new Date().getTime();
				var duration = msAfter-msBefore;
				me.logger.info("Finished aggregating hours within " + (duration + "ms").colorMagenta());
				countersLib.getOrCreateCounter(countersLib.systemCounterDefaultInterval, "Minutes Aggregation ms", "crayon").addSample(duration);
			});
		} catch (ex) {
			me.logger.error("Exception aggregating hours: " + ex.stack);
		}
	}

	if (now.getUTCMinutes() == 10 && now.getUTCHours() == 1) {
		try {
			var msBefore = new Date().getTime();
			me.logger.info("Started aggregating days");

			// Aggregate previous 10 minutes
			var inputForAggregation = "";
			var timeAgo = now.addHours(-24)
			inputForAggregation += " hours/" + timeAgo.toISOString().substring(0,10) + "T*";

			exec("awk -v suffix="+ now.getUTCHours() +" -f aggregateDays.sh " + inputForAggregation, function(error, out, err) {  
				if (error) {
					me.logger.error("Failed aggregating days " + inputForAggregation + ": " + error);
				} else if (err) {
					me.logger.error("Error aggregating days " + inputForAggregation + ": " + error);
				} else {
					me.logger.debug(out);
				}

				var msAfter = new Date().getTime();
				var duration = msAfter-msBefore;
				me.logger.info("Finished aggregating days within " + (duration + "ms").colorMagenta());
				countersLib.getOrCreateCounter(countersLib.systemCounterDefaultInterval, "Hours Aggregation ms", "crayon").addSample(duration);
			});
		} catch (ex) {
			me.logger.error("Exception aggregating days: " + ex.stack);
		}
	}
}

JobManager.prototype.hourElapsed = function(now) {
	var me=this;

	
}


/*
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

		// Aggregate
		setTimeout(function() {
			me.aggregateMinutesToHours(function() {
				setTimeout(function() { me.aggregateHoursToDays(function() {}); }, 10000 );
			});
		}, 10000)

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

*/

module.exports.JobManager = JobManager;