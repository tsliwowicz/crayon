// This file translates a date to a database string representation of that date
module.exports.getSecondBulk = function(t) {
	return t.toISOString().replace("T", " ").substring(0,19);
}

module.exports.getMinuteFromSecond = function(t) {
	return t.substring(0,16);
}

module.exports.getHourFromMinute = function(t) {
	return t.substring(0,13);
}

module.exports.getDayFromHour = function(t) {
	return t.substring(0,10);
}