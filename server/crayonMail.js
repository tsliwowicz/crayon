var email = require("emailjs");
var logger = require("./logger.js");
var configLib = require("./configuration.js");
var countersLib = require("./counter.js");
var crayonId = countersLib.getCrayonId();

var server;

module.exports.connect = function(callback) {

	logger.info("Initializing mail service...");
	server = email.server.connect({
	   user:    "crayon", 
	   password:"", 
	   host:    "127.0.0.1", 
	   ssl:     false
	});

	send({
		text:    "Crayon instance just started on port " + crayonId, 
		subject: "Crayon Instance (" + crayonId + ") Initializing",
		callback: function(err, message) {
			if (server.ready) {
				logger.info("Mail service is ready");
				callback(null);
			} else {
				var error = "Could not connect to mail server. Please check that the configuration is correct";
				logger.error(error);
				throw new Error(error);
			}
		}
	});
}

function send(options) {
	var config = configLib.getConfig();

	server.send({
	   text:    options.text, 
	   from:    config.crayonReplyAddress, 
	   to:      (options.mailTo || config.defaultAlertReceipients.join(",")),
	   subject: options.subject
	}, function(err, message) { 
		if (err) {
			logger.error("Failed sending mail message: " + err);
		}

		if (options.callback) options.callback(err,message);
	});
}

module.exports.send = send;