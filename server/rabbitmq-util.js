var amqp = require('amqp');
var logger = require("./logger.js");
var configLib = require("./configuration.js");
var countersLib = require("./counter.js");
var measurements = require("./measurements.js");
var contextLib = require("./callContext.js");
var crayonId = countersLib.getCrayonId();

var connection = null;
var queueResult = null;
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

				var messageObj = null;
				try {
					messageObj = JSON.parse(message.data.toString("utf-8"));
				}
				catch (ex) {
					logger.error("Invalid message received from RabbitMQ: " + ex.stack);
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

connect();