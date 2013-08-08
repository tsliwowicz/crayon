#!/usr/bin/awk -f
BEGIN  {
} 

{
	# Calculate time key
	if (fullTime != $2) {
		timeKey=substr($2,0,13); #hour;
		fullTime=$2
	}

	# Create folder
	if (createdServerDirs[timeKey $3] == null) {
		createdServerDirs[timeKey $3] = 1;
		print "Row with different time " $0
		cmd = "mkdir -p hours/" timeKey "/" $3;
		print "Executing " cmd;
		cmd | getline;
	}

	# Aggregate
	key=timeKey " " $1 " " $3 " " $4;
	t[key] = fullTime;
	S[key] += $5;
	N[key] += $6;
	prevM = M[key];
	if (prevM == null || prevM < $7) M[key] = $7;

	prevm = m[key];
	if (prevm == null || prevm > $8) m[key] = $8;

	if (++linesRead % 100000 == 0) print "[progress] " (linesRead/1000) "K lines processed"
} 

END { 
    linesFlushed = 0;

	print "[progress] Sorting keys"
    n = asorti(S, dest);
    for (i = 1; i <= n; i++) {
        key = dest[i];
		split(key,keyParts," ");

		outFile = "hours/" keyParts[1] "/"  keyParts[3] "/" keyParts[4] ".@" suffix;
		outFiles[outFile] = 1;

		#     name       	  time       server          component       
		line=keyParts[2] " " t[key] " " keyParts[3] " " keyParts[4] " " S[dest[i]] " " N[key] " " M[key] " " m[key];
		print line > outFile;

		if (++linesFlushed % 100000 == 0) print "[progress] " (linesFlushed/1000) "K lines flushed"
	}

#	for (key in outFiles) {
#		print "[progress] Sorting " key;
#		cmd = "sort " key " -o " key;
#		cmd | getline;
#	}
}