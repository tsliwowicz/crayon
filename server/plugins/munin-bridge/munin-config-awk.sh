#!/usr/bin/awk -f

# USAGE:
# cd <dir with munin plugins>
# for f in $(ls); do echo "multigraph $f"; munin-run $f config; done | awk -v host=$(hostname -s) -F"[. ]" -f <path to this file>
#
# OUTPUT:
# a JSON object describing the configuration of this host. Save it to <$(hostname -f).json>

function shift() 
{
	$1="";
	gsub(/^ /, "", $0);
}

function closePendingSeries(addComma)
{
	if (pendingSeriesName == null) return;
	
	pendingGraphJson=pendingGraphJson" \""pendingSeriesName"\": {"
	for (propertyName in series_properties) { 
		pendingGraphJson=pendingGraphJson"\""propertyName"\": \"" series_properties[propertyName] "\",";
	}
	gsub(/,$/,"",pendingGraphJson)
	
	pendingGraphJson=pendingGraphJson" }"
	if (addComma == 1)pendingGraphJson=pendingGraphJson","
	pendingSeriesName = null;
}

function closeGraph(addComma)
{
	graph_properties["graph_server"] = host;
	pendingGraphJson=pendingGraphJson" }, "
	
	for (propertyName in graph_properties) { 
		pendingGraphJson=pendingGraphJson"\""propertyName"\": \"" graph_properties[propertyName] "\",";
	}
	gsub(/,$/,"",pendingGraphJson)
	pendingGraphJson=pendingGraphJson" }";
	if (addComma == 1)pendingGraphJson=pendingGraphJson","
	print pendingGraphJson
	pendingGraphJson = null;
}

BEGIN  {
	print "["
} 

{
	if (NF == 0) next; # skip empty lines
	
	if (pendingGraphJson == null) {
		pendingGraphJson = "{ \"series\": {"
	}
	
	if (index($1,"graph_") == 1) {
		propertyName=$1
		shift();
		gsub(/\"/, "\\&quot;", $0);
		graph_properties[propertyName]=$0
	} else if ($1 == "multigraph") {
		if (pendingSeriesName != null) {
			closePendingSeries(0);
			closeGraph(1);
			delete series_properties;
		}
		shift();
		delete graph_properties;
		graph_properties["graph_name"]=$0
	} else {
		
		if (pendingSeriesName != $1) {
			closePendingSeries(1);
			pendingSeriesName = $1
			delete series_properties;
		}
		
		shift();
		propertyName=$1
		shift();
		gsub(/\"/, "\\&quot;", $0);
		series_properties[propertyName]=$0
	}
} 

END { 
	closePendingSeries(0);
	closeGraph(0);
	print "]"
}