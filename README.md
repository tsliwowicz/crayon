Crayon
======

(readme.md update in progress, first commit & last update on 2013-07-25).  

* Crayon is a _complete_ multiplatform monitoring and charting solution for large scale distributed applications. 
* Crayon is an _open source_ contributed by [Taboola][] and will remain free forever.
* Crayon's stack consists of [NodeJS][] as server, [MongoDB][] as storage and [dyGraphs][] as charting control. 
* Crayon is a smooth migration from old school monitoring systems such as [Munin][] (and soon [Graphite][])
* Crayon runs both on linux and on windows, simply because NodeJS and MongoDB does :)
* Crayon is _unique_ in many ways beyond its stack. Some of its features are unavailable in most of today's modern charting systems.

[Taboola]: http://www.taboola.com
[NodeJS]: http://nodejs.org
[MongoDB]: https://github.com/mongodb/mongo
[dyGraphs]: http://dygraphs.com
[Graphite]: https://github.com/graphite-project
[Munin]: http://munin-monitoring.org/

What does it do ?
-----------------

* Crayon provides a an API for storing/getting metrics, a server for processing them and a website for viewing them.
* Crayon provides a JSON DSL for defining graphs with well over a hundred keywords (e.g. logarithmic graphs, delta graphs, etc.)
* Crayon supports realtime analytics up to subsecond latancy as well as aggregated information with configurable retention.
* Crayon aggregates analytics in multiple ways thanks to Mongo DB's map reduce (e.g. Max, Min, Sum, Average, Count of samples, etc.)
* Crayon graphs are not a picture, they are fully interactive with zooming and auto updating without any extra configuration
* Crayon can be fed with multiple metrics at once to improve performance or even already aggregated metrics if aggregate them yourself

What's the REST ? (API)
-----------------------

Crayon has a simple HTTP interface for storing and querying metrics by using JSON.  
A metric has the following fields:  

* `name` - The name of the Metric (e.g. "Inserts Count /s")
* `time` - The time of the Metric (e.g. "2013-07-25T10:10:23Z" or epoch time)
* `val` - Any number javascript can handle will do (e.g. "23.12")
* `server` - *optional* The server this metric belongs to (e.g. "prod-us-ny3")
* `component` - *optional* The component this metric belongs to (e.g. "Database")
* a simple metric: `[{name:'Inserts',time:'2013-07-25T10:10:23Z',val:1}]`

The 2 most important API's are:
* `/addRaw` - For Feeding Crayon with metrics using `POST` (e.g. the simple metric above)
* `/find` - For querying metrics using `GET` arguments (e.g. "query" for mongo query, "fields" for projection and alike)
* `/matchSeriesName` - For query (e.g. "http://prod-us-ny3/matchSeriesName?regex=cpu" )

How much is large scale ?
-------------------------

Of course large scale definition differs from one to the next.  
Our target was a Million or more metrics per minute on 1 node.  
We were making sure we can always scale out by adding more instances.  

Our setup includes:  
* `NGINX` - An open source balancer layer before NodeJS running on port 60000
* `Crayon Job Manager NodeJS` - Crayon service running on port 54320 and does aggregations
* `Crayon NodeJS` - Crayon service running on port 54321 receives metrics from NGINX
* `Crayon NodeJS` - Crayon service running on port 54322 receives metrics from NGINX
* `MongoDB` - Unsharded Mongo DB with SSD storage for data files and proper indexes ensured

![alt tag](https://raw.github.com/shai-d/crayon/master/docs/images/Bemchmark.png)

What's that code button on the graph widget ?
---------------------------------------------

That "code" button on the graph widgets open up the graph "code-behind" in Crayon's graph editor. Crayon's graph editor is a rich editor based on [CodeMirror][] with [JSBeautifier][] formatting and [JSHint][] validation. We've also designed a nice auto-complete that has icons and help for every option with well over a hundred options for graph design. To give you a taste of how simple it is, here is the graph definitions for the benchmark image above:

```javascript
{
    "from": "last 30 minutes",
    "unit": "m",
    "names": ["Inserts"],
	"tailSecondsInterval": 60,
    "graphOpts": {
        "fillGraph": true,
        "aggregative": "max",
        "stackedGraph": true,
        "title": "Max Insert Time (ms)",
		"noLegend": true,
        "width": "wholeLine",
        "height": 100
    }
}
```

* Note how the `from` field understands free text
* Note that there is no `to` field, this means we want everything until now
* We can choose any aggregation `unit` from 's','m','h','d' (second, minute, hour, day)
* `names` is an array which can contain any amount of Metric names.
* `servers` is also omitted. We will get results from all servers.
* `components` is also omitted. We will get results from all components.
* `tailSecondsInterval` indicates we want this graph to update every 60 seconds.
* `graphOpts` is the container for all the options regarding graph drawing.
* `graphOpts.lineStyles` allows applying graph options per Metric using a regex match.
* `aggregative` is one of Crayon's unique features. "Max" means we want the max value from each minute.
* `width` I wouldn't even mention if it weren't for the "wholeLine" feature which binds the graph size to the window's.

Phew, There are so many... Just one more:  
Names of servers, components and Metrics can end with '%' like in SQL to indicate "all the names that being with"

[CodeMirror]: https://github.com/marijnh/CodeMirror
[JSHint]: https://github.com/jshint/jshint
[JSBeautifier]: https://github.com/einars/js-beautify

What's your roadmap ?
---------------------

We've just started and this is the first version we're uploading here.  
I'll try to lay out a list of TODO's here (and update it occasionaly)  

* We should add Monitoring on top of the values
* We really want to add configurable Soft & Adaptive Thresholding algorithms
* We should set up a site with a lot more documentation
* We should create a migration plugin from graphite (We already have the one for munin)
* We should set up a demo site for people to test Crayon online

What are my alternatives ?
--------------------------

There are a lot of cloud services and payed services. I'm focusing on the Free & Open Source genre:  

* [Munin][] - the old school stack (Munin-Node/Munin-Async/Munin-Server). Major Con: Updates only once in 5 minutes.
* [Graphite][] - the most common solution today (Graphite/Carbon/Whisper). Major Con: No REAL good and dynamic UI.
* [Cube][] - a new service with good API and only one unconfigurable UI ([Cubism][] horizon charts). Major Con: Very limited UI.
* [Fnordmetric][] - a new service with good API and configurable UI. Major Con: Ruby server doesn't handle a lot of data.

[Cube]: https://github.com/square/cubism/wiki/Cube
[Cubism]: http://square.github.io/cubism/
[Fnordmetric]: https://github.com/paulasmuth/fnordmetric

How do I run It ?
-----------------

Right now there are no RPMs for Crayon.  
Since it's only javascript, there's also no need for compilation.  

1. Get the prerequisits:  
   a. `yum install nodejs npm mongo` - NodeJS MongoDB and its download manager  
   b. `npm install cityhash` - Google hashing library wrapper for NodeJS  
   c. `npm install zlib` - Compression library for browser-node communication  
   d. `npm install mongodb` - Native driver for NodeJS to communicate with MongoDB  
   e. `npm install glob` - Helper file system library for munin plugin  

2. Setting up mongo:  
   a. `service mongod start` - Starts the MongoDB storage layer  
   b. `mongo` - A command which opens the mongo shell  
   c. `use crayon` - Switches to database "crayon" which is the name we'll use  
   d. `db.addUser("mng","mng");` - Adds our default user to the database  
   e. Do the following 3 lines with: `samples_sec`, `samples_min`, `samples_hour`, `samples_day`  
   f. `db.samples_XXX.ensureIndex({t:1});` - Make selections by time fast  
   g. `db.samples_XXX.ensureIndex({s:1, t:1});` - *optional* Make selections by server and time fast  
   h. `db.samples_XXX.ensureIndex({n:1, t:1});` - *optional* Make selections by name and time fast  
    
3. Clone the git to your machine (either download or use the `git` command line).  
4. Go to the crayon root directory (The one with the readme.md file)  
5. Run the crayon service with `node server\server.js --port=54321 --jobmanager`    
6. Web interface should be available now on  `http://<serverName>:54321/`   
 
```javascript
   Note: You can run as many instances as youd like (on different ports of course)
         One of these instances should be started with "--jobmanager" to indicate
		 it is responsible for periodic tasks.
```		 

How do I migrate from Munin ?
-----------------------------

Along with crayon, under the `server/plugins/` folders there is a folder called `munin-bridge`. This folder contains a few shell files which make the migration easier. 

* [Munin Config to JSON][] - Should be executed once. It is responsible for a one time conversion of "munin-run <your-files> config" to JSON. The resulting document should be saved in `munin-configs` folder under `munin-bridge` (where it is read by the server on restart or when a special plugin API has been called).
* [Munin Run to JSON][] - Should be executed every time we used to run munin-run and collect our metrics. This file is responsible for executing the plugins and posting the result to Crayon.
* [Munin Agent][] - Acts as a bash service which calls the [Munin Run to JSON][] at specified intervals. This shell file should be executed with `munin-agent init` by a service. It is listed in PS/TOP as "crayon-agent".

[Munin Config to JSON]:https://raw.github.com/shai-d/crayon/master/server/plugins/munin-bridge/munin-config-awk.sh
[Munin Run to JSON]:https://raw.github.com/shai-d/crayon/master/server/plugins/munin-bridge/munin-crayon-bridge.sh
[Munin Agent]:https://raw.github.com/shai-d/crayon/master/server/plugins/munin-bridge/munin-agent.sh

Are there any known issues ?
----------------------------

Like anything and especially like anything new, the answer is a hardcoded `yes;`.  
Here is a list of some of the things which are on my mind (I'll try to keep it updated):

* Archiving data on Mongo DB takes too long, every hour everything freezes for a minute or two due to mongo DB write lock. This happens even though we're using zero writeconcern and issuing only 1 bulk remove operation.
* Delta graphs (or 'derivative' graphs) are displayed incorrectly when shown after aggregation. The delta's get aggregated and if resets occur within the aggregation, the resulting numbers are completely useless. Up to a minute aggregation it looks fine.

Stack and Licenses
------------------

* Mongo DB (GNU AGPL v3.0) - 
*Used for the storage layer/engine*
* NodeJS (Apache) - 
*Used for the server itself*
* dyGraph (BSD) - 
*Used for rendering the graphs in the browser*
* Code Mirror (MIT) - 
*Used for syntax highlighting and formatting in editable text areas*
* JS Beautifier (MIT) - 
*Used for prettifying javascript in editable text areas*
* JSHint (MIT) - 
*Used for syntax correction in editable text areas*
* HTML2Canvas (MIT) - 
*Used for rasterizing graphs into downloadable images*
* [npm] cityhash (BSD) - 
*Used to hash Metric names before writing them to the database*
* [npm] zlib (BSD) - 
*Used by the http server for compressing response streams*
* [npm] glob (BSD) - 
*Used for the munin plugin to find munin configuration files*
* [npm] node-mongodb-native (Apache) - 
*Used for communicating with Mongo DB *
* jQuery (MIT) - 
*Used throughout the client side javascripts*

Change Log
----------

2013-07-25 - 
* *First commit*