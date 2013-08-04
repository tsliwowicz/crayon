#!/usr/bin/awk -f
BEGIN  {
} 

{
	# Calculate time key
	if (fullTime != $1) {
		timeKey=substr($1,0,15);
		fullTime=$1
	}

	# Aggregate
	key=timeKey " for_regex " $4 " " $5;
	t[key] = fullTime;
	S[key] += $3;
	N[key] += 1;
	prevM = M[key];
	if (prevM == null || prevM < $3) M[key] = $3;

	prevm = m[key];
	if (prevm == null || prevm > $3) m[key] = $3;
} 

END { 

	for (key in S) {
		split(key,keyParts," ");

		#     time       name            server          component       
		print t[key] " " keyParts[2] " " keyParts[3] " " keyParts[4] " " S[key] " " N[key] " " M[key] " " m[key]
	}
}