// In the format 
// var groups = { groupName: [ hostnames in short format ] }
var groups = {
	"FDBs": ["Combined","csa8","csa9","csa10","earth1","earth3","earth4","earth5","earth6","earth7","earth8",
		"earth101","earth102","earth103","earth104","earth201","earth202","earth203","earth204","macron1","master-db"],
	"TRC-IL": ["prod2-f1","prod2-f2","prod2-f3","prod2-f4","prod2-f5","prod2-f6","prod2-f7","prod2-f8","prod2-f9","prod2-f10","prod2-f11","prod2-f13","prod2-f14"],
	"Backend": ["prod2-b4","prod2-b5","prod2-b6","wood3","wood4"],
	"TRC-US": ["water101","water102","water103","water104","water105","water106","water107","water108","water109","water110","water111","water112",
		"water201","water202","water203","water204","water205","water206","water207","water208","water209"],
	"Benchmark": ["prod2-t1","prod2-t2","prod2-t3","prod2-t4","prod2-t5","prod2-t6","earth2","fog1"],
	"Administration": ["void","void2","void102","void101","void1","hal1","www.taboola.com"],
	"Gateways": ["air1","air2","air101","air102","air202","air201"],
	"Cassandra": ["csa3","csa4","csa5","csa6","csa7","fire10","fire11","fire110","fire111","fire112","fire114","fire12","fire13","fire2",
		"fire201","fire202","fire203","fire204","fire205","fire206","fire207","fire208","fire3","fire4"],
	"MasterDB": ["backend-db1"],
	"Hypervisors": ["bucket1"],
	"Elasticsearch": ["es1", "es2"],
	"IMG-SRC": ["img-src1", "img-src2", "img-src3"],
	"Munin": ["lava3"],
	"Cisco_Switches": ["192.168.10.8", "192.168.10.9"],
	"Ops": ["lava2","lava201","eye101"],
	"Switches": ["192.168.10.5", "192.168.10.6"],
	"NetApp": ["storage2"],
	"Storage": ["storage3"],
}

var graphList = [];
var byServers = {};
var byCategory = {};

var graphListUpdated = function(callback) {
	for (n in graphList) {
		var graph = graphList[n];
		var server = graph["graph_server"];
		var category = graph["graph_category"];
		
		if (!byServers[server]) byServers[server] = [];
		byServers[server].push(graph);
		
		if (!byCategory[category]) byCategory[category] = [];
		byCategory[category].push(graph);
	}
	
	console.log(byServers);
	console.log(byCategory);
	
	if (callback) callback();
}

var updateGraphList = function(callback) {
	$.ajax({
		url: "getMuninConfig",
		dataType: 'json',
		success: function(gl) {
			graphList = gl;
			graphListUpdated(callback);
		}
	});
}


// data-fnordmetric="timeseries"
// data-since="-10minutes"
// data-until="now"
// data-height="200px"
// data-y-max="50"
// data-chart-style="area"
// data-legend="on"
// data-cardinal="off"
// data-gauges="total_sales-sum-10,sales_per_minute"
// data-autoupdate="1"
// 
//--base 1024			/		--base 1000
//--alt-autoscale      
//--logarithmic		
//--lower-limit 0 	/ 		-l 0
//--upper-limit 100 	/		-u 100 
//--rigid				/		-r			(force limits)
//--vertical-label seconds
//
//	if ($1 == "graph_title") {
//		shift();
//		graph_title=$0;
//	} else if ($1 == "graph_order") {
//		shift();
//		graph_order=$0; 
//	} else if ($1 == "graph_args") {
//		shift();
//		graph_args=$0; 
//	} else if ($1 == "graph_info") {
//		shift();
//		graph_info=$0; 
//	} else if ($1 == "graph_vlabel") {
//		shift();
//		graph_vlabel=$0; 
//	} else if ($1 == "graph_category") {
//		shift();
//		graph_category=$0; 
//	} else if ($1 == "graph_printf") {
//		shift();
//		graph_printf=$0
//	} else if ($1 == "multigraph") {
//		shift();
//		multigraph=$0		
//	} else if ($1 == "graph_total") {
//		# Disabled in munin
//	} else if ($1 == "graph_period") {
//		graph_period=$2; 		
//	} else if ($1 == "graph_scale") {
//		graph_scale=$2; #yes no
//	} else if ($1 == "graph_width") {
//		graph_width=$2
//	} else if (index($1,"graph_") == 1) {
//		print "WARN: Unknown graph directive (skipped): " $0;
// field.graph yes no 
// field.min ## 
// field.max ##
// field.label free text
// field.info free text
// field.type GAUGE COUNTER DERIVE
// field.draw  contains STACK or AREA --> area // else line, could have line width
// field.cdef delay,1000,/ 
// field.colour 00aaaa
// field.warning min:max, min: or :max ?? or just a scalar
// field.critical min:max, min: or :max ?? or just a scalar	
