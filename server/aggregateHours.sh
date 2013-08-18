#!/usr/bin/awk -f
BEGIN  {
} 

{
	# Calculate time key
	if (fullTime != $4) {
		timeKey=substr($4,0,13); #day;
		fullTime=$4
	}

	# Create folder
	if (createdServerDirs[timeKey $2] == null) {
		createdServerDirs[timeKey $2] = 1;
		cmd = "mkdir -p hours/" timeKey "/" $2;
		print "Executing " cmd;
		cmd | getline;
	}

	# Aggregate
	key=timeKey " " $1 " " $2 " " $3;
	prevVal = val[key];
	if (prevVal == null) {
		val[key] = fullTime " " $5 " " $6 " " $7 " " $8
	} else {
		split(prevVal,prevValParts," ");
        max=$7;
        min=$8;
        if (prevValParts[4] > max) max=prevValParts[4];
        if (prevValParts[5] < min) min=prevValParts[5];

        val[key] = fullTime" "(prevValParts[2]+$5)" "(prevValParts[3]+$6)" "max" "min;
	}

	if (++linesRead % 100000 == 0) print "[progress] " (linesRead/1000) "K lines processed"
} 

END { 
    linesFlushed = 0;

	print "[progress] Sorting keys"
    n = asorti(val, dest);
    for (i = 1; i <= n; i++) {
        key = dest[i];
		split(key,keyParts," ");
		split(val[key],prevValParts," "); 

		outFile = "hours/" keyParts[1] "/"  keyParts[3] "/" keyParts[4] ".@" suffix;

        #     name           server          component       time 				 sum				 count				 max				 min
		line=keyParts[2] " " keyParts[3] " " keyParts[4] " " prevValParts[1] " " prevValParts[2] " " prevValParts[3] " " prevValParts[4] " " prevValParts[5];
		print line > outFile;

		if (++linesFlushed % 100000 == 0) print "[progress] " (linesFlushed/1000) "K lines flushed"
	}
}