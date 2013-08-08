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
			if (rows.length == 1 && rows[0].indexOf("error") != -1) {
				var err = JSON.parse(rows[0]).error;
				if (err.indexOf("maxBuffer exceeded") != -1) {
					console.error("Data was too big to fit in server buffer, use 'bufferMB' attribute to specify a larger buffer");
				} else {
					console.error(err);
				}
				return;
			}

			var docs = [];
			var docsByKey = {};

			var currentDS = null;
			for (rowNum in rows) {
				try {
					var row = rows[rowNum];
					var parts = row.split(' ');

					if (parts.length == 1) {
						var dsIndex = Number(parts[0]);
						currentDS = me.dataSources[dsIndex];
						continue;
					}
					if (parts.length < 2) continue;

					if (parts.length == 8) {
						var doc = {};
						doc.n = parts[0];
						if (currentDS.replaceName && currentDS.replaceName.join && currentDS.replaceName.length == 2) {
							doc.n = doc.n.replace(new RegExp(currentDS.replaceName[0]), currentDS.replaceName[1]);
						}
						

						if (currentDS.unit == "h") {
							var oneOrZero = Math.round(new Date(parts[1]).getUTCMinutes() / 60);
							doc.t = new Date(parts[1].substring(0,13) + ":00:00Z").addHours(oneOrZero);
						} else {
							//var oneOrZero = Math.round((new Date(parts[0]).getUTCMinutes() % 10) / 10);
							doc.t = new Date(parts[1].substring(0,15) + "0:00Z").addMinutes(0 * 10);
						}

						
						if (isNaN(doc.t.getTime())) {
							debugger;
						}

						if (currentDS.shiftSeconds) doc.t=doc.t.addHours(currentDS.addSeconds);
						if (currentDS.shiftHours) doc.t=doc.t.addHours(currentDS.addHours);
						if (currentDS.shiftMinutes) doc.t=doc.t.addHours(currentDS.addMinutes);
						if (currentDS.shiftDays) doc.t=doc.t.addHours(currentDS.addDays);
						
						if (me.lastDateInResponse == null || doc.t > me.lastDateInResponse) {
							me.lastDateInResponse = doc.t;
						}
					

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
						doc.n = parts[1];
						if (currentDS.replaceName && currentDS.replaceName.join && currentDS.replaceName.length == 2) {
							doc.n = doc.n.replace(new RegExp(currentDS.replaceName[0]), currentDS.replaceName[1]);
						}

						doc.t = new Date(parts[0] + "Z");

						if (me.lastDateInResponse == null || doc.t > me.lastDateInResponse) {
							me.lastDateInResponse = doc.t;
						}

						if (currentDS.shiftSeconds) doc.t=doc.t.addHours(currentDS.addSeconds);
						if (currentDS.shiftHours) doc.t=doc.t.addHours(currentDS.addHours);
						if (currentDS.shiftMinutes) doc.t=doc.t.addHours(currentDS.addMinutes);
						if (currentDS.shiftDays) doc.t=doc.t.addHours(currentDS.addDays);

						

						doc.A = doc.M = doc.m = doc.S = Number(parts[2]);
						if (parts[3] != "-") doc.s = parts[3];
						if (parts[4] != "-") doc.c = parts[4];
						docs.push(doc);
					}
				} catch (ex) {
					debugger;
					console.error("Failed parsing row: " + ex.stack);
					break;
				}
			}

/*
			if (currentDS.sort == "descending" || currentDS.sort == "desc") { 
				docs.sort(function (d1,d2) { return d1.S - d2.S });
			} else if (currentDS.sort == "ascending" || currentDS.sort == "asc") { 
				docs.sort(function (d1,d2) { return d2.S - d1.S });
			} 
*/
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