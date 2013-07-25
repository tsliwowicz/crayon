var dates = require("./dates.js");
var prototypes = require("./prototypes.js");
var ObjectID = require('mongodb').ObjectID;
var countersLib = require("./counter.js");

// Set the global services for this module
var logger;
var contextLib;
var mongo;
module.exports.setLogger = function(l) { logger = l; };
module.exports.setContextLib = function(l) { contextLib = l; };
module.exports.setMongo = function(l) { mongo = l; };

// Converts the time field in the arguments to a valid date object
var validateTimeField = function(args, callContext) {

	var time;
	try {

		// If we don't have time in the arguments it's a bad call
		if (args.t == null) {
			callContext.respondText(400, "Missing time field: " + JSON.stringify(args));
			logger.error("Missing time field: " + JSON.stringify(args));
			return;

		// If it's a number, convert it
		} else if (!isNaN(Number(args.t))) {
			
			time = new Date(Number(args.t));

			// Adjustment for unix date +%s
			if (time.getUTCFullYear() < 2000) {
				time = new Date(Number(args.t*1000));
			}

		// Could be a string if it's not a number
		} else {
			time = new Date(args.t);
		}
		
		return time;
	} catch (timeError) {
		callContext.respondText(400, "Invalid time field: " + timeError);
		logger.error("Error parsing time: " + timeError + " for " + JSON.stringify(args) );
		return;
	}
}

// Exposes the mongo db records to the client 
module.exports.find = function(callContext) {
	var args = callContext.args;

	// Validate & cast all input arguments to their proper form
	if (!callContext.jsonifyArg("query") ||
		!callContext.jsonifyArg("fields") ||
		!callContext.jsonifyArg("sort") ||
		!callContext.jsonifyArg("options") ||
		!callContext.numberifyArg("limit") ||
		!callContext.numberifyArg("skip") 
		) return;

	if (!mongo.isValidUnit(args.unit)) {
		callContext.respondText(400, "Invalid unit: " + args.unit);
		return;
	}

	// Start measuring the mongo query time
	var startQueryMs = new Date().getTime();

	// Perform the find on the database using the mongo service
	mongo.find(args, function(err, docs) {

		// Stop measuring the mongo query time
		var endQueryMs = new Date().getTime();

		// If we failed querying mongo
		if (err) {
			callContext.respondJson(200, {error: "Failed querying: " + err.stack});
			logger.error("Mongo selection failed: " + err.stack, "utf-8");
			return;
		}

		var prevTime = null;
		if (args.minifyMeasurements) {
			// Perform minification

			var namesEncountered = {};
			var namesEncounteredArr = [];

			if (docs && docs.length > 0 ) {
				logger.debug("First doc selected: " + JSON.stringify(docs[0]));
			}

			for (docNum in docs) {
				var doc = docs[docNum];
				
				// If there is variance * n, calculate stdev in v instead
				//if (doc.V > 0 && doc.N > 0) doc.V = Math.round(Math.sqrt(doc.V / doc.N)*100)/100;

				if (doc.S != null && doc.N != null) {
					doc.A = doc.S/doc.N;
				}
				// No ave means zero ave, and truncate the decimal points
				if (doc.A != null) {
					if (doc.A == 0) delete doc.A;
					else doc.A = Math.round(doc.A*100)/100
				}

				if (doc.M != null) {
					if (doc.M == 0) delete doc.M;
					else doc.M = Math.round(doc.M*100)/100
				}

				if (doc.m != null) {
					if (doc.m == 0) delete doc.m;
					else doc.m = Math.round(doc.m*100)/100
				}

				if (doc.N != null) {
					if (doc.N == 0) delete doc.N;
					else doc.N = Math.round(doc.N*100)/100
				}

				// No time means no change in time
				if (prevTime != doc.t) prevTime = doc.t;
				else delete doc.t;
					
				// Replace the name with the name index
				var nameIndex = namesEncountered[doc.n];
				if (nameIndex == null) {
					namesEncountered[doc.n] = nameIndex = namesEncounteredArr.length;
					namesEncounteredArr.push(doc.n);
				}
				doc.n = nameIndex
			}

			// Respond
			callContext.respondJson(200, {names: namesEncounteredArr, ms: endQueryMs-startQueryMs, result: docs});

		} else {
			callContext.respondJson(200, {ms: endQueryMs-startQueryMs, result: docs});
		}
	});
}

// Adding a raw sample is adding a sample which is not aggregated (basically only time & name & value)
// When we add a raw value, we simulate an aggregative value of 1 sample based on this raw value
// and call addAggregate
module.exports.addRaw = function(callContext) {

	// If the value is not a list, make it a list (simpler code for processing both cases)
	if (!callContext.args.length) callContext.args = [callContext.args];
	
	// Convert to aggregated samples
	for (argsNum in callContext.args) {
		var args = callContext.args[argsNum];
		callContext.numberifyArg("val", argsNum);
		args.N = 1;
		args.S = args.val;
		args.M = args.val;
		args.m = args.val;
		delete args.val;
	}
	
	addAggregate(callContext);
}

// Adding a an aggregate sample is adding a sample which contains all values as aggregatives (min/max/ave/var...)
var addAggregate = function(callContext) {

	// If the value is not a list, make it a list (simpler code for processing both cases)
	if (!callContext.args.length) callContext.args = [callContext.args];
	if (!validateSamples(callContext)) return;

	countersLib.getOrCreateCounter(10, "Added Metrics", "crayon").increment(callContext.args.length);
	addBulkTimeslotsByDate(callContext.args);

	callContext.respondText(200, "OK");
}

// Make sure each of the samples has what it takes
function validateSamples(callContext) {

	for (argsNum in callContext.args) {
		var args = callContext.args[argsNum];

		// Minify the arguments and validate their value
		callContext.minifyArgNames(args);
		callContext.numberifyArg("N",argsNum);
		callContext.numberifyArg("S",argsNum);
		callContext.numberifyArg("M",argsNum);
		callContext.numberifyArg("m",argsNum);
		
		// Validate that the name field exists
		if (!args.n) {
			callContext.respondText(400, "Missing name field: " + JSON.stringify(args));
			return false;
		}

		// Validate the value of the time field
		args.t = validateTimeField(args, callContext);
		if (args.t == null) {
			return false;
		}
	}

	return true;
}

// Adds a sample to all the timeslots by calling addTimeslot with different units
// We're doing it sequencial on the table order because we don't want to duplicate the rows in memory
function addBulkTimeslotsByDate(argsArr, caller) {

	// Should do only if day is inserted to reduce times
	for (var i=0; i <argsArr.length; ++i) {
		mongo.addName(argsArr[i].n);
	}

	addTimeslotBulk(new Date().getTime(), dates.getSecondBulk, 's', argsArr, function() {
		if (caller != "counter") {
			return;
			var dateToAggregate = new Date().addMinutes(-2);
			fromStr = dateToAggregate.toISOString().replace("T", " ").substring(0,16);
			toStr = dateToAggregate.addMinutes(1).toISOString().replace("T", " ").substring(0,16);
			mongo.aggregate(fromStr, toStr, "s", "m");
		}
	});
}

// Performing a "pessimistic concurrency" upsert for the timeslot
function addTimeslotBulk(beforeMs, timeFormatter, unit, argsArr, callback) {

	// Prepare the collection specific uniqeness per row variables
	if (unit == 's') {
		for (var i=0; i <argsArr.length; ++i) {
			var args = argsArr[i];
			args.t = timeFormatter(args.t);
			args._id = Math.round(Math.random()*9000000000000000);
		}
	}

	var onSaveCompleted = function() {
		var afterMs = new Date().getTime();
		var colName = mongo.getUnitCollectionName(unit);
		countersLib.getOrCreateCounter(10, "Upsert ms to " + colName, "crayon").addSample(afterMs-beforeMs);
		callback();
	};

	// For "seconds" we assume there are not going to be collisions (we use a random id generator).
	// Instead of colission we are going to add the same second "twice" with different data
	// Note that this is improbable that we will get the same sample twice in the same second
	if (unit == 's') {
		mongo.bulkInsertWithoutErrors('s', argsArr, function(err) {
			if (err) {
				logger.error("Failed saving seconds bulk: " + err);
			}

			onSaveCompleted();
		});
	} 
}

// Do the actual math of the aggregatives. Min/Max/Ave/Var or anything else like concat etc.
function combineRows(existingRow, newRow) {	
	var combinedRow = null;

	if (existingRow == null) {
		combinedRow = newRow;
	} else {
		// Copy old fields to the combined row first, they are prone to get overrun
		var existingA = existingRow.A;
		var existingN = existingRow.N;
		var existingV = existingRow.V;

		combinedRow = existingRow;

		// Copy new fields to the combiend row, overrun any old fields with the same name
		//for (field in newRow) {
		//	combinedRow[field] = newRow[field];
		//}
	
		combinedRow.m = (existingRow.m < newRow.m ? existingRow.m : newRow.m);
		combinedRow.M = (existingRow.M > newRow.M ? existingRow.M : newRow.M);
		combinedRow.N = existingN + newRow.N;
		combinedRow.A = ((existingN * existingA) + (newRow.N * newRow.A)) / combinedRow.N;
		
		// An incremental calculation of standard deviation.
		// For adding a single value to an aggregated value, simply add the sample's value distance from averages
		if (newRow.N == 1) {
			combinedRow.V += (newRow.M - existingA) * (newRow.M - combinedRow.A);
		} else if (existingN == 1) {
			combinedRow.V += (existingA - newRow.A) * (existingA - combinedRow.A);

		// For combining two Variance*N, do meanOf_MeansSquare + meanOf_Vars - meanOfMeans_Square;
		} else { 
			// Workaround for cases we don't have stdev in the input
			if (newRow.V == null) newRow.V = existingV;
			
			var meanOfMeans_Square = (combinedRow.A * combinedRow.A);
			var meanOf_MeansSquare = ((existingN * existingA * existingA) + (newRow.N * newRow.A * newRow.A)) / combinedRow.N;
			var meanOf_Vars = (existingV + newRow.V) / combinedRow.N;
			combinedRow.V =  meanOf_MeansSquare + meanOf_Vars - meanOfMeans_Square;
		}
		
		/* // Should rounding point be applied to data on re-aggregation? or just when viewing
		   //==================================================================================
		   // Pros: it would save storage
		   // Cons: It would get further from the exact value

			var config = configLib.getConfig();
			if (config != null && config.decimalPointRounding != null) {
				pow = Math.pow(10,config.decimalPointRounding);
				if (pow != null) { combinedRow.V = Math.round(combinedRow.V*pow)/pow; .... to all values }
		}*/
	}
	
	// Make sure these values exist
	combinedRow.m = combinedRow.m || 0;
	combinedRow.M = combinedRow.M || 0;
	combinedRow.N = combinedRow.N || 0;
	combinedRow.A = combinedRow.A || 0;
	combinedRow.V = combinedRow.V || 0;
			
	// For debugging purposes this often helps a lot
	if (false) {
		console.log("===============");
		console.log("COMBINED: " + JSON.stringify(combinedRow));
		console.log("NEW: " + JSON.stringify(newRow));
		console.log("EXISTING: " + JSON.stringify(existingRow));
	}

	return combinedRow;
}

module.exports.matchSeriesName = function(callContext) {
	callContext.numberifyArg("limit");

	if (!callContext.args.regex) {
		callContext.respondJson(200,{error:"Argument regex is missing"});
		return;
	}

	mongo.matchSeriesName(callContext.args, function(err, docs) {
		callContext.respondJson(200,{names:docs});
		return;
	});
}

module.exports.addAggregate = addAggregate;
module.exports.addBulkTimeslotsByDate = addBulkTimeslotsByDate;
