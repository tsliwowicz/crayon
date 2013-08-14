var amqp = require('amqp');
var fs = require('fs');
var logger = require("./logger.js");
var configLib = require("./configuration.js");
var countersLib = require("./counter.js");
var measurements = require("./measurements.js");
var contextLib = require("./callContext.js");
var zlib = require('zlib');

var crayonId = countersLib.getCrayonId();

var saveLastErrorFileForDebug = true;
var connection = null;
var queueResult = null;
var rabbitMQMessagesCounter = countersLib.getOrCreateCounter(countersLib.systemCounterDefaultInterval, "rabbitMQ messages", "crayon");

function handleMessage(buff) {
	var messageObj = null;
	var messageString = "";
	try {
		messageString = buff.toString("utf-8");
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
		var callContext = contextLib.mockCallContext(
			"http://localhost/addRaw", 
			function() {
				// completed request
			},
			messageObj
			);


		callContext.body = messageString;
		callContext.provider = "rabbitMQ"
		measurements.addRaw(callContext);
		//logger.info("Got new message from queue");
	}
	catch (ex) {
		logger.error("Error handling RabbitMQ message: " + ex.stack);
	}
}

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

				if (message.data[0] == 0x1f && message.data[1] == 0x8b) {
					try {
						zlib.gunzip(message.data, function(err, uncompressedMsgBuff) {
					 		if (err) {
					 			logger.error("failed gunzipping RabbitMQ message: " + err);
					 			return;
					 		}
					 		
					 		handleMessage(uncompressedMsgBuff);
					 		return;
					 	});
					} catch (ex) {
						logger.error("Error decompressing RabbitMQ message: " + ex.stack);
						return;
					}
				} else {
					handleMessage(message.data);
				}				
			});
		});
	});
}

module.exports.disconnect = function() {
	connection.end();
}

module.exports.connect = connect;

//connect();