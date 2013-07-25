var queryArgs = {};
(function () {
	var match,
		pl     = /\+/g,  // Regex for replacing addition symbol with a space
		search = /([^&=]+)=?([^&]*)/g,
		decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
		query  = window.location.toString().split("?")[1]||"";

	while (match = search.exec(query))
	   queryArgs[decode(match[1])] = decode(match[2]);
})();

var setHeader = function(name) {
	$("#frameHeader").get()[0].innerHTML = name;
}

var body = $("body");

/* CRAYON MAIN UI START */
body.append('<div id="titleHeader"><img src="/CrayonsSmall.png"><img src="/CrayonTitleSmall.png"></div>');
body.append('<div id="frameHeader" class="frameHeader"></div>');
body.append('<div id="ddblueblockmenu">' +
				'<div class="menutitle">General</div>' + 
				'<ul>' + 
					'<li><a href="/designer.html">Graph Designer</a></li>' + 
					'<li><a href="/config.html">Configuration</a></li>' + 
//					'<li><a href="/system.html">System Status</a></li>' + 
				'</ul>' + 
				'<div class="menutitle">Dasboards</div>' + 
				'<ul id="dashboardsUL">' + 
				'</ul>' +
				'<div class="menutitle">Help</div>' + 
				'<ul>' + 
					'<li><a href="/restAPI.html">Rest API</a></li>' +  
				'</ul>' +
			'</div>');

$.ajax({
	url: "/dashboards",
	dataType: 'json',
	success: function(result) {
		var ul = $("#dashboardsUL");
		for (i in result) {
			ul.prepend('<li><a href="' + result[i].uri + '">' + result[i].name + '</a></li>');
		}
	}
});

$.ajax({
	url: "/dashboards.conf",
	success: function(result) {
		var lines = result.split('\n');
		var ul = $("#dashboardsUL");

		for (var i = 0; i < lines.length; ++i) {
			var line = lines[i].trim();

			if (line.length == 0) continue;
			if (line[0] == "#") continue;

			var parts = line.split('=');
			if (parts.length < 2) continue;
			var name = parts[0].trim();
			var url = parts[1].trim();
			ul.prepend('<li><a href="/by-json.html?url=' + url + '">' + name + '</a></li>');
		}
	}
});

body.append('<div class="verticalRuler"></div>');

/* CRAYON MAIN UI END */

/* CRAYON ALERT START */
body.append('<div id="alertOverlay" class="overlay"><div id="crayonAlert">'+
			'<div id="crayonAlertUpperBar">Some Alert text</div>'+
			'<div id="crayonAlertText">Some alert text with long wrapping should go here because its usually a long text</div>'+
			'<div id="crayonAlertBottomBar">'+
			'	<span class="crayonButton" id="crayonAlertOK" onclick="alertOK()" style="float:right;">OK</span>'+
			'	<span class="crayonButton" id="crayonAlertCancel" onclick="alertCancel()" style="float:right;margin-right:10px">Cancel</span>'+
			'</div></div>');


var OK = 1;
var CANCEL = 0;
var alertCallback = null;
var showAlertOKOnly = function(title, text, callback) {
	crayonAlertCancel.style.display = "none";
	showAlertInternal(title, text, callback);
}
var showAlertOKCancel = function(title, text, callback) {
	crayonAlertCancel.style.display = "block";
	showAlertInternal(title, text, callback);
}

var showAlertInternal = function(title, text, callback) {
	alertCallback = callback;
	crayonAlertUpperBar.innerHTML = title;
	crayonAlertText.innerHTML = text;
	$("#alertOverlay").css("display", "block");
	setTimeout(function() { $("#alertOverlay").css("opacity", 0.98); }, 200);
}
var hideAlert = function() {
	if (progressInterval != null) clearTimeout(progressInterval);
	$("#alertOverlay").css("opacity", 0);
	setTimeout(function() { $("#alertOverlay").css("display", "none"); }, 200);
}

var alertOK = function() {
	hideAlert();
	if (alertCallback != null) alertCallback(OK);
}

var alertCancel = function() {
	hideAlert();
	if (alertCallback != null) alertCallback(CANCEL);
}

/* CRAYON ALERT END */

/* CRAYON PROGRESS OVERLAY  */
body.append('<div id="progressOverlay" class="overlay">' + 
				'<div class="progressText">Progress Text</div><br>' + 
				'<div class="meter animate">' + 
					'<span id="meterBar" style="width: 0%"><span>' + 
				'</div>' + 
			'</div>');

var setProgressText = function(text) {
	$(".progressText").get()[0].innerHTML = text;
}
var setProgressPercent = function(pct) {
	$("#meterBar").width(pct + "%");
}

var progressInterval;
var showLoadingGraphDataOverlay = function() {
	showOverlay();
	setProgressText("Loading Graph Data");
	var progressPct = 5;
	progressInterval = setInterval(function() {
		if (progressPct < 100) progressPct += 1;
		if (progressPct > 100) progressPct = 100;
		setProgressPercent(progressPct);

		if (progressPct == 100) {
			hideOverlay();
		}
	}, 100);
}

var showOverlay = function() {
	setProgressText("");
	setProgressPercent(0);
	$("#progressOverlay").css("display", "block");
	setTimeout(function() { $("#progressOverlay").css("opacity", 1); }, 200);
}

var hideOverlay = function() {
	if (progressInterval != null) clearTimeout(progressInterval);
	$("#progressOverlay").css("opacity", 0);
	setTimeout(function() { $("#progressOverlay").css("display", "none"); }, 200);
}
/* CRAYON PROGRESS END  */
