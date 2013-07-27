var configLib = require("./configuration.js");
var minutesDelayLagAssuranceForAggregation = 1;

function JobManager(logger, mongo) {
	var me=this;
	
	me.logger = logger;
	me.mongo = mongo;
	me.hourTimer = setInterval(function() { me.hourElapsed(); }, 1000*60*60);
	me.minuteTimer = setInterval(function() { me.minuteElapsed(); }, 1000*60);
	me.minuteElapsed();
	me.hourElapsed();
	if (!me.logger) throw new Error("Logger is undefined");
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