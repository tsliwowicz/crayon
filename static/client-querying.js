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

Query.prototype.toRegex = function(val) {
	if (val == null) {
		return "[^ ]*";
	} else if (val.join == null)  {
		return val; // scalar
	} else if (val.length == 1) {
		return val[0]; //array of 1 item
	} else {
		return "(" + val.join("|") + ")";
	}
}

Query.prototype.toWildcard = function(val) {
	if (val == null) {
		return "*";
	} else if (val.join == null)  {
		return val; // scalar
	} else if (val.length == 1) {
		return val[0]; //array of 1 item
	} else {
		throw new Error("multiple values are not supported in wildcards");
		//return "(" + val.join("|") + ")";
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
	var dataLine = '';

	var realDataSources = 0;
	for (i in me.dataSources) {
		if (typeof me.dataSources[i] != "string") realDataSources++;
	}
	if (realDataSources == 0) return;

	dataLine = "ds=" + encodeURIComponent(JSON.stringify(me.dataSources));

	var myTrigger = null;
	me.beforeQueryMs = new Date().getTime();

	$.ajax({
		url: "/find",
		data: dataLine,
		//dataType: 'json',
		headers: { "Accept-Encoding" : "gzip" },
		success: function(resultString) {
		
			var rows = resultString.split('\n');

			var docs = [];
			var docsByKey = {};

			for (rowNum in rows) {
				try {
					var row = rows[rowNum];
					var parts = row.split(' ');
					if (parts.length < 2) continue;

					

					if (parts.length == 8) {
						var doc = {};
						doc.t = new Date(parts[0].substring(0,15) + "0:00Z");
						if (me.lastDateInResponse == null || doc.t > me.lastDateInResponse) {
							me.lastDateInResponse = doc.t;
						}
						doc.n = parts[1];

						if (parts[2] != "-") doc.s = parts[2];
						if (parts[3] != "-") doc.c = parts[3];
						doc.S = Number(parts[4]);
						doc.N = Number(parts[5]);
						doc.M = Number(parts[6]);
						doc.m = Number(parts[7]);
						doc.A = doc.S / doc.N;

						var docKey = doc.s + doc.c + doc.n + doc.t.toISOString();
						var prevDoc = docsByKey[docKey];
						if (prevDoc) {
							prevDoc.S += doc.S;
							prevDoc.N += doc.N;
							prevDoc.A = prevDoc.S / prevDoc.N;
							if (doc.M > prevDoc.M) prevDoc.M = doc.M;
							if (doc.m < prevDoc.m) prevDoc.m = doc.m;
						} else {
							docsByKey[docKey] = doc;
							docs.push(doc);
						}
					} else {
						var doc = {};
						doc.t = new Date(parts[0] + "Z");
						if (me.lastDateInResponse == null || doc.t > me.lastDateInResponse) {
							me.lastDateInResponse = doc.t;
						}
						doc.n = parts[1];

						doc.A = doc.M = doc.m = doc.S = Number(parts[2]);
						if (parts[3] != "-") doc.s = parts[3];
						if (parts[4] != "-") doc.c = parts[4];
						docs.push(doc);
					}

				} catch (ex) {
					console.error("Failed parsing row: " + ex.stack);
				}
			}

			me.ms = new Date().getTime() - me.beforeQueryMs;
			console.log("Queried " + rows.length + " data points within " + me.ms + "ms");

			if (me.iterations == 0) {
				me.callback(docs)
			} else {
				me.tailCallback(docs);
			}
		},
		error: function(xhr, status, error) {
			if (xhr && xhr.responseText) console.error(xhr.responseText);
		},
        complete: function ()
        {
        	if (me.tailSecondsInterval) {
				setTimeout(function() {
					me.iterations++;

					/*if (me.lastDateInResponse) {
						me.dateFrom = me.lastDateInResponse;
						me.dateFrom = me.dateFrom.addSeconds((me.iterations == 1) ? -60 : (-me.tailSecondsInterval*5));
					} else {
						me.dateFrom = me.dateTo || new Date();
						me.dateFrom = me.dateFrom.addSeconds((me.iterations == 1) ? -60 : (-me.tailSecondsInterval*5));
					}*/

					me.dateTo = null;
					me.queryData();

				},me.tailSecondsInterval*1000);
        	}
			
        },
	});
}