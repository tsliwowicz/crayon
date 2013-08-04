var MongoClient = require('mongodb').MongoClient;
var format = require('util').format;
var ObjectID = require('mongodb').ObjectID;
var countersLib = require("./counter.js");
var configLib = require("./configuration.js");
var dates = require("./dates.js");
var cityhash = require("cityhash");
var mongoServer=configLib.getConfig().mongoUrl;
var mongoDBName="crayon"
var mongoDB=null;
var logger;


// Counters to measure inserts, updates, and collisions when upserting samples
var insertCounter = countersLib.getOrCreateCounter(countersLib.systemCounterDefaultInterval, "Inserts", "crayon");
var updateCounter = countersLib.getOrCreateCounter(countersLib.systemCounterDefaultInterval, "Updates", "crayon");
var etagCollisionCounter = countersLib.getOrCreateCounter(countersLib.systemCounterDefaultInterval, "Etag Collisions", "crayon");

// Method group for setting variables
module.exports.setDB = function(name) { mongoDBName=name; }
module.exports.setLogger = function(l) { logger = l; };

// a list of all units and their collections
var unitCount = 0;
var namesCol;
var collectionByUnit = {
	//"s": { name: "samples_sec" },
	"s": { name: "capped_sec" },
	"m": { name: "samples_min" },
	"h": { name: "samples_hour" },
	"d": { name: "samples_day" }
}

// Validation function that a unit exists
module.exports.isValidUnit = function(unit) {
	return collectionByUnit[unit||"undefined"] != null;
}
module.exports.getUnitCollectionName = function(unit) {
	return collectionByUnit[unit].name;
}

// Connects to the mongo db database and keeps an instance of all collections
var connect = function(callback) {
	callback(null);
	return;
	
	logger.info("Connecting to mongo: " + mongoServer + mongoDBName);
	MongoClient.connect(mongoServer + mongoDBName,{db: {w: 0}} ,function(err, db) { 
		if (err) {
			logger.error(err); 
			callback(err);
		} else {
			mongoDB=db; 
			unitCount = 0;
			for (unit in collectionByUnit) {
				collectionByUnit[unit].col =db.collection(collectionByUnit[unit].name);
				unitCount++;
			}
			
			namesCol = db.collection("names");

			logger.info("Connected to Mongo DB");
			setInterval(bulkInsertPendingWithoutErrors, 1000);
			callback(null);
		}
	});
}

// Calculates a unique ID for the name. The unique ID relies on the name alone
// Since we need a key of 96 bits (3 * 32 bits) we will use cityhash 64 for better randomness on a small name
// we will use only 64b and not 96b because we prefer to be able to store it as two javascript numbers in the RAM
var usedHashedNames = {};
module.exports.addName = function(name) { 

	if (usedHashedNames[name]) return;
	usedHashedNames[name] = true;

	return;
	var hashObj = cityhash.hash64(name);

	var hex = (("0000000000000000" + hashObj.value).slice(-16)) + "00000000";
	var id = new ObjectID(hex);

	if (namesCol != null) {
		namesCol.insert({_id:id, n:name}, function(err) {
			// If the code is 11000, we got a duplicate exception this means it's just our cache which wasn't populated
			// This is going to happen everytime we start our service again (we should populate the names when we begin)
			if (err != null && err.code != 11000) {

				// It's a different error than a duplicate, we don't know what it is.
				logger.error("Failed inserting sample name to names collection: " + err);
			}
		});
	}
};


// Closes the connection to the database
module.exports.closeDB = function() { 
	mongoDB.close(); 
};

// Returns the first row that matches
var getMeasure = function(unit, query, callback) {
	if (unit == "counterName") {
		namesCol.findOne(query, callback);
	} else {
		collectionByUnit[unit].col.findOne(query, callback);
	}
}

// Matches all the series names from the names collection using a regex
module.exports.matchSeriesName = function(args, callback) {
	try {
		var cursor = namesCol.find({n: { "$regex": args.regex} }, {_id: 0, n: 1} , args.options).limit(args.limit || 100);
	
		// Perform the selection itself 
		cursor.toArray(callback);
	} catch (ex) {
		callback(ex, null);
	}
}

// Used by tests to clear all database between tests
var clearTestsDatabase = function(callback) {

	// VERY IMPORTANT CHECK, BE SURE WERE NOT DROPPING ALL METRICS
	if (mongoDBName == "crayon_tests") {

		// Iterate over all units and remove each collection entirely
		var unitsRemaining = unitCount + 1;
		var singleRemoveCallback = function() { 
			if (--unitsRemaining == 0) callback(); 
		}

		for (unit in collectionByUnit) {
			collectionByUnit[unit].col.remove({}, singleRemoveCallback);
		}

		namesCol.remove({}, singleRemoveCallback);
	}
}

// Removes old documents
module.exports.archive = function(unit, timeToArchiveUntil) {
	var colObj = collectionByUnit[unit];

	var msBefore = new Date().getTime();
	var secondString = dates.getSecondBulk(timeToArchiveUntil);
	logger.info("Archiving of collection " + colObj.name + " started (Anything older than '" + secondString.colorMagenta() +"')");
	colObj.col.remove({ "t": {"$lt": secondString}}, function(err) {
		var msAfter = new Date().getTime();
		countersLib.getOrCreateCounter(countersLib.systemCounterDefaultInterval, "Archive ms for " + colObj.name, "crayon").addSample(msAfter-msBefore);

		if (err) {
			logger.error("Archiving of collection " + colObj.name + " failed within " + ((msAfter-msBefore) + "ms") + "\n" + err);
		} else {
			logger.info("Archiving of collection " + colObj.name + " finished within " + ((msAfter-msBefore) + "ms").colorMagenta());
		}
	});
}

// This function is mainly for testing, we get the unit from a field of "row" in "rows"
var assertRowsExists = function(rows, callback) {

	var rowsMissing = 0;
	var rowsFound = 0;
	
	for (var i=0;i < rows.length; ++i) {
		
		// Make sure a specific row exists
		function assertRowExists(row) {
			var unit = row.unit;
			delete row.unit;

			// Selected the specific row
			getMeasure(unit, row, function(err, existingRow) {

				// There was an error selecting
				if (err != null) {
					console.error("Assertion failed. Received an error for row " + JSON.stringify(row) + " error: " + err);
					rowsMissing++;

				// The row was not found
				} else if (existingRow == null || existingRow == {}) {
					console.error("Assertion failed. No error, row returned as null: " + JSON.stringify(row));
					rowsMissing++;

				// The row was found
				} else {
					rowsFound++;
				}
				
				// Callback when all rows were checked
				if (rowsMissing + rowsFound == rows.length) {
					callback(rowsMissing == 0 ? null : (rowsMissing + " rows are missing"));
				}
			});
		}
		
		assertRowExists(rows[i]);
	}
}

// Exposes a complete API to query the mongo database through the args supplied by the client on each request
function find(args, callback) {
	try {

		// Log the query so we could try it ourselves
		logger.debug("Calling find with query: unit=" + args.unit + "&query=" + JSON.stringify(args.query||{}) + "&fields=" + JSON.stringify(args.fields||{}));

		// Build the cursor using all supplied arguments (limit is capped by 100 unless explicitly provided)
		var cursor = collectionByUnit[args.unit].col.find(args.query, args.fields, args.options).limit(args.limit || 100);
		if (args.skip) cursor = cursor.skip(args.skip);
		if (args.sort) cursor = cursor.sort(args.sort);

		// Perform the selection itself 
		cursor.toArray(callback);
	} catch (ex) {
		callback(ex, null);
	}
}


// An upsert recursion with "pessimistic concurrency" behavior. Loops until the row was written
// Each iteration begins with trying to insert the row, if we fail, we try to select the existing, combine and update
// If the insert fails we try again
function upsertWithCollisionHandling(unit, newRow, combine, callback) {
	callback();
        return;

	// Try to select the row in case it's already there
	var col = collectionByUnit[unit].col
	col.findOne(newRow._id, function(err, existingRow) {
		if (err != null) {
			logger.error("Failed selecting for update with collision handling: " + JSON.stringify(err));
			return;
		}

		// Combine the row we selected (or null) with the new row and keep the etag ("#") if it exists
		// etag is the number of updates this row had experienced - which is also the row version.
		var combinedRow = combine(existingRow, newRow);
		var previousEtag = combinedRow["#"];
		
		//if (unit == 'm') console.log("---------------------------------------> " + JSON.stringify(combinedRow));

		// If there is no etag, it means the row wasn't found in the database and we should insert it
		if (existingRow == null) {

			// Try to insert the row
			combinedRow["#"] = 0;
			col.insert(combinedRow, function(err) {
				
				// If the insert failed, this row may suddenly be in the database
				if (err) {

					// If the code is 11000, we got a duplicate exception and the row was inserted to the database just now 
					if (err.code == 11000) {
						
						// Notify about the etag collision and publish it using a counter
						logger.info("[Etag collision] id '" + newRow._id + "' already exists");
						etagCollisionCounter.increment();

						// Retry again, next time the row should be selected
						upsertWithCollisionHandling(unit, newRow, combine, callback);
					} else {

						// It's a different error than a duplicate, we don't know what it is.
						logger.error("Failed inserting combined row: " + err);
					}
				} else {
					
					// The row was inserted. Publish the count of insertions using a counter
					insertCounter.increment();
					callback();
				}
			});
		} else {
			// Increment the etag we're about to update (it's a new change after all)
			combinedRow["#"] += 1;

			// We can't set the id field so we have to delete it
			delete combinedRow._id;
			
			// Try to update the row we just selected, but only if it has the same etag
			col.findAndModify( 
				{ _id: newRow._id, "#": previousEtag },
				null,
				{ $set: combinedRow },
				{},
				function(err, object) {
					if (err) {
						// The update failed because no rows were updated.
						// This happens because the row's etag might have changed just now (someone else updated it before us)
						// Log and publish using a counter
						logger.info("[Etag collision] etag '" + previousEtag + "' already changed or row with id '" + newRow._id + "' got deleted");
						etagCollisionCounter.increment();

						// Retry again, next time the row might not be updated between our selection and modification
						upsertWithCollisionHandling(unit, newRow, combine, callback);
					} else {
						
						// The row was updated. Publish the count of updates using a counter.
						updateCounter.increment();
						callback();
					}
				}
			);
		}
		

	});
}

var secondsBulk = [];

function bulkInsertWithoutErrors(unit, obj, callback) {
	//secondsBulk = secondsBulk.concat(obj);
	//callback();
	//db.collection(collectionByUnit[unit].name).insert(obj, {continueOnError: true}, callback);
	collectionByUnit[unit].col.insert(obj, {continueOnError: true}, callback);
	//callback();
	insertCounter.increment(obj.length||1);
}

function bulkInsertPendingWithoutErrors() {
	if (secondsBulk.length > 0) {
		collectionByUnit['s'].col.insert(secondsBulk, {continueOnError: true}, function() {});
		secondsBulk = [];
	}
}

module.exports.save = function(unit, obj, callback) {
	collectionByUnit[unit].col.save(obj, callback);
}

module.exports.aggregate = function(fromStr, toStr, sourceUnit, targetUnit, callback) {
	//var minuteFromStr = minuteFrom.toISOString().replace("T", " ").substring(0,16);
	//var minuteToStr = minuteFrom.addMinutes(1).toISOString().replace("T", " ").substring(0,16);
	logger.info("Starting aggregation (" + fromStr.colorBlue() + " to " + toStr.colorBlue() + ")");

	var scol = collectionByUnit[sourceUnit].col;
	var tcol = collectionByUnit[targetUnit].col;

	var beforeMs = new Date().getTime();
	var remaining = 2;
	var aggregationError;
	var aggregationResult;
	function writeAggregation() {
		if (--remaining > 0) return;

		if (aggregationError != null) {
			logger.error("Failed aggregating [" + sourceUnit + " to " + targetUnit + "]: " + aggregationError);
			return;
		} 

		var afterAggregationMs = new Date().getTime();

		// We're running each aggregation once and putting the cpu on nodejs with random is much better than the indexing of mongo
		// It's also better if partitioned because then we can partition on _id
		for (var i = 0; i < aggregationResult.length; ++i) {
			aggregationResult._id = Math.round(Math.random()*9000000000000000);
		}

		bulkInsertWithoutErrors(targetUnit, aggregationResult, function(err) {
			if (err) {
				logger.error("Failed saving aggregation: " + err);
			}

			var afterAggregationSaveMs = new Date().getTime();
			logger.info("Aggregation done. " + (aggregationResult.length.toString()).colorMagenta() + 
						" docs within " + ((afterAggregationSaveMs - beforeMs) + "ms").colorMagenta());
			if (callback != null) callback();
		});
	}

	// Aggregate and make room for aggregation at the same time (R+W at mongo)
	// Note that making room is being done with write concern as we want to be sure the batch insert goes smooth
	tcol.remove({"t": fromStr}, {safe: true, w:1}, writeAggregation)
	scol.aggregate([
		{$match: {"$and":[{"t":{"$gte":fromStr}},{"t":{"$lt":toStr}}]}},
		{$group: { "_id": {"n":"$n", "c":"$c", "s":"$s"}, "t":{"$first": fromStr}, "N": {"$sum":"$N"}, "S": {"$sum":"$M"}, "M":{"$max":"$M"}, "m":{"$min":"$m"}}},
		{$project: { "s": "$_id.s", "c": "$_id.c", "n": "$_id.n", "N": 1, "S": 1, "t": 1, "M": 1, "m": 1, "_id": 0}}],
		function(err, result) {
			aggregationError = err;
			aggregationResult = result;
			writeAggregation();
		});
}

module.exports.checkThreshold = function(threshold, sourceUnit, callback) {
	
	logger.info("Checking threshold " + JSON.stringify(threshold).colorBlue());

/* example 
[{
    "metric": "trc_rate#trc_request",
    "duration": "300",
    "aggregation": "$avg",
    "condition": {
        "$lte": "5"
    },
    "enabled": true
}]
*/

	var scol = collectionByUnit[sourceUnit].col;
	var dateString = dates.getSecondBulk(new Date().addSeconds(-(threshold.duration||300)));

	// Build original match phrase
	var originalMatch = {n: threshold.metric, t:{$gt: dateString}};
	if (threshold.server) { originalMatch.s = threshold.server; }

	// Build aggregation phrase
	var valAgg = {};
	valAgg[threshold.aggregation] = "$M";

	// Fix condition
	for (key in threshold.condition) {
		threshold.condition[key] = Number(threshold.condition[key]);
	}

	var pipeline = [
		{$match: originalMatch},
		{$group:{_id: "$s", "v":valAgg}}, 
		{$match: { "v": threshold.condition}}
	];

	//(JSON.stringify(pipeline));
	scol.aggregate(pipeline,
		function(err, result) {
			if (err) {
				logger.error("Error checking threshold: " + err);
				return;
			} 

			if (callback) callback(threshold, result);
		});
}

module.exports.bulkInsertWithoutErrors = bulkInsertWithoutErrors;
module.exports.getMeasure = getMeasure;
module.exports.clearTestsDatabase = clearTestsDatabase;
module.exports.assertRowsExists = assertRowsExists;
module.exports.connect = connect;
module.exports.find = find;
module.exports.upsertWithCollisionHandling = upsertWithCollisionHandling;
