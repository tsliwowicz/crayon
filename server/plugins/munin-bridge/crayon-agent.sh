# Configuration
SECONDS_INTERVAL=10		# Background checks interval
LOCATION_OF_BRIDGE=/var/monitoring/scripts/munin-crayon-bridge.sh

function start-thread() { exec -a "$1" bash -c "$0 $1" & }
function log() { echo -e "$(date '+%Y-%m-%d %H:%M:%S.%N' | cut -c -23) [$$] [$THREAD_NAME] $*"; }
function init() { exec -a "crayon-agent" bash -c "$0 service-loop $*"; }

function thread-init-block() {
	THREAD_NAME=$(ps -o cmd -p $$ | tail -1 | awk '{print $1}')
	log "Thread started"
}

function service-loop() {
	thread-init-block

	# make sure we kill child threads when we quit
	trap 'kill $(jobs -p)' EXIT
	
	# Run to keep threads from closing
	while [ 1 == 1 ]; do
		$LOCATION_OF_BRIDGE
		sleep $SECONDS_INTERVAL
	done
}

$*