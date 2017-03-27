/*!
 * elogger
 * Copyright(c) 2014 Techunits
 * MIT Licensed
 */
exports = module.exports = function(type) {
	if(false !== type) {
		var morgan = require('morgan');
		logType = type || ":method:\t:date[web]\t:remote-addr :url HTTP/:http-version :status :res[content-length]";
		return morgan(logType);
	}
	else {
		return function(req, res, next) {
			next();
		};
	}
};

exports.debug = function(str, flag) {
	if(null == flag || true === flag) {
		//	debug color: Cyan
		console.log("\x1B[36m" + 'DEBUG: ' + "\t" + new Date() + "\t" + processInput(str) + "\x1B[39m");
	}
};

exports.info = function(str) {
	//	debug color: Default (White / Black)
	console.log('INFO: ' + "\t" + new Date() + "\t" + processInput(str));
};

exports.trace = function(str) {
	//	trace color: Grey
	console.error("\033[90m" + 'TRACE: ' + "\t" + new Date() + "\t" + processInput(str) + "\033[0m");
};

exports.warn = function(str) {
	//	warn color: Yellow
	console.log("\x1B[33m" + 'WARN: ' + "\t" + new Date() + "\t" + processInput(str) + "\x1B[39m");
};

exports.error = function(str) {
	//	error color: Red
	console.error("\033[31m" + 'ERROR: ' + "\t" + new Date() + "\t" + processInput(str) + "\033[0m");
};

function processInput(param) {
	if ('string' == typeof param) {
		return param;
	}
	else {
		return JSON.stringify(param);
	}
};
