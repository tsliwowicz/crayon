#!/usr/bin/awk -f
BEGIN  {
} 

{
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
		cmd | getline;
	}

	# Aggregate
	key=timeKey " " $2 " " $4 " " $5;
	t[key] = fullTime;
	S[key] += $3;
	N[key] += 1;
	prevM = M[key];
	if (prevM == null || prevM < $3) M[key] = $3;

	prevm = m[key];
	if (prevm == null || prevm > $3) m[key] = $3;

	if (++linesRead % 100000 == 0) print "[progress] " (linesRead/1000) "K lines processed"
} 

END { 
    linesFlushed = 0;

	for (key in S) {
		split(key,keyParts," ");

		outFile = "minutes/" keyParts[1] "/"  keyParts[3] "/" keyParts[4] ".@" suffix;
		outFiles[outFile] = 1;

		#     name            time   	 server          component       
		print keyParts[2] " " t[key] " " keyParts[3] " " keyParts[4] " " S[key] " " N[key] " " M[key] " " m[key] > outFile

		if (++linesFlushed % 100000 == 0) print "[progress] " (linesFlushed/1000) "K lines flushed"
	}

	for (key in outFiles) {
		print "[progress] Sorting " key;
		cmd = "sort " key " -o " key;
		cmd | getline;
	}
}