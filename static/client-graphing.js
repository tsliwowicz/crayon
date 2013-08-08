var defaultPallete = ["#6666E6","#32CD32","#FF00FF","#F57F00","#FF0000","#8A2BE2","#A52A2A","#5F9EA0","#6495ED","#DAA520","#DC143C","#FF1493","#696969","#2F4F4F","#7FFFD4","#808000","#D2691E"];
var colorCache = {};
String.prototype.colorHash = function() {
	var hashR,hashG,hashB = 0, i, char;
	if (this.length == 0) return "#000000";
	if (colorCache[this]) return colorCache[this];

	for (i = 0; i < this.length; i++) {
		char = this.charCodeAt(i);
		hashR = ((hashR<<5)-hashR)*571+char;
		hashG = ((hashG<<5)-hashG)*1213+char;
		hashB = ((hashB<<5)-hashB)*3559+char;
		hashR = hashR & hashR; // Convert to 32bit integer
		hashG = hashG & hashG; // Convert to 32bit integer
		hashB = hashB & hashB; // Convert to 32bit integer
	}
	if (hashR < 0) hashR = hashR * -1;
	if (hashG < 0) hashG = hashG * -1;
	if (hashB < 0) hashB = hashB * -1;
	
	var baseBrightness = 200;
	hashR = (hashR % baseBrightness) + (255 - baseBrightness);
	hashG = (hashG % baseBrightness) + (255 - baseBrightness);
	hashB = (hashB % baseBrightness) + (255 - baseBrightness);

	hashR = 255 - hashR;
	hashG = 255 - hashG;
	hashB = 255 - hashB;

	colorCache[this] = "#" + 
		('0'+hashR.toString(16)).slice(-2) + 
		('0'+hashG.toString(16)).slice(-2) +
		('0'+hashB.toString(16)).slice(-2);
	return colorCache[this];
}

Date.prototype.addDays = function(h) {    
   return new Date(this.getTime() + (h*60*60*1000*24));
};
	
Date.prototype.addHours = function(h) {    
   return new Date(this.getTime() + (h*60*60*1000));
};
	
Date.prototype.addMinutes = function(m) {    
   return new Date(this.getTime() + (m*60*1000)); 
};

Date.prototype.addSeconds = function(s) {    
   return new Date(this.getTime() + (s*1000));
};

var secondsInUnit = [];
secondsInUnit["seconds"] = 1;
secondsInUnit["second"] = 1;
secondsInUnit["sec"] = 1;
secondsInUnit["secs"] = 1;
secondsInUnit["minutes"] = 60*secondsInUnit["sec"];
secondsInUnit["minute"] = 60*secondsInUnit["sec"];
secondsInUnit["min"] = 60*secondsInUnit["sec"];
secondsInUnit["mins"] = 60*secondsInUnit["sec"];
secondsInUnit["hours"] = 60*secondsInUnit["min"];
secondsInUnit["hour"] = 60*secondsInUnit["min"];
secondsInUnit["days"] = 24*secondsInUnit["hour"];
secondsInUnit["day"] = 24*secondsInUnit["hour"];
secondsInUnit["weeks"] = 7*secondsInUnit["day"];
secondsInUnit["week"] = 7*secondsInUnit["day"];
secondsInUnit["months"] = 30*secondsInUnit["day"];
secondsInUnit["month"] = 30*secondsInUnit["day"];
secondsInUnit["years"] = 12*secondsInUnit["month"];
secondsInUnit["year"] = 12*secondsInUnit["month"];
numberNames = ["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve"];
Number.prototype.understandTime = function(num) {return num.toString().understandTime();}
Date.prototype.understandTime = function(date) {return date;}
String.prototype.understandTime = function() {
	str = this;

	// No time
	if (str == null) return null;

	// Is Number
	if (!isNaN(Number(str))) {
		
		// Epoch
		time = new Date(Number(str));

		// Adjustment for unix date +%s
		if (time.getUTCFullYear() < 2000) {
			time = new Date(Number(str*1000));
		}

		return time;
	} 

	// Is String
	strLower = str.toLowerCase();
	if (strLower == "now") return new Date();
	if (strLower == "lasthour") return new Date().addHours(-1);
	if (strLower == "lastday") return new Date().addDays(-1);
	if (strLower == "lastmonth") return new Date().addDays(-30);

	var wordsLower = strLower.split(' ');
	
	function understandRelativeTime() {
		if (wordsLower.length == 0) return null;
		
		// Assume default unit is "1" unless specified a number (e.g. minute ago)
		var unit = 1
		if (wordsLower.length > 1) {
			var numberNameIndex = numberNames.indexOf(wordsLower[0]);
			var asNumber = Number(wordsLower[0]);
			if (numberNameIndex != -1) {
				unit = numberNameIndex;
			} else if (!isNaN(asNumber)) {
				unit = asNumber;
			} else {
				return null;
			}

			wordsLower.shift();
		}

		var secondsMultiplier = secondsInUnit[wordsLower[0]];
		if (secondsMultiplier == null) return null;

		return new Date(new Date().getTime() - (unit * secondsMultiplier * 1000));
	}

	// last X unit
	if (wordsLower[0] == "last") {
		wordsLower.shift();

		// Do the time parsing
		return understandRelativeTime();

	// X unit ago
	} 

	if (wordsLower[wordsLower.length - 1] == "ago") {
		wordsLower.pop();
		if (wordsLower.length == 0) return null;

		// an Hour ago, a minute ago
		if (wordsLower[0] == "a" || wordsLower[0] == "an") wordsLower.shift();

		// Do the time parsing
		return understandRelativeTime();
	}

	// Default new date
	return new Date(strLower);
}


Date.prototype.toShellDateString = function(unit) { 
	return this.toISOString();
};

String.prototype.toShellDateString = function(unit) { 
	return this.understandTime().toShellDateString(unit);
};


Date.prototype.toMongoDateString = function(unit) { 
	//if (unit == 's') {
	//	return Math.round(this.getTime() / 1000).toString(16);
	//} else {
   		return this.toISOString().replace("T","_").substring(0,19)
   	//}
};

String.prototype.toMongoDateString = function(unit) { 
	return this.understandTime().toMongoDateString(unit);
};



window.benchmarkFromLast = function(msg) {
	var now = new Date().getTime();
	if (lastBenchmarkTime != null) {
		console.log(msg + " " + (now - lastBenchmarkTime).toString() + "ms");
	}
	lastBenchmarkTime = now;
}

var dateDiffMinutes = function(date1, date2) {
	var diff = date1.getTime() - date2.getTime(); 
	return (diff / (60*1000)); 
}

var dateDiffSeconds = function(date1, date2) {
	var diff = date1.getTime() - date2.getTime(); 
	return (diff / (1000)); 
}

Date.prototype.toMongoDate = function() {
	return this;
}
String.prototype.toMongoDate = function() {
	var mongoDateString = this;

	// just year 
	if (mongoDateString.length == 4) mongoDateString += "-01-01 00:00:00";
	else if (mongoDateString.length == 7) mongoDateString += "-01 00:00:00";
	else if (mongoDateString.length == 10) mongoDateString += " 00:00:00";
	else if (mongoDateString.length == 13) mongoDateString += ":00:00";
	else if (mongoDateString.length == 16) mongoDateString += ":00";
	else if (mongoDateString.length == 19) {}
	else return null;

	// return ISO Format that is supported by all browsers
	return new Date(mongoDateString.replace(" ","T") + "Z"); 
}

var getCounterName = function(seriesData, graphOptions) {
	var sb = "";


	var indexOfHashInName = -1; //seriesData.n.indexOf('#');
	if (indexOfHashInName == -1) {
		sb += seriesData.n;
	} else {
		sb += seriesData.n.substring(indexOfHashInName+1);
	}

	if (graphOptions.includeServerInLabel && seriesData.s && seriesData.s != "undefined") sb = seriesData.s + ":" + sb;
	if (graphOptions.includeComponentInLabel && seriesData.c && seriesData.c != "undefined") sb = seriesData.c + "@" + sb;

	return sb;
}

var lastGraph;
var lastSeries;
var cacheByDiv = {};
var highlightLegendDiv = null;
var highlightLegendTimeout = null;

var lastHighlightAt = new Date().getTime();
var highlightCallback_ShowSeriesName = function(event, x, points, row, seriesName) {
	lastHighlightAt = new Date().getTime();
	clearTimeout(highlightLegendTimeout);
	highlightLegendTimeout = setTimeout(function() {
		if (new Date().getTime() - lastHighlightAt > 500) {
			highlightCallback_ShowSeriesNameOnce(event, x, points, row, seriesName);
		}
	}, 600);
}

var unhighlightCallback_ShowSeriesName = function(event, x, points, row, seriesName) {
	clearTimeout(highlightLegendTimeout);
	highlightLegendDiv = highlightLegendDiv || document.getElementById("highlightSeriesLabelDiv");
	highlightLegendDiv.style.display = "none";
}

var highlightCallback_ShowSeriesNameOnce = function(event, x, points, row, seriesName) {
	var point = null;
	//console.log(name);

	for (i in points) {
		if (points[i].name == seriesName) { 
			point = points[i];
			break;
		}
	}

	if (!point) return;

	var name = new Date(point.xval).toLocaleString() + "<br>";
	name += seriesName.replace(/<[^>]+>/g,'').replace(":","<br>");

	highlightLegendDiv = highlightLegendDiv || document.getElementById("highlightSeriesLabelDiv");

	var yNum = point.yval;
	/*cacheByDiv[
	
	if (divCache.graphOptions.decimalRounding != null) {
		var num = Math.pow(10,divCache.graphOptions.decimalRounding);
		yNum = Math.round(yNum * num) / num;
	}*/

	highlightLegendDiv.innerHTML = name + "<br>Value: " + yNum;
	//$(highlightLegendDiv).position(event.y, event.x);
	highlightLegendDiv.style.left = (event.x || event.clientX)+ "px";
	highlightLegendDiv.style.top = ((event.y  || event.clientY) + 10) + "px";
	highlightSeriesLabelDiv.style.zIndex = 20
	highlightLegendDiv.style.display = "block";

	// point.yval;
}

var drawGraph = function(graphDiv, labelsDiv, graphData, userOptions) {
	var divCache = {};
	cacheByDiv[graphDiv.id] = divCache;

	divCache.graphOptions = {
			title: null,
			rollPeriod: 1,
			showRoller: false,
			errorBars: false,
			labelsSeparateLines: true,
			legend: 'always',
			strokeWidth: 2.0,
			labelsDiv: labelsDiv,
			axisLabelWidth: 80,
			connectSeparatedPoints: true,
			drawGapEdgePoints: true,
			showAxis: true,
			stackedGraph: false,
			fillGraph: false,
			logscale: false,
			ylabel: null,
			showRangeSelector: false,
			includeServerInLabel: true,
			includeComponentInLabel: true,
			labelsKMG2: true,
			highlightCircleSize: 3,
			highlightSeriesOpts: { strokeWidth: 4, strokeBorderColor: "black" },
			gapInSeconds: 180,
			dateWindowRatio: 0.1,
			wholeWindow: true,
			aggregative: "ave",
			isDelta: false,
			valueMultiplier: 1,
			highlightSeriesBackgroundAlpha: 1,
			highlightCallback: highlightCallback_ShowSeriesName,
			unhighlightCallback: unhighlightCallback_ShowSeriesName
		};

	// Override default options
	for (option in userOptions) {
		divCache.graphOptions[option] = userOptions[option];
	}

	if (divCache.graphOptions.gapInMinutes)
		divCache.graphOptions.gapInSeconds = divCache.graphOptions.gapInMinutes * 60;

	divCache.skipped = 0;
	/*
	var isSorted = false;
	if (divCache.graphOptions.sort == "desc") {
		graphData.sort(function (g1,g2) { var t1=g1.t.getTime(); var t2=g2.t.getTime(); if (t1 == t2) return (g1.S < g2.S ? 1 : -1); else return (t1 < t2 ? -1 : 1) });
		isSorted = true;
	} else if (divCache.graphOptions.sort == "asc") {
		graphData.sort(function (g1,g2) { var t1=g1.t.getTime(); var t2=g2.t.getTime();  if (t1 == t2) return (g1.S < g2.S ? -1 : 1); else return (t1 < t2 ? -1 : 1) });
		isSorted = true;
	} else {
		graphData.sort(function (g1,g2) { var t1=g1.t.getTime(); var t2=g2.t.getTime(); return (t1 < t2 ? -1 : 1) });
	}*/

	graphData.sort(function (g1,g2) { var t1=g1.t.getTime(); var t2=g2.t.getTime(); return (t1 < t2 ? -1 : 1) });

	var newHighCapVal = 0;
	var newLowCapVal = 0;
	var labelArr = [];
	var colorsArr = [];
	var palletteIndex = 0;
	
	divCache.timeSlotArr = [];
	divCache.seriesArr = [];
	divCache.seriesFound = {};
	divCache.byTimeSeriesValues = {};

	divCache.graphOptions.valueFormatter = function(y,f,field,graph) {
		if (field == "time") return new Date(y).toLocaleString();
		if (!y) return y;
		var yNum = Number(y);

		
		if (divCache.graphOptions.decimalRounding != null) {
			var num = Math.pow(10,divCache.graphOptions.decimalRounding);
			yNum = Math.round(yNum * num) / num;
		}

		if (isNaN(yNum)) return y;
		if (yNum > 1000000000) return (Math.round(yNum/10000000)/100) + "G";
		if (yNum > 1000000) return (Math.round(yNum/10000)/100) + "M";
		if (yNum > 1000) return (Math.round(yNum/10)/100) + "K";
		return yNum;
	}
	
	// Record any new series we're encountering in the data
	for (dataIndex in graphData) {
		var counter = graphData[dataIndex];
		if (counter == null) continue;

		var fullCounterName = getCounterName(counter, divCache.graphOptions);
		var seriesObj = divCache.seriesFound[fullCounterName];
		if (!seriesObj) {
			divCache.seriesFound[fullCounterName] = seriesObj = {};
			seriesObj.label = "<SPAN class='legendItem'>" + fullCounterName +"</SPAN>";
			seriesObj.fullCounterName = fullCounterName;
			seriesObj.S = 0;
			seriesObj.N = 0;
			divCache.seriesArr.push(seriesObj);
		}
		seriesObj.S += counter.S;
		seriesObj.N += 1;
	}

	// Labels should always be displayed in same order
	if (divCache.graphOptions.sort == "desc") {
		divCache.seriesArr.sort(function(s1,s2) { return (s1.S > s2.S ? -1 : 1); });
	} else if (divCache.graphOptions.sort == "asc") {
		divCache.seriesArr.sort(function(s1,s2) { return (s1.S < s2.S ? -1 : 1); });
	} else {
		divCache.seriesArr.sort(function(s1,s2) { return (s1.label < s2.label ? -1 : 1); });
		// Default sort is by name
	}

	for (seriesNum in divCache.seriesArr) {
		var seriesObj = divCache.seriesArr[seriesNum];
		labelArr.push(seriesObj.label);

		if (palletteIndex >= defaultPallete.length) {
			seriesObj.color = seriesObj.fullCounterName.colorHash();
		} else {
			seriesObj.color = defaultPallete[palletteIndex++];
		}

		colorsArr.push(seriesObj.color);
		seriesObj.index = labelArr.length;
	}

	labelArr.splice(0,0,"time");

	populateTimeSlotArr(divCache, graphData);

	// Move the zoom to the last 10% of the graph
	if (divCache.timeSlotArr.length != 0 && !divCache.graphOptions.wholeWindow && divCache.lastDate != null) {
		var firstDate = divCache.timeSlotArr[0][0];
		var zoomedWindowOfTimeMS = (divCache.lastDate.getTime() - firstDate.getTime()) * divCache.graphOptions.dateWindowRatio;
		divCache.graphOptions.dateWindow = [divCache.lastDate.getTime() - zoomedWindowOfTimeMS,divCache.lastDate.getTime()];
	}
	
	divCache.graphOptions.labels = labelArr;
	divCache.graphOptions.colors = colorsArr;
	divCache.graphOptions.valueRange = null;
	//if (divCache.graphOptions.stackedGraph) {
	//} 	
	/*  else if (graphOptions.valueRange != null) {
		if (graphOptions.yValuePadRatio) newHighCapVal = (newHighCapVal*graphOptions.yValuePadRatio)
		if (isNaN(graphOptions.valueRange[0])) graphOptions.valueRange[0] = newLowCapVal;
		if (isNaN(graphOptions.valueRange[1])) graphOptions.valueRange[1] = newHighCapVal;
	}*/

	lastSeries = divCache.timeSlotArr;
	try {
		lastGraph = new Dygraph(graphDiv, divCache.timeSlotArr, divCache.graphOptions);
	} catch (ex) {
		debugger;
	}
	if (divCache.skipped > 0) {
		console.warn(divCache.skipped + " invalid data points were ignored");
	}
	divCache.dygraph = lastGraph;
}

var updateDrawnGraph = function(graphDiv, graphData, enlargeWindow) {
	var divCache = cacheByDiv[graphDiv.id];
	if (!divCache) return;
	graphData.sort(function (g1,g2) { return (g1.t < g2.t ? -1 : 1) });
	divCache.skipped = 0;

	var lenBefore = divCache.timeSlotArr.length;
	divCache.appendOnly = true;
	populateTimeSlotArr(divCache, graphData);
	var lenAfter = divCache.timeSlotArr.length;

	// Keep a sliding window model
	if (!enlargeWindow) {
		for (var i = 0; i < (lenAfter - lenBefore); ++i) {
			var dumpedTimeslot = divCache.timeSlotArr.shift();
			if (dumpedTimeslot != null) {
				delete divCache.byTimeSeriesValues[dumpedTimeslot];
			}
		}
	}

	if (divCache.timeSlotArr.length > 1 && 
		divCache.timeSlotArr[divCache.timeSlotArr.length - 1].length <
		divCache.timeSlotArr[divCache.timeSlotArr.length - 2].length) {
		debugger;
	}

	try {
		divCache.dygraph.updateOptions( { 'file': divCache.timeSlotArr } );
	} catch (ex) {
		debugger;
	}
	
	if (divCache.skipped > 0) {
		console.warn(divCache.skipped + " invalid data points were ignored");
	}
}

var populateTimeSlotArr = function(divCache, graphData) {
	var noValue = divCache.graphOptions["stackedGraph"] ? 0 : NaN;

	for (fullCounterName in  divCache.seriesFound) {
		var seriesObj = divCache.seriesFound[fullCounterName];
		
		var defaultLineStyle = {
		}

		divCache.graphOptions[seriesObj.label] = defaultLineStyle;
		
		divCache.graphOptions[fullCounterName] = {};
		if (divCache.graphOptions.lineStyles) {
			for (styleNum in divCache.graphOptions.lineStyles) {
				var style = divCache.graphOptions.lineStyles[styleNum];
				if (fullCounterName.match(style.match)) {
					for (key in style) {
						defaultLineStyle[key] = style[key];
					}
				}
			}
		}
	}

	var firstNewTimeSlotIndex = null;
	var previousTimeSlot = null;
	divCache.deltaHelper = {};
	for (dataIndex in graphData) {
		var counter = graphData[dataIndex];
		if (counter == null) continue;
		var fullCounterName = getCounterName(counter, divCache.graphOptions);
		var seriesObj = divCache.seriesFound[fullCounterName];

		// Rotate the data to match dygraph's list format
		// Example (from dygraph's site):
		//[
        //	[ new Date("2009/07/12"), 100, 200 ],
        //	[ new Date("2009/07/19"), 150, 220 ]
      	//]
      	var timeSlotTime = counter.t.toMongoDate();

      	if (timeSlotTime == null ||
      		isNaN(timeSlotTime.getTime())) {
      		if (!divCache.skipped) divCache.skipped = 1
      		else divCache.skipped++;
      		continue;
      	}

		var timeSlot = divCache.byTimeSeriesValues[timeSlotTime];
		if (!timeSlot) {

			// Skip this sample if it belongs to the past
			if (divCache.timeSlotArr.length > 0 && divCache.timeSlotArr[0][0] > timeSlotTime ) continue;

			divCache.byTimeSeriesValues[timeSlotTime] = timeSlot = [ timeSlotTime ];
			var newTimeSlotIndex = divCache.timeSlotArr.push(timeSlot) - 1;
			if (firstNewTimeSlotIndex == null) firstNewTimeSlotIndex = newTimeSlotIndex;
			else if (firstNewTimeSlotIndex > newTimeSlotIndex) firstNewTimeSlotIndex = newTimeSlotIndex;
		}

		var valObj = [noValue,noValue];
		var lineStyle = divCache.graphOptions[seriesObj.label];
		var aggregative = lineStyle.aggregative || divCache.graphOptions.aggregative;
		var isDelta = lineStyle.isDelta || divCache.graphOptions.isDelta;
		var valueMultiplier = lineStyle.valueMultiplier || divCache.graphOptions.valueMultiplier;
		var divideBySecondsSinceLastSample = lineStyle.divideBySecondsSinceLastSample || divCache.graphOptions.divideBySecondsSinceLastSample;
		var decimalRounding = lineStyle.decimalRounding || divCache.graphOptions.decimalRounding;
		if (counter.forcedValue != null) { valObj[0] = counter.forcedValue; }
		else {
			if (aggregative == 'ave') { valObj[0] = counter.A; valObj[1] = counter.V; }
			else if (aggregative == 'min') valObj[0] = counter.m;
			else if (aggregative == 'max') valObj[0] = counter.M;
			else if (aggregative == 'sum') valObj[0] = counter.S;
			else if (aggregative == 'count') valObj[0] = counter.N;
			if (isDelta) {
				if (isNaN(valObj[0])) {
				} else if (divCache.deltaHelper[seriesObj.index] == null) {
					divCache.deltaHelper[seriesObj.index] = valObj[0];
					valObj[0] = NaN;
				} else {	
					var temp = valObj[0];
					if (valObj[0] < divCache.deltaHelper[seriesObj.index]) {
						divCache.deltaHelper[seriesObj.index] = valObj[0];
						valObj[0] = divCache.deltaHelper[seriesObj.index];
						// possible reset of counter

					} else {
					//if (Math.abs(valObj[0] - divCache.deltaHelper[seriesObj.index]) > 10000) {
					//	console.log("Big Delta");
					//}
						valObj[0] -= divCache.deltaHelper[seriesObj.index];
						divCache.deltaHelper[seriesObj.index] = temp;
					}
				}
			}

			if (divCache.lastTimeslot == null) divCache.lastTimeslot = {};
			if (divideBySecondsSinceLastSample) {
				var lastTimeslot = divCache.lastTimeslot[seriesObj.index];
				if (lastTimeslot) {
					var msDiff = timeSlot[0].getTime() - lastTimeslot[0].getTime();
					if (msDiff > 0) {
						valObj[0] /= msDiff * 0.001;
					} else {
						valObj[0] = NaN;
					}
				}

				divCache.lastTimeslot[seriesObj.index] = timeSlot;
			}

			if (decimalRounding != null) {
				var num = Math.pow(10,decimalRounding);
				valObj[0] = Math.round(valObj[0] * num) / num;
			}

			if (valueMultiplier && !isNaN(valObj[0])) {
				valObj[0] *= valueMultiplier;
			}
		}
		
		// Put the series sample in the series slot in the timeslot (e.g. series B was null but C had values)
		timeSlot[seriesObj.index] = (divCache.graphOptions.errorBars?valObj:valObj[0]);
	}

	// Fill empty counter values with NaN (Makes dygraph draw gaps instead of 0 values)
	var lastDate = null;
	function realizeGap(atTime, where) {
		if (lastDate && atTime && dateDiffSeconds(lastDate, atTime) < -divCache.graphOptions.gapInSeconds) {
			var edgeDateEarly = lastDate.addMinutes(1);
			var edgeDateLate = atTime.addMinutes(-1);
		
			var earlySlot = [edgeDateEarly];
			var lateSlot = [edgeDateLate];
			var num = 0;
			for (series in divCache.seriesFound) {
				var index = divCache.seriesFound[series].index;
				earlySlot[num + 1] = (divCache.graphOptions.errorBars?[noValue,noValue]:noValue);
				lateSlot[num + 1] = (divCache.graphOptions.errorBars?[noValue,noValue]:noValue);
				num++;
			}
			
			divCache.timeSlotArr.splice(timeSlotIndex,0,lateSlot);
			divCache.timeSlotArr.splice(timeSlotIndex,0,earlySlot);
			return true;
		}
		return false;
	}

	divCache.DEBUG_firstNewTimeSlotIndex = firstNewTimeSlotIndex;
	var lastGoodValueOfEachIndex = {};

	divCache.lastDate = lastDate;
	//if (firstNewTimeSlotIndex != null) {
		for (var timeSlotIndex = 0; timeSlotIndex < divCache.timeSlotArr.length; ++timeSlotIndex) {
		//for (timeSlotIndex in divCache.timeSlotArr) {

			//if (timeSlotIndex < firstNewTimeSlotIndex) continue;
			var timeSlot = divCache.timeSlotArr[timeSlotIndex];

			for (series in divCache.seriesFound) {
				var index = divCache.seriesFound[series].index;
				if (timeSlot[index] == null) {
					if (divCache.graphOptions.connectSeparatedPoints && lastGoodValueOfEachIndex[index] != null) {
						timeSlot[index] = (divCache.graphOptions.errorBars?[lastGoodValueOfEachIndex[index],noValue]:lastGoodValueOfEachIndex[index]);
					} else {
					 	timeSlot[index] = (divCache.graphOptions.errorBars?[noValue,noValue]:noValue);
					}
				} else {
					lastGoodValueOfEachIndex[index] = timeSlot[index];
				}
			}

			if (realizeGap(timeSlot[0], "middle")) {
				timeSlotIndex++;
			}

			lastDate = timeSlot[0];
		}

		if (lastDate != null) {
			//if (divCache.graphOptions.upToDate) {
			//	realizeGap(lastDate.addMinutes(divCache.graphOptions.gapInMinutes), "end");
			//} else {
				realizeGap(lastDate.addSeconds(divCache.graphOptions.gapInSeconds), "end");
			//}
		}

	if (divCache.timeSlotArr.length > 1 && 
		divCache.timeSlotArr[divCache.timeSlotArr.length - 1].length <
		divCache.timeSlotArr[divCache.timeSlotArr.length - 2].length) {
		debugger;
	}
	//}
}

function addPrediction(graphDiv, alpha, beta, gamma, period, m) {
	var divCache = cacheByDiv[graphDiv.id];
	if (divCache.timeSlotArr.length == 0) return;

	// collect input
	var forecastInputBySeries = {};

	// TODO: don't consolidate stepping for all series lines
	var averageStep = NaN;
	var timeSamples = 0;
	var lastTime = NaN;

	for (var timeSlotIndex = 0; timeSlotIndex < divCache.timeSlotArr.length; ++timeSlotIndex) {
		var timeSlot = divCache.timeSlotArr[timeSlotIndex];
		var time = timeSlot[0];
		
		if (isNaN(lastTime)) {
			lastTime = time.getTime();
		} else if (timeSamples == 0) {
			averageStep = time.getTime() - lastTime;
			timeSamples = 1;
		} else {
			var step = time.getTime() - lastTime;
			averageStep = ((averageStep * timeSamples) + step) / (timeSamples + 1);
			timeSamples++;
			lastTime = time.getTime();
		}

		for (series in divCache.seriesFound) {
			var inputArr = forecastInputBySeries[series];
			if (inputArr == null) {
				inputArr = [];
				forecastInputBySeries[series] = inputArr;
			}

			var index = divCache.seriesFound[series].index;
			var val = timeSlot[index];
			if (!isNaN(val)) inputArr.push(val);
		}
	}

	if (lastTime == NaN) return;

	var isStackedGraph = divCache.graphOptions["stackedGraph"];

	// process forecast
	var newGraphData = [];
	var forecastOutputBySeries = {};
	for (series in divCache.seriesFound) {
		var inputArr = forecastInputBySeries[series];
		if (inputArr != null) {

			if (inputArr.length % period != 0) {
				inputArr = inputArr.splice(inputArr.length % period);
			}

			var forecastArr = forecast(inputArr, alpha, beta, gamma, period, m);
			forecastOutputBySeries[series] = forecastArr;

			for (valIndex in forecastArr) {
				val = forecastArr[valIndex];
				if (isStackedGraph && isNaN(val)) val = 0;

				timeSlotTime = new Date((valIndex * averageStep) + lastTime);
				newGraphData.push({t: timeSlotTime, forcedValue: val, n: series});
			}
		}
	}

	updateDrawnGraph(graphDiv, newGraphData, true);
	//forecast(forecastInput, 0.5, 0.4, 0.6, 4, 4);
}