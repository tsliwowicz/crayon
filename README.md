Crayon
======

(readme.md update in progress, last update on 2013-08-07).

* Crayon is a _complete_ multiplatform monitoring and charting solution for large scale distributed applications. 
* Crayon is an _open source_ contributed by [Taboola][] and will remain free forever.
* Crayon's stack consists of [NodeJS][] as server, file system as storage and [dyGraphs][] as charting control. 
* Crayon aims to be at least as scalable and flexible as graphite.

Screenshots: 
* [Crayon System Dashboard][] - Where we get insight on what's going inside crayon  
* [Dashboard Designer][] - Where we do our magic and build our mighty informative graphs  
* [Munin Plugin][] - Where we view our good old munin dashboard but in a new and cool way  

Also, be sure to visit the [Mailing List] if you have any question.

[Mailing List]: https://groups.google.com/forum/#!forum/crayon-mailing-list
[Taboola]: http://www.taboola.com
[NodeJS]: http://nodejs.org
[MongoDB]: https://github.com/mongodb/mongo
[dyGraphs]: http://dygraphs.com
[Graphite]: https://github.com/graphite-project
[Munin]: http://munin-monitoring.org/
[Crayon System Dashboard]: https://raw.github.com/shai-d/crayon/master/docs/images/CrayonSystemDashboard.png
[Dashboard Designer]: https://raw.github.com/shai-d/crayon/master/docs/images/DashboardDesigner.png
[Munin Plugin]: https://raw.github.com/shai-d/crayon/master/docs/images/MuninDashboard.png

What does it do ?
-----------------

* Crayon provides a an API for storing/getting metrics, a server for processing them and a website for viewing them.
* Crayon provides a JSON DSL for defining graphs with well over a hundred keywords (e.g. logarithmic graphs, delta graphs, etc.)
* Crayon supports realtime analytics up to subsecond latancy as well as aggregated information with configurable retention.
* Crayon aggregates analytics in multiple ways (e.g. Max, Min, Sum, Average, Count of samples, etc.)
* Crayon graphs are fully interactive with zooming and auto updating without any extra configuration (with image export supported)
* Crayon can be fed with multiple metrics at once to improve performance or even already aggregated metrics if aggregate them yourself
* Crayon performs programmable realtime monitoring with json alert definitions and mail notification using [emailjs][]
* Crayon integrated with third parties for getting metrics (besides the HTTP interface), for example the queuing system [RabbitMQ][]
* Crayon provides multiple themes for your convinience

[emailjs]: https://github.com/eleith/emailjs
[RabbitMQ]: https://github.com/postwait/node-amqp

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
* `/find` - For querying metrics using `GET` arguments (e.g. the method is fed with a datasource json object)

How much is large scale ?
-------------------------

Of course large scale definition differs from one to the next.  
In crayon, your scale depends on your distribution of data, but it may reach millions of metrics per minute.

Our setup includes:  
* `NGINX` - An open source balancer layer before NodeJS running on port 60000
* `Crayon Job Manager NodeJS` - Crayon service running on port 54320 and does aggregations (started with `--jobmanager`)
* `Crayon NodeJS` - 5 Crayon services running on ports 54321-54325 receive metrics from NGINX
* `Crayon NodeJS` - 1 Crayon service running on port 54333 for UI responsiveness (started with `--uiOnly`)

(Refresh if the image doesn't load, it's a GitHub thing)  
![alt tag](https://raw.github.com/shai-d/crayon/master/docs/images/Bemchmark.png)

What's the graph definition language ?
--------------------------------------

Every graph in Crayon, as well as every graph, has a "code" button. Clicking on it shows the "code-behind" in Crayon's graph editor.
Crayon's graph editor is a rich editor based on [CodeMirror][] with [JSBeautifier][] formatting and [JSHint][] validation. We've also designed a nice auto-complete that has icons and help for every option with well over a hundred options for graph design. To give you a taste of how simple it is, here is the graph definitions for the benchmark image above:

```javascript
{
    "dataSources": [{
        "from": "last 30 minutes",
        "unit": "r",
        "name": "Inserts",
	    "tailSecondsInterval": 60
	}],
	"calculatedDataSources": [{
            "match": {
                "name": ".*"
            },
            "name": "Total Inserts",
            "function": "sum",
            "insteadOfMatches": true
    }],
    "graphOpts": {
        "fillGraph": true,
        "aggregative": "max",
        "stackedGraph": true,
        "title": "Inserts Per Second (live)",
		"noLegend": true,
        "width": "wholeLine",
        "height": 100
    }
}
```

* Note how the `from` field understands free text
* Note that there is no `to` field, this means we want everything until now
* We can choose any aggregation `unit` from 'r','m','h','d' (second, minute, hour, day)
* `name` is a regex of Metric names.
* `server` (wildcard) is also omitted. We will get results from all servers.
* `component` (wildcard) is also omitted. We will get results from all components.
* `tailSecondsInterval` indicates we want this graph to update every 60 seconds.
* `graphOpts` is the container for all the options regarding graph drawing.
* `graphOpts.lineStyles` allows applying graph options per Metric using a regex match.
* `aggregative` is one of Crayon's unique features. "Max" means we want the max value from each minute.
* `width` I wouldn't even mention if it weren't for the "wholeLine" feature which binds the graph size to the window's.

Phew, There are so many... be sure to check out the screen shots to see a few more cool things.

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
   a. `yum install nodejs npm` - NodeJS and its download manager  (mongo is not in use anymore)  
   b. `npm install cityhash` - Google hashing library wrapper for NodeJS  
   c. `npm install zlib` - Compression library for browser-node communication  
   d. `npm install glob` - Helper file system library for munin plugin  
   e. `npm install emailjs` - Allows sending mail notifications on alerts  
   f. `npm install amqp` - Allows getting metrics from rabbitmq  
   g. `npm install mawk` - Used for file system aggregation (faster than gawk)  
  
2. (deprecated: you can skip this step, used to be mongo installation but we're not using mongo anymore)  
3. Clone the git to your machine (either download or use the `git` command line).  
4. Go to the crayon server directory (Under root which is the one with the readme.md file)  
5. Mount the minutes_ram folder to your RAM with: `mount -t tmpfs -o size=16g tmpfs minutes_ram`
6. Go into the server directory and run the crayon service `node server.js --port=54320 --jobmanager`
7. Run another crayon service just because it's easy `node server.js --port=54321`    
8. Web interface should be available now on  `http://<serverName>:54321/`   
 
```javascript
   Note: You can run as many instances as youd like (on different ports of course)
         One of these instances should be started with "--jobmanager" to indicate
		 it is responsible for periodic tasks such as archiving and aggregation.
		 it is also recommended to use a UI dedicated instance with "--uiOnly" since 
		 node is single threaded and we want the UI to be as responsive as possible
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

* Delta graphs (or 'derivative' graphs) are displayed incorrectly when shown after aggregation within the time they were reset. The delta's get aggregated and if resets occur within the aggregation, the resulting numbers are completely useless. Up to a minute or hour aggregation it looks fine.

Stack and Licenses
------------------

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
*Used for communicating with Mongo DB*
* [npm] emailjs (MIT) - 
*Used for sending mail for alerts*
* [npm] amqp (BSD)
*Used for getting metrics from RabbitMQ*
* Nostradamus (MIT)
*Used for predicting metric future values*
* mawk (MIT)
*Used for faster aggregation on the filesystem*
* jQuery (MIT) - 
*Used throughout the client side javascripts*

[Nostradamus]: https://github.com/thick/Nostradamus.js

Change Log
----------

2013-08-07 -  
* Added feature click on header opens a large graph
* Added export to CSV menu option on all graphs
* Added support for variables with url provider for content

2013-08-06 -  
* Fixed support for firefox & changed layouts to be non tabular  
* Added more keywords  
* Added language reference main tab
* Added DOCTYPE to all htmls and fixed layout problems
* Added compression support for rabbitMQ

2013-08-05 - 
* Adjusted hour aggregation
* Added combined option to munin plugin
* Added more keywords  

2013-08-04 - 
* Complete re-write using filesystem for higher performance
* Added time shifting properties
* Added hour aggregation
* Documented a lot of properties
* Got rid of mongo
* Added more keywords  

2013-07-29 - 
* Added a simple prediction algorithm

2013-07-28 - 
* Added integration with RabbitMQ
* Fixed problems with deltas
* Added more keywords  

2013-07-27 - 
* Added the graph context menu and get image operation
* Added monitoring

2013-07-26 - 
* Added the entire JSON programmable dashboard UI
* Added theming

2013-07-25 - 
* *First commit*