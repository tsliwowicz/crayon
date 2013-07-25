DIR_WITH_MUNIN_PLUGINS=$1
CRAYON_SERVER_AND_PORT=$2

[ -d "$DIR_WITH_MUNIN_PLUGINS" ] || exit;
cd $DIR_WITH_MUNIN_PLUGINS

HOST=$(hostname -s)
MS=$(date +%s)
echo "[" > ~/last-munin-result
for f in $(ls); do     
    munin-run $f | awk -v ms=$MS -v h=$HOST -v f=$f '{if ($1 == "multigraph") {$1=""; f=$0; gsub(/^ /, "", f);next} if (NF == 0) next; gsub(/\.value/,"",$1); print "{\"server\":\""h"\",\"name\":\""f"#"$1"\",\"val\":"$2",\"time\":"ms"},"}' | grep -v ":--," | egrep "\"val\":[0-9\.-]+"
done >> ~/last-munin-result
echo '{"server":"'$HOST'","name":"munin_bridge_runs","val": 1,"time":'$MS'} ]' >> ~/last-munin-result
curl -X POST -d @~/last-munin-result http://$CRAYON_SERVER_AND_PORT/addRaw