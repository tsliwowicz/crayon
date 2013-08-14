#!/usr/bin/awk -f
BEGIN  {
} 

{
	if ($1 == "never") {
	# Calculate time key
	if (fullTime != $1) {
		timeKey=substr($1,0,15);
		fullTime=$1
	}

	# Create folder
	if (createdServerDirs[timeKey $4] == null) {
		createdServerDirs[timeKey $4] = 1;
		cmd = "mkdir -p minutes/" timeKey "/" $4;
		print "Executing " cmd;
		#cmd | getline;
	}

	# Aggregate
	key=timeKey " " $2 " " $4 " " $5;
	prevVal = val[key];
	if (prevVal == null) {
		val[key] =fullTime " " $3 " " 1 " " $3 " " $3
	} else {
		split(prevVal,prevValParts," ");
	        max=$3;
	        min=$3;
	        if (prevValParts[4] > max) max=prevValParts[4];
	        if (prevValParts[5] < min) min=prevValParts[5];

        	val[key] = fullTime" "(prevValParts[2]+$3)" "(prevValParts[3]+1)" "max" "min;
	}
	}

	if (++linesRead % 100000 == 0) print "[progress] " (linesRead/1000) "K lines processed"
} 

END { 
    linesFlushed = 0;

	print "[progress] Sorting keys"
    n = asorti(val, dest);
    for (i = 1; i <= n; i++) {
        key = dest[i];
        split(val[key],prevValParts," ");
        
        split(key,keyParts," ");

		outFile = "minutes/" keyParts[1] "/"  keyParts[3] "/" keyParts[4] ".@" suffix;
		outFiles[outFile] = 1;

		#     name            time   	 server          component       
		line=keyParts[2] " " prevValParts[1] " " keyParts[3] " " keyParts[4] " " prevValParts[2] " " prevValParts[3] " " prevValParts[4] " " prevValParts[5];
#		print line  > outFile

		if (++linesFlushed % 100000 == 0) print "[progress] " (linesFlushed/1000) "K lines flushed"
    }


#	for (key in S) {
#		split(key,keyParts," ");
#
#		outFile = "minutes/" keyParts[1] "/"  keyParts[3] "/" keyParts[4] ".@" suffix;
#		outFiles[outFile] = 1;
#
#		#     name            time   	 server          component       
#		print keyParts[2] " " t[key] " " keyParts[3] " " keyParts[4] " " S[key] " " N[key] " " M[key] " " m[key] > outFile
#
#		if (++linesFlushed % 100000 == 0) print "[progress] " (linesFlushed/1000) "K lines flushed"
#	}
#
#	for (key in outFiles) {
#		print "[progress] Sorting " key;
#		cmd = "sort " key " -o " key;
#		cmd | getline;
#	}
}
