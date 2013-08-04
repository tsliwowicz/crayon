#!/usr/bin/awk -f
BEGIN  {
} 

{
	# Calculate time key
	if (fullTime != $1) {
		hour=substr($1,12,2);
		hour=hour - (hour%3);
		if (hour < 10) hour="0"hour;
		timeKey=substr($1,0,11) hour;
		fullTime=$1
	}

	# Create folder
	if (createdServerDirs[timeKey $3] == null) {
		createdServerDirs[timeKey $3] = 1;
		cmd = "mkdir -p hours/" timeKey "/" $3;
		print "Executing " cmd;
		cmd | getline;
	}

	# Aggregate
	key=timeKey " " $2 " " $3 " " $4;
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

	for (key in S) {
		split(key,keyParts," ");

		#     time       name            server          component       
		print t[key] " " keyParts[2] " " keyParts[3] " " keyParts[4] " " S[key] " " N[key] " " M[key] " " m[key] > "hours/" keyParts[1] "/"  keyParts[3] "/" keyParts[4] ".@" suffix

		if (++linesFlushed % 100000 == 0) print "[progress] " (linesFlushed/1000) "K lines flushed"
	}
}