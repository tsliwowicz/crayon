Crayon
======

(readme.md update in progress, first commit & last update on 2013-07-25).  

* Crayon is a _complete_ multiplatform monitoring and charting solution for large scale distributed applications. 
* Crayon is an _open source_ contributed by [Taboola][] and will remain free forever.
* Crayon's stack consists of [NodeJS][] as server, [MongoDB][] as storage and [dyGraphs][] as charting control. 
* Crayon is a smooth migration from old school monitoring systems such as [Munin][] (and soon [Graphite][])
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
* We can choose any aggregation `unit` from s/m/h/d (second, minute, hour, day)
* `names` is an array which can contain any amount of Metric names.
* `servers` is also omitted. We will get results from all servers.
* `components` is also omitted. We will get results from all components.
* `graphOpts` is the container for all the options regarding graph drawing.
* `graphOpts.lineStyles` allows applying graph options per Metric using a regex match.
* `aggregative` is one of Crayon's unique features. In this example, we want to draw the max value from each mintue.
* `width` I wouldn't even mention if it weren't for the "wholeLine" feature which binds the graph size to the window's.

Phew, There are so many... Just one more:  
Names of servers, components and Metrics can end with '%' like in SQL to indicate "all the names that being with"

[CodeMirror]: https://github.com/marijnh/CodeMirror
[JSHint]: https://github.com/jshint/jshint
[JSBeautifier]: https://github.com/einars/js-beautify

What's your roadmap ?
---------------------

We've just started and this is the first version we're uploading here.  
asdfasdfasdfasdf

What are my alternatives ?
--------------------------

asdfasdfasd

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

2013-07-26 - 
* Fixed Hide bug not working on names with "-" in munin plugin

2013-07-25 - 
* *First commit*