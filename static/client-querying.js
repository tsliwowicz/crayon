var onlyFieldsRequiredForPlot = {"_id":0, "#": 0}; //{"_id":0,"A":1,"M":1,"t":1,"V":1,"n":1,"N":1};
var allFields = {"_id":0, "#": 0};
var activeTails = [];

var stopTailing = function() {
	while (activeTails.length > 0 ) activeTails.shift().stopTailing();
}

function Query(other) {
	var me=this;

	for (field in other) {
		me[field] = other[field];
	}

	me.iterations = 0;
	
	if (me.tailSecondsInterval != null) {
		activeTails.push(me);
	}
}

Query.prototype.stopTailing = function() {
	var me = this;
	delete me.tailSecondsInterval;
}

Query.prototype.queryDataCombine = function() {
	var me=this;

	var highResMinutesBackLimit = 300;
	var noMinutesEarlierThanThisDate = me.dateTo.addMinutes(-highResMinutesBackLimit);

	if (noMinutesEarlierThanThisDate < me.dateFrom) {
		me.unit = 'm';
		me.queryData();
	}  else {
		var remaining = 2;
		var combinedGraph = [];
		var combineHoursResults = function(graphDataPart) {
			combinedGraph = graphDataPart.concat(combinedGraph);
			if (--remaining == 0) me.callback(combinedGraph);
		}
		var combineMinutesResults = function(graphDataPart) {
			combinedGraph = combinedGraph.concat(graphDataPart);
			if (--remaining == 0) me.callback(combinedGraph);
		}

		var hourQuery = new Query(me);
		delete hourQuery.tailCallback;
		delete hourQuery.tailSecondsInterval;
		hourQuery.unit = 'h';
		hourQuery.dateTo = noMinutesEarlierThanThisDate;
		hourQuery.callback = combineHoursResults;
		hourQuery.queryData(hourQuery);

		var minuteQuery = new Query(me);
		minuteQuery.unit = 'm';
		minuteQuery.dateFrom = noMinutesEarlierThanThisDate;
		minuteQuery.callback = combineMinutesResults;
		minuteQuery.queryData(minuteQuery);
	}
}

Query.prototype.updateQueryConditionsForField = function(queryConditions, field, possibleValues) {
	if (possibleValues) {
		
		
		var addToQueryAndExpand = function(val) {
			if (typeof val != "string" || val.length == 0 || val[val.length - 1] != '%') {
				var q = {};		
				q[field] = val;
				queryConditions.push(q);
			} else {
				val = val.substring(0,val.length - 1);
				var q1 = {};
				q1[field] = { $gte: val };
				var q2 = {};
				q2[field] = { $lt: (val+"~") };

				queryConditions.push(q1);
				queryConditions.push(q2);
			}
		}

		if (possibleValues == null) {
			return;
		} else if (possibleValues.join == null)  {
			addToQueryAndExpand(possibleValues); // scalar
		} else if (possibleValues.length == 1) {
			addToQueryAndExpand(possibleValues[0]); //array of 1 item
		} else {
			var q = {};
			q[field] = { $in: possibleValues };
			queryConditions.push(q);
		}
	}
}

Query.prototype.queryData = function() {
	var me=this;

	if (!me.unit) {
		throw new Error("Unit must be provided in order to query the server (possible options: 's','m','h','d'...)");
	}

	var startDateString = me.dateFrom.toMongoDateString();
	me.dateFrom = startDateString.toMongoDate();

	var endDateString = "9999";
	if (me.dateTo != null) {
		endDateString = me.dateTo.toMongoDateString();
		me.dateTo = endDateString.toMongoDate();
	}

	var queryConditions = [];
	
	// Filter by host (with a tiny query optimization)
	me.updateQueryConditionsForField(queryConditions, "s", me.hosts);
	me.updateQueryConditionsForField(queryConditions, "c", me.components);
	me.updateQueryConditionsForField(queryConditions, "n", me.names);
	queryConditions.push({ t: { $gte: startDateString} }, { t: { $lt: endDateString} });
	
	var mongoQuery = { $and: queryConditions };
	//console.log(JSON.stringify(mongoQuery));
	
	if (me.fields == null) me.fields = { _id: 0 };
	//options={"$hint":{"t":1}}&
	var dataLine = 'unit=' + me.unit + '&query=' + encodeURIComponent(JSON.stringify(mongoQuery)) + 
		'&limit=999999&sort=[["t","asc"]]&minifyMeasurements=1&fields=' + encodeURIComponent(JSON.stringify(me.fields));
	var myTrigger = null;

	$.ajax({
		url: "/find",
		data: dataLine,
		dataType: 'json',
		headers: { "Accept-Encoding" : "gzip" },
		success: function(resultObject) {
			if (resultObject.error) {
				console.error(resultObject.error);
			} else {

				// If it was minified
				if (resultObject.names != null) {

					for (seriesDataIndex in resultObject.result) {
						var seriesData = resultObject.result[seriesDataIndex];

						// De-Minify name
						seriesData.n = resultObject.names[seriesData.n];

						// De-Minify time
						if (seriesData.t) {
							previousTime = seriesData.t;
						} else {
							seriesData.t = previousTime;
						}

						if (seriesData.A == null) seriesData.A = 0;
						if (seriesData.N == null) seriesData.N = 0;
						if (seriesData.M == null) seriesData.M = 0;
						if (seriesData.m == null) seriesData.m = 0;
					}
				}

				console.log("Queried " + resultObject.result.length + " documents within " + resultObject.ms + "ms");
				if (me.iterations == 0) {
					me.callback(resultObject.result)
				} else {
					me.tailCallback(resultObject.result);
				}
			}
		},
        complete: function ()
        {
        	if (me.tailSecondsInterval) {
				setTimeout(function() {
					me.iterations++;

					me.dateFrom = me.dateTo || new Date();
					me.dateTo = null;
					me.dateFrom = me.dateFrom.addSeconds((me.iterations == 1) ? -60 : (-me.tailSecondsInterval*5));
					me.queryData();

				},me.tailSecondsInterval*1000);
        	}
			
        },
	});
}