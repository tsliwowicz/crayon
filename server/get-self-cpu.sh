#ps -eo pcpu,cmd | 
exports COLUMNS=250
top -c -b -n 1 | awk '{$1=""; $2="";$3="";$4="";$5="";$6="";$7="";$8="";$10="";$11=""; print}' > ~/last-crayon-top
top -c -b -n 1 | awk '{$1=""; $2="";$3="";$4="";$5="";$6="";$7="";$8="";$10="";$11=""; print}' |
      egrep "(node)" | grep "port=" |
      egrep -v "(grep|sed)" | 
      sed -r 's|([0-9\.]*) node /var/monitoring/crayon-mongo/server/server.js --port=([0-9]+).*|crayon\2 \1|' |  
      sed -r 's|([0-9\.]*) /usr/bin/mongod.*| mongo \1|g' | 
      awk 'BEGIN {print "["} { print "{\"component\": \""$2"\", \"server\": \"-\", \"name\":\"crayon_cpu\", \"val\": "$1", \"time\": '$(date +%s)'}"} END {print "]"}' | 
      sed 's|\}|},|g' | tr '\n' ' ' | sed 's|, \]|]|g' > ~/last-crayon-self-result

      cat ~/last-crayon-self-result | curl -X POST -d @- http://myserver.somewhere.com:60000/addRaw
