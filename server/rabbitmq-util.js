var amqp = require('amqp');
var fs = require('fs');
var logger = require("./logger.js");
var configLib = require("./configuration.js");
var countersLib = require("./counter.js");
var measurements = require("./measurements.js");
var contextLib = require("./callContext.js");
var crayonId = countersLib.getCrayonId();

var saveLastErrorFileForDebug = true;
var connection = null;
var queueResult = null;
var rabbitMQMessagesCounter = countersLib.getOrCreateCounter(countersLib.systemCounterDefaultInterval, "rabbitMQ messages", "crayon");

function connect() {
	var config = configLib.getConfig();
	if (!config.rabbitMQConnection) {
		return;
	}

	logger.info("Initializing rabbit mq listener (" + JSON.stringify(config.rabbitMQConnection) + ")");
	connection = amqp.createConnection(config.rabbitMQConnection);

	// Wait for connection to become established.
	connection.on('ready', function () {
		if (queueResult != null) return;
		logger.info("Connected to RabbitMQ server, connecting to queue...");

		// Use the default 'amq.topic' exchange
		queueResult = connection.queue(config.rabbitMQQueue || 'crayon-server', {passive: true, durable: true, exclusive: true}, function(q){
			logger.info("Connected to RabbitMQ queue");

			// Receive messages
			q.subscribe(function (message) {
				
				if (!message.data) {
					logger.error("RabbitMQ message does not contain data");
					return;
				}

				rabbitMQMessagesCounter.increment();

				var messageObj = null;
				var messageString = "";
				try {
					messageString = message.data.toString("utf-8");
					messageObj = JSON.parse(messageString);
				}
				catch (ex) {
					var firstItem = "[message is null]";
					if (messageString) {
						firstItem = "[no first item. Message len=" + messageString.trim().length + "]"
						var endOfFirstItem = messageString.indexOf("}");
						if (endOfFirstItem > 0 && endOfFirstItem < 3000) {
							firstItem = messageString.substring(0,endOfFirstItem);

							if (saveLastErrorFileForDebug) {
								fs.writeFile("lastRabbitMQError.log", messageString, function(err) {
								    if(err) {
								        logger.error("Failed saving last RabbitMQ error: " + err);
								    }
								}); 

								fs.writeFile("lastRabbitMQError_ex.log", ex.stack, function(err) {
								    if(err) {
								        logger.error("Failed saving last RabbitMQ exception: " + err);
								    }
								}); 

								saveLastErrorFileForDebug = false;
							}

						} else {
							if (messageString.trim() == "") {
								firstItem += "[message is empty]";
							} else {
								var len = 300;
								if (messageString.trim().length < 300) len = messageString.trim().length;
								firstItem += "[first } loc is " + endOfFirstItem + ", first 300 chars: "  + messageString.trim().substring(0,len) + " ]"
							}
						}
					}
					logger.error("Invalid message received from RabbitMQ: " + ex.stack + "\nAttempting to get first item: " + firstItem);
					return;
				}

				// rabbitMQ messages
				try {
					var callContext = mockCallContext(
						"http://localhost/addRaw", 
						function() {
							// completed request
						},
						messageObj
						);


					measurements.addRaw(callContext);
					//logger.info(messageObj);
				}
				catch (ex) {
					logger.error("Error handling RabbitMQ message: " + ex.stack);
				}
			});
		});
	});
}

module.exports.disconnect = function() {
	connection.end();
}

function mockCallContext(requestUrl, onEnd, args) {
	var me=this;
	var mockRequest = {url: requestUrl};
	var mockResponse = { 
		writeHeader: function(code, headers) {
			me.headers=headers;
			me.code = code;
		},
		write: function(body,encoding) {
			me.body = body;
			me.encoding = encoding;
		},
		end: function() {
			onEnd();
		}
	};
	var callContext = new contextLib.CallContext(mockRequest, mockResponse);
	callContext.parseArgs(function() {});
	if (args != null) callContext.args = args;
	callContext.verbose = false;
	return callContext;
}

module.exports.connect = connect;

//connect();