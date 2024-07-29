var math = require('mathjs');
var lodash = require('lodash');
var report = require(__base + 'models').report;
var moment = require('moment');
var momentTimezone = require('moment-timezone');
var Promise = require('promise');
var unitPrefixObj = {};
var SparkAPIHelper = require('../routes/client/sparkapi');
const { log } = require('console');
const { number } = require('mathjs');
const sparkAPI = new SparkAPIHelper();

exports.getRealtimeData = function (request, cb) {
	var queryParameters = {};
	queryParameters.nodeId = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateTimeObject = momentTimezone.utc(toDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var dateTimeSlots = nodeTimeZoneSlotCalculation(fromDateTimeObject, toDateTimeObject);
	queryParameters.fromDate = momentTimezone.tz(fromDateTime, 'YYYY-MM-DD HH:mm:ssZ', userTimezoneSettings['timezone']).utc().format('YYYY-MM-DD HH:mm:ssZ')
	queryParameters.toDate = momentTimezone.tz(toDateTime, 'YYYY-MM-DD HH:mm:ssZ', userTimezoneSettings['timezone']).utc().format('YYYY-MM-DD HH:mm:ssZ')
	queryParameters.slot = [dateTimeSlots.fromSlot, dateTimeSlots.toSlot];
	report.findRealtimeData(queryParameters, function (err, data) {
		try {
			if (err) {
				var responseObj = {};
				responseObj.error = true;
				responseObj.reason = "Error: Unable to get data. Please try again!";
				return cb(null, responseObj);
			}
			var objData = { data: {} };
			if (!data || 0 == data.length) { return cb(null, objData); }
			var objReadings = {};
			for (var key in data) {
				var arrNodeData = JSON.parse(data[key].parameters_values);
				if ('undefined' === typeof objReadings[data[key].node_id]) {
					request.body.parameterId.forEach(function (parameter, index) {
						objReadings[data[key].node_id + '_' + parameter] = (arrNodeData[parameter]) ? parseFloat(arrNodeData[parameter]) : null;
					});
				}
			}
			objData['data'] = objReadings;
			return cb(null, objData);
		} catch (exception) {
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason = "Error: Unable to get data. Please try again!";
			return cb(null, responseObj);
		}
	});
};

exports.getCummulativeFifteenMinutesData = function (request, cb) {
	var queryParameters = {};
	queryParameters.nodeId = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var lastRecordDate = '';
	var toDateTimeObject = momentTimezone.utc(toDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	if (0 != request.body.readingGap) {
		('23:59' == toDateTimeObject.format('HH:mm')) ? toDateTimeObject.add(1, 'seconds').add(15, 'minutes') : toDateTimeObject.add(15, 'minutes');
		lastRecordDate = momentTimezone(toDateTimeObject).subtract(15, 'minutes').format('DD-MM-YYYY HH:mm') + ' - ' + toDateTimeObject.format('HH:mm');
	}
	queryParameters.fromDate = fromDateTimeObject.format('YYYY-MM-DD');
	queryParameters.toDate = toDateTimeObject.format('YYYY-MM-DD');
	var currentDateObj = momentTimezone.utc(momentTimezone.tz(userTimezoneSettings.timezone).format('YYYY-MM-DD HH:mm:ss') + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var currentDate = currentDateObj.format('YYYY-MM-DD');
	var promiseAry = [];
	var reqObj = { interval: request.body.interval, currentDate: currentDate };
	promiseAry.push(findReadingsByNode(reqObj['interval'], queryParameters));
	Promise.all(promiseAry).then(function (results) {
		try {
			var data = results[0];
			var objData = { data: {} };
			if (!data || 0 == data.length) { return cb(null, objData); }
			Promise.all([findNodeDataSettings(userTimezoneSettings.companyId, queryParameters.nodeId)]).then(function (nodeResult) {
				try {
					var objNonSortData = createIntervalDataArray(fromDateTimeObject, toDateTimeObject, userTimezoneSettings.timezone, 15);
					var objSlot = createTimeAsPerDataPoints(15, 96);
					var extractedValues, date, parameterValues, time, nodeTime;
					var timestamp;
					var defaultReadingAndUnit = getDefaultReadingAndUnit(queryParameters.nodeId, request.body.parameterId, nodeResult[0], 0);
					for (var i = 0; i < data.length; i++) {
						parameterValues = JSON.parse(data[i].fvalues);
						date = moment(data[i].reading_date, 'YYYY-MM-DD').format('DD-MM-YYYY');
						for (var key in parameterValues) {
							extractedValues = parameterValues[key].split(',');
							time = objSlot[key];
							nodeTime = date + ' ' + time[0] + ' - ' + time[1];
							if (objNonSortData[nodeTime]) {
								if (1 == Object.keys(objNonSortData[nodeTime]).length) {
									timestamp = objNonSortData[nodeTime]['timestamp'];
									objNonSortData[nodeTime] = lodash.clone(defaultReadingAndUnit['defaultReadingObject']);
									objNonSortData[nodeTime]['timestamp'] = timestamp;
								}
								objNonSortData[nodeTime][data[i].fnode_id + '_' + data[i].fparameters] = { startReading: mathFormat(extractedValues[1], defaultReadingAndUnit['dataUnitObj'][data[i].fnode_id + '_' + data[i].fparameters], defaultReadingAndUnit['smallestUnitVal']), endReading: mathFormat(extractedValues[0], defaultReadingAndUnit['dataUnitObj'][data[i].fnode_id + '_' + data[i].fparameters], defaultReadingAndUnit['smallestUnitVal']), difference: mathFormat(extractedValues[2], defaultReadingAndUnit['dataUnitObj'][data[i].fnode_id + '_' + data[i].fparameters], defaultReadingAndUnit['smallestUnitVal']), speed: parseFloat(extractedValues[3]), acceleration: parseFloat(extractedValues[4]), sampling: parseFloat(extractedValues[5]), count: parseInt(extractedValues[6]) };
							}
						}
					}
					objData['data'] = sortCummulativeData(defaultReadingAndUnit, objNonSortData, request.body, lastRecordDate);
					return cb(null, objData);
				} catch (exception) {
					var responseObj = {};
					responseObj.error = true;
					responseObj.reason = "Error: Unable to get data. Please try again!";
					return cb(null, responseObj);
				}
			});
		} catch (exception) {
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason = "Error: Unable to get data. Please try again!";
			return cb(null, responseObj);
		}
	}).catch(err => {
		var responseObj = {};
		responseObj.error = true;
		responseObj.reason = "Error: Unable to get data. Please try again!";
		return cb(null, responseObj);
	});
};

exports.getInstantaneousFifteenMinutesData = function (request, cb) {
	var queryParameters = {};
	queryParameters.nodeId = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateTimeObject = momentTimezone.utc(toDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	queryParameters.fromDate = fromDateTimeObject.format('YYYY-MM-DD');
	queryParameters.toDate = toDateTimeObject.format('YYYY-MM-DD');
	var currentDateObj = momentTimezone.utc(momentTimezone.tz(userTimezoneSettings.timezone).format('YYYY-MM-DD HH:mm:ss') + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var currentDate = currentDateObj.format('YYYY-MM-DD');
	var promiseAry = [];
	var reqObj = { interval: request.body.interval, currentDate: currentDate };
	promiseAry.push(findReadingsByNode(reqObj['interval'], queryParameters));
	Promise.all(promiseAry).then(function (results) {
		try {
			var data = results[0];
			var objData = { data: {} };
			if (!data || 0 == data.length) { return cb(null, objData); }
			Promise.all([findNodeDataSettings(userTimezoneSettings.companyId, queryParameters.nodeId)]).then(function (nodeResult) {
				try {
					var objNonSortData = createIntervalDataArray(fromDateTimeObject, toDateTimeObject, userTimezoneSettings.timezone, 15);
					var objSlot = createTimeAsPerDataPoints(15, 96);
					var extractedValues, date, parameterValues, time, nodeTime, timestamp;
					var defaultReadingAndUnit = getDefaultReadingAndUnit(queryParameters.nodeId, request.body.parameterId, nodeResult[0], 1);
					for (var i = 0; i < data.length; i++) {
						var parameterValues = JSON.parse(data[i].fvalues);
						var date = moment(data[i].reading_date, 'YYYY-MM-DD').format('DD-MM-YYYY');
						for (var key in parameterValues) {
							extractedValues = parameterValues[key].split(',');
							time = objSlot[key];
							nodeTime = date + ' ' + time[0] + ' - ' + time[1];
							if (objNonSortData[nodeTime]) {
								if (1 == Object.keys(objNonSortData[nodeTime]).length) {
									timestamp = objNonSortData[nodeTime]['timestamp'];
									objNonSortData[nodeTime] = lodash.clone(defaultReadingAndUnit['defaultReadingObject']);
									objNonSortData[nodeTime]['timestamp'] = timestamp;
								}
								objNonSortData[nodeTime][data[i].fnode_id + '_' + data[i].fparameters] = { min: mathFormat(extractedValues[2], defaultReadingAndUnit['dataUnitObj'][data[i].fnode_id + '_' + data[i].fparameters], defaultReadingAndUnit['smallestUnitVal']), max: mathFormat(extractedValues[3], defaultReadingAndUnit['dataUnitObj'][data[i].fnode_id + '_' + data[i].fparameters], defaultReadingAndUnit['smallestUnitVal']), average: mathFormat(extractedValues[0], defaultReadingAndUnit['dataUnitObj'][data[i].fnode_id + '_' + data[i].fparameters], defaultReadingAndUnit['smallestUnitVal']), sampling: parseFloat(extractedValues[4]), count: parseFloat(extractedValues[5]), standardDeviation: parseFloat(extractedValues[1]) };
							}
						}
					}
					objData['data'] = sortInstantaneousData(defaultReadingAndUnit, objNonSortData, '');
					return cb(null, objData);
				} catch (exception) {
					var responseObj = {};
					responseObj.error = true;
					responseObj.reason = "Error: Unable to get data. Please try again!";
					return cb(null, responseObj);
				}
			});
		} catch (exception) {
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason = "Error: Unable to get data. Please try again!";
			return cb(null, responseObj);
		}
	}).catch(err => {
		var responseObj = {};
		responseObj.error = true;
		responseObj.reason = "Error: Unable to get data. Please try again!";
		return cb(null, responseObj);
	});
};

exports.getCummulativeHourlyData = function (request, cb) {
	var queryParameters = {};
	queryParameters.nodeId = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateTimeObject = momentTimezone.utc(toDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var lastRecordDate = '';
	if (0 != request.body.readingGap) {
		('23:59' == toDateTimeObject.format('HH:mm')) ? toDateTimeObject.add(1, 'seconds').add(1, 'hours') : toDateTimeObject.add(1, 'hours');
		lastRecordDate = momentTimezone(toDateTimeObject).subtract(1, 'hours').format('DD-MM-YYYY HH:mm') + ' - ' + toDateTimeObject.format('HH:mm');
	}
	queryParameters.fromDate = fromDateTimeObject.format('YYYY-MM-DD');
	queryParameters.toDate = toDateTimeObject.format('YYYY-MM-DD');
	var currentDateObj = momentTimezone.utc(momentTimezone.tz(userTimezoneSettings.timezone).format('YYYY-MM-DD HH:mm:ss') + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var currentDate = currentDateObj.format('YYYY-MM-DD');
	var promiseAry = [];
	var reqObj = { interval: request.body.interval, currentDate: currentDate };
	promiseAry.push(findReadingsByNode(reqObj['interval'], queryParameters));

	Promise.all(promiseAry).then(function (results) {
		try {
			var data = results[0];
			var objData = { data: {} };
			if (!data || 0 == data.length) { return cb(null, objData); }
			Promise.all([findNodeDataSettings(userTimezoneSettings.companyId, queryParameters.nodeId)]).then(function (nodeResult) {
				try {
					var objNonSortData = createIntervalDataArray(fromDateTimeObject, toDateTimeObject, userTimezoneSettings.timezone, 60);/**dateString chya against timestamp taakla ahe mhnun he function lihile ahe */
					var objSlot = createTimeAsPerDataPoints(60, 24); /**timeslot created here  */
					var extractedValues, date, parameterValues, time, nodeTime, s, e, d;
					var timestamp;
					var defaultReadingAndUnit = getDefaultReadingAndUnit(queryParameters.nodeId, request.body.parameterId, nodeResult[0], 0);
					for (var i = 0; i < data.length; i++) {
						parameterValues = JSON.parse(data[i].hvalues);
						date = moment(data[i].reading_date, 'YYYY-MM-DD').format('DD-MM-YYYY');
						for (var key in parameterValues) {
							extractedValues = parameterValues[key].split(',');
							time = objSlot[key];
							nodeTime = date + ' ' + time[0] + ' - ' + time[1];
							if (objNonSortData[nodeTime]) {
								if (1 == Object.keys(objNonSortData[nodeTime]).length) {
									timestamp = objNonSortData[nodeTime]['timestamp'];
									objNonSortData[nodeTime] = lodash.clone(defaultReadingAndUnit['defaultReadingObject']);
									objNonSortData[nodeTime]['timestamp'] = timestamp;
								}
								s = mathFormat(extractedValues[0], defaultReadingAndUnit['dataUnitObj'][data[i].fnode_id + '_' + data[i].fparameters], defaultReadingAndUnit['smallestUnitVal']);
								e = mathFormat(extractedValues[1], defaultReadingAndUnit['dataUnitObj'][data[i].fnode_id + '_' + data[i].fparameters], defaultReadingAndUnit['smallestUnitVal']);
								d = mathFormat(extractedValues[2], defaultReadingAndUnit['dataUnitObj'][data[i].fnode_id + '_' + data[i].fparameters], defaultReadingAndUnit['smallestUnitVal']);
								if ((d['lowestReading'] == 0.000 && e['lowestReading'] - s['lowestReading'] != d)) {
									d['lowestReading'] = e['lowestReading'] - s['lowestReading'];
									d['lowestReading'] = d['lowestReading'].toFixed(3);
									d['unitReading'] = d['lowestReading'].concat(' ' + d['unit']);
									d['lowestUnitReading'] = d['unitReading'];
								}
								objNonSortData[nodeTime][data[i].fnode_id + '_' + data[i].fparameters] = { startReading: s, endReading: e, difference: d, speed: parseFloat(extractedValues[3]), acceleration: parseFloat(extractedValues[4]), sampling: parseFloat(extractedValues[3]), count: parseInt(extractedValues[4]) };
							}
						}
					}
					objData['data'] = sortCummulativeData(defaultReadingAndUnit, objNonSortData, request.body, lastRecordDate);
					return cb(null, objData);
				} catch (exception) {
					console.log('getCummulativeHourlyData exception1', exception)
					var responseObj = {};
					responseObj.error = true;
					responseObj.reason = "Error: Unable to get data. Please try again!";
					return cb(null, responseObj);
				}
			});
		} catch (exception) {
			console.log('getCummulativeHourlyData exception2', exception)
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason = "Error: Unable to get data. Please try again!";
			return cb(null, responseObj);
		}
	}).catch(err => {
		console.log('getCummulativeHourlyData err', err)
		var responseObj = {};
		responseObj.error = true;
		responseObj.reason = "Error: Unable to get data. Please try again!";
		return cb(null, responseObj);
	});
};

exports.getInstantaneousHourlyData = function (request, cb) {
	var queryParameters = {};
	queryParameters.nodeId = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateTimeObject = momentTimezone.utc(toDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	queryParameters.fromDate = fromDateTimeObject.format('YYYY-MM-DD');
	queryParameters.toDate = toDateTimeObject.format('YYYY-MM-DD');
	var currentDateObj = momentTimezone.utc(momentTimezone.tz(userTimezoneSettings.timezone).format('YYYY-MM-DD HH:mm:ss') + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var currentDate = currentDateObj.format('YYYY-MM-DD');
	var promiseAry = [];
	var reqObj = { interval: request.body.interval, currentDate: currentDate };
	promiseAry.push(findReadingsByNode(reqObj['interval'], queryParameters));
	Promise.all(promiseAry).then(function (results) {
		try {
			var data = results[0];
			var objData = { data: {} };
			if (!data || 0 == data.length) { return cb(null, objData); }
			Promise.all([findNodeDataSettings(userTimezoneSettings.companyId, queryParameters.nodeId)]).then(function (nodeResult) {
				try {
					var objNonSortData = createIntervalDataArray(fromDateTimeObject, toDateTimeObject, userTimezoneSettings.timezone, 60);
					var objSlot = createTimeAsPerDataPoints(60, 24);
					var extractedValues, date, parameterValues, time, nodeTime, timestamp;
					var defaultReadingAndUnit = getDefaultReadingAndUnit(queryParameters.nodeId, request.body.parameterId, nodeResult[0], 1);
					for (var i = 0; i < data.length; i++) {
						var parameterValues = JSON.parse(data[i].hvalues);
						var date = moment(data[i].reading_date, 'YYYY-MM-DD').format('DD-MM-YYYY');
						for (var key in parameterValues) {
							extractedValues = parameterValues[key].split(',');
							time = objSlot[key];
							nodeTime = date + ' ' + time[0] + ' - ' + time[1];
							if (objNonSortData[nodeTime]) {
								if (1 == Object.keys(objNonSortData[nodeTime]).length) {
									timestamp = objNonSortData[nodeTime]['timestamp'];
									objNonSortData[nodeTime] = lodash.clone(defaultReadingAndUnit['defaultReadingObject']);
									objNonSortData[nodeTime]['timestamp'] = timestamp;
								}
								objNonSortData[nodeTime][data[i].fnode_id + '_' + data[i].fparameters] = { min: mathFormat(extractedValues[2], defaultReadingAndUnit['dataUnitObj'][data[i].fnode_id + '_' + data[i].fparameters], defaultReadingAndUnit['smallestUnitVal']), max: mathFormat(extractedValues[3], defaultReadingAndUnit['dataUnitObj'][data[i].fnode_id + '_' + data[i].fparameters], defaultReadingAndUnit['smallestUnitVal']), average: mathFormat(extractedValues[0], defaultReadingAndUnit['dataUnitObj'][data[i].fnode_id + '_' + data[i].fparameters], defaultReadingAndUnit['smallestUnitVal']), sampling: parseFloat(extractedValues[4]), count: parseFloat(extractedValues[5]), standardDeviation: parseFloat(extractedValues[1]) };
							}
						}
					}
					objData['data'] = sortInstantaneousData(defaultReadingAndUnit, objNonSortData, '');
					return cb(null, objData);
				} catch (exception) {
					var responseObj = {};
					responseObj.error = true;
					responseObj.reason = "Error: Unable to get data. Please try again!";
					return cb(null, responseObj);
				}
			});
		} catch (exception) {
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason = "Error: Unable to get data. Please try again!";
			return cb(null, responseObj);
		}
	}).catch(err => {
		var responseObj = {};
		responseObj.error = true;
		responseObj.reason = "Error: Unable to get data. Please try again!";
		return cb(null, responseObj);
	});
};

exports.getCummulativeDailyData = function (request, cb) {
	var queryParameters = {};
	queryParameters.nodeId = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateTimeObject = momentTimezone.utc(toDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var lastRecordDate = '';
	if (0 != request.body.readingGap) {
		toDateTimeObject.add(1, 'days');
		lastRecordDate = toDateTimeObject.format('DD-MM-YYYY');
	}
	queryParameters.fromDate = fromDateTimeObject.format('YYYY-MM-DD');
	queryParameters.toDate = toDateTimeObject.format('YYYY-MM-DD');
	var promiseAry = [];
	var reqObj = { interval: request.body.interval };
	promiseAry.push(findReadingsByNode(reqObj['interval'], queryParameters));
	Promise.all(promiseAry).then(function (results) {
		try {
			var data = results[0];
			var objData = { data: {} };
			if (!data || 0 == data.length) { return cb(null, objData); }
			Promise.all([findNodeDataSettings(userTimezoneSettings.companyId, queryParameters.nodeId)]).then(function (nodeResult) {
				try {
					var objNonSortData = createDailyArray(fromDateTimeObject, toDateTimeObject);
					var extractedValues, date, s, e, d;
					var timestamp;
					var defaultReadingAndUnit = getDefaultReadingAndUnit(queryParameters.nodeId, request.body.parameterId, nodeResult[0], 0);
					for (var i = 0; i < data.length; i++) {
						date = moment(data[i].reading_date, 'YYYY-MM-DD').format('DD-MM-YYYY');
						extractedValues = (null != data[i].dvalues && '' != data[i].dvalues) ? data[i].dvalues.split(',') : [];
						console.log('ooooo', extractedValues)
						console.log('ooooo', typeof extractedValues[0])
						if (0 < extractedValues.length && objNonSortData[date]) {
							if (1 == Object.keys(objNonSortData[date]).length) {
								timestamp = objNonSortData[date]['timestamp'];
								objNonSortData[date] = lodash.clone(defaultReadingAndUnit['defaultReadingObject']);
								objNonSortData[date]['timestamp'] = timestamp;
							}
							s = mathFormat(extractedValues[0], defaultReadingAndUnit['dataUnitObj'][data[i].fnode_id + '_' + data[i].fparameters], defaultReadingAndUnit['smallestUnitVal']);
							e = mathFormat(extractedValues[1], defaultReadingAndUnit['dataUnitObj'][data[i].fnode_id + '_' + data[i].fparameters], defaultReadingAndUnit['smallestUnitVal']);
							d = mathFormat(extractedValues[2], defaultReadingAndUnit['dataUnitObj'][data[i].fnode_id + '_' + data[i].fparameters], defaultReadingAndUnit['smallestUnitVal']);
							if ((d['lowestReading'] == 0.000 && e['lowestReading'] - s['lowestReading'] != d)) {
								d['lowestReading'] = e['lowestReading'] - s['lowestReading'];
								d['lowestReading'] = d['lowestReading'].toFixed(3);
								d['unitReading'] = d['lowestReading'].concat(' ' + d['unit']);
								d['lowestUnitReading'] = d['unitReading'];
							}
							objNonSortData[date][data[i].fnode_id + '_' + data[i].fparameters] = { startReading: s, endReading: e, difference: d, speed: parseFloat(extractedValues[3]), acceleration: parseFloat(extractedValues[4]), sampling: parseFloat(extractedValues[3]), count: parseInt(extractedValues[4]) };

							// objNonSortData[date][data[i].fnode_id+'_'+data[i].fparameters] = {startReading:mathFormat(extractedValues[0],defaultReadingAndUnit['dataUnitObj'][data[i].fnode_id+'_'+data[i].fparameters],defaultReadingAndUnit['smallestUnitVal']),endReading:mathFormat(extractedValues[1],defaultReadingAndUnit['dataUnitObj'][data[i].fnode_id+'_'+data[i].fparameters],defaultReadingAndUnit['smallestUnitVal']),difference:mathFormat(extractedValues[2],defaultReadingAndUnit['dataUnitObj'][data[i].fnode_id+'_'+data[i].fparameters],defaultReadingAndUnit['smallestUnitVal']),speed:parseFloat(extractedValues[3]),acceleration:parseFloat(extractedValues[4]),sampling:parseFloat(extractedValues[3]),count:parseInt(extractedValues[4])};
						}
					}
					objData['data'] = sortCummulativeData(defaultReadingAndUnit, objNonSortData, request.body, lastRecordDate);
					return cb(null, objData);
				} catch (exception) {
					console.log('getCummulativeDailyData exception1', exception)
					var responseObj = {};
					responseObj.error = true;
					responseObj.reason = "Error: Unable to get data. Please try again!";
					return cb(null, responseObj);
				}
			});
		} catch (exception) {
			console.log('getCummulativeDailyData exception2', exception)
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason = "Error: Unable to get data. Please try again!";
			return cb(null, responseObj);
		}
	}).catch(err => {
		console.log('getCummulativeDailyData err', err)
		var responseObj = {};
		responseObj.error = true;
		responseObj.reason = "Error: Unable to get data. Please try again!";
		return cb(null, responseObj);
	});
};

exports.getInstantaneousDailyData = function (request, cb) {
	var queryParameters = {};
	queryParameters.nodeId = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateTimeObject = momentTimezone.utc(toDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	queryParameters.fromDate = fromDateTimeObject.format('YYYY-MM-DD');
	queryParameters.toDate = toDateTimeObject.format('YYYY-MM-DD');
	var promiseAry = [];
	var reqObj = { interval: request.body.interval };
	promiseAry.push(findReadingsByNode(reqObj['interval'], queryParameters));
	Promise.all(promiseAry).then(function (results) {
		try {
			var data = results[0];
			var objData = { data: {} };
			if (!data || 0 == data.length) { return cb(null, objData); }
			Promise.all([findNodeDataSettings(userTimezoneSettings.companyId, queryParameters.nodeId)]).then(function (nodeResult) {
				try {
					var objNonSortData = createDailyArray(fromDateTimeObject, toDateTimeObject);
					var extractedValues, date, timestamp;
					var defaultReadingAndUnit = getDefaultReadingAndUnit(queryParameters.nodeId, request.body.parameterId, nodeResult[0], 1);
					for (var i = 0; i < data.length; i++) {
						date = moment(data[i].reading_date, 'YYYY-MM-DD').format('DD-MM-YYYY');
						extractedValues = (null != data[i].dvalues && '' != data[i].dvalues) ? data[i].dvalues.split(',') : [];
						if (0 < extractedValues.length && objNonSortData[date]) {
							if (1 == Object.keys(objNonSortData[date]).length) {
								timestamp = objNonSortData[date]['timestamp'];
								objNonSortData[date] = lodash.clone(defaultReadingAndUnit['defaultReadingObject']);
								objNonSortData[date]['timestamp'] = timestamp;
							}
							objNonSortData[date][data[i].fnode_id + '_' + data[i].fparameters] = { min: mathFormat(extractedValues[2], defaultReadingAndUnit['dataUnitObj'][data[i].fnode_id + '_' + data[i].fparameters], defaultReadingAndUnit['smallestUnitVal']), max: mathFormat(extractedValues[3], defaultReadingAndUnit['dataUnitObj'][data[i].fnode_id + '_' + data[i].fparameters], defaultReadingAndUnit['smallestUnitVal']), average: mathFormat(extractedValues[0], defaultReadingAndUnit['dataUnitObj'][data[i].fnode_id + '_' + data[i].fparameters], defaultReadingAndUnit['smallestUnitVal']), sampling: parseFloat(extractedValues[4]), count: parseFloat(extractedValues[5]), standardDeviation: parseFloat(extractedValues[1]) };
						}
					}
					objData['data'] = sortInstantaneousData(defaultReadingAndUnit, objNonSortData, '');
					return cb(null, objData);
				} catch (exception) {
					var responseObj = {};
					responseObj.error = true;
					responseObj.reason = "Error: Unable to get data. Please try again!";
					return cb(null, responseObj);
				}
			});
		} catch (exception) {
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason = "Error: Unable to get data. Please try again!";
			return cb(null, responseObj);
		}
	}).catch(err => {
		var responseObj = {};
		responseObj.error = true;
		responseObj.reason = "Error: Unable to get data. Please try again!";
		return cb(null, responseObj);
	});
};

exports.getCummulativeWeeklyData = function (request, cb) {
	var queryParameters = {};
	queryParameters.nodeId = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateTimeObject = momentTimezone.utc(toDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var lastRecordDate = '';
	if (0 != request.body.readingGap) {
		toDateTimeObject.add(1, 'weeks');
		if ('Sunday' == momentTimezone(toDateTimeObject).format('dddd')) {
			lastRecordDate = momentTimezone(toDateTimeObject).startOf('isoWeek').format('DD-MM-YYYY') + ' - ' + momentTimezone(toDateTimeObject).format('DD-MM-YYYY');
			console.log('in if ', lastRecordDate);
		} else {
			lastRecordDate = momentTimezone(toDateTimeObject).subtract(7, 'days').startOf('isoWeek').format('DD-MM-YYYY') + ' - ' + momentTimezone(toDateTimeObject).startOf('week').format('DD-MM-YYYY');
			console.log('in elsif ', lastRecordDate);
		}
	}
	queryParameters.fromYear = momentTimezone(fromDateTimeObject).startOf('isoWeek').format('YYYY');
	queryParameters.toYear = momentTimezone(toDateTimeObject).startOf('isoWeek').format('YYYY');
	queryParameters.fromDate = fromDateTime[0].split(' ')[0];
	queryParameters.toDate = toDateTime[0].split(' ')[0];
	// console.log('queryParameters--', queryParameters)
	var promiseAry = [];
	var reqObj = { interval: request.body.interval };
	var objWeeks = generateWeekObjects(queryParameters.fromYear, queryParameters.toYear, fromDateTimeObject, toDateTimeObject);
	// console.log('objWeeks', objWeeks)
	// promiseAry.push(findReadingsByNode(reqObj['interval'], queryParameters));
	promiseAry.push(findReadingstestByNode(objWeeks, queryParameters, 0));
	Promise.all(promiseAry).then(function (results) {
		try {
			var data = results[0];
			var objData = { data: {} };
			if (!data || 0 == data.length) { return cb(null, objData); }
			Promise.all([findNodeDataSettings(userTimezoneSettings.companyId, queryParameters.nodeId)]).then(function (nodeResult) {
				try {
					var objNonSortData = objWeeks['data'];
					var dataObject, wYear, weekDate, extractedValues, timestamp, s, e, d;
					var defaultReadingAndUnit = getDefaultReadingAndUnit(queryParameters.nodeId, request.body.parameterId, nodeResult[0], 0);
					try {
						console.log('test', data)
						for (var i = 0; i < data.length; i++) {
							dataObject = (data[i].wvalues);
							wYear = parseInt(data[i].wdate);
							if (objWeeks['slot'][wYear]) {
								for (var key in objWeeks['slot'][wYear]) {
									if (dataObject[key]) {
										weekDate = objWeeks['slot'][wYear][key];
										extractedValues = dataObject[key].split(',');
										if (1 == Object.keys(objNonSortData[weekDate]).length) {
											timestamp = objNonSortData[weekDate]['timestamp'];
											objNonSortData[weekDate] = lodash.clone(defaultReadingAndUnit['defaultReadingObject']);
											objNonSortData[weekDate]['timestamp'] = timestamp;
										}
										s = mathFormat(extractedValues[0], defaultReadingAndUnit['dataUnitObj'][data[i].wnode_id + '_' + data[i].wparameters], defaultReadingAndUnit['smallestUnitVal']);
										e = mathFormat(extractedValues[1], defaultReadingAndUnit['dataUnitObj'][data[i].wnode_id + '_' + data[i].wparameters], defaultReadingAndUnit['smallestUnitVal']);
										d = mathFormat(extractedValues[2], defaultReadingAndUnit['dataUnitObj'][data[i].wnode_id + '_' + data[i].wparameters], defaultReadingAndUnit['smallestUnitVal']);
										if ((d['lowestReading'] == 0.000 && e['lowestReading'] - s['lowestReading'] != d)) {
											d['lowestReading'] = e['lowestReading'] - s['lowestReading'];
											d['lowestReading'] = d['lowestReading'].toFixed(3);
											d['unitReading'] = d['lowestReading'].concat(' ' + d['unit']);
											d['lowestUnitReading'] = d['unitReading'];
										}
										objNonSortData[weekDate][data[i].wnode_id + '_' + data[i].wparameters] = { startReading: s, endReading: e, difference: d, speed: parseFloat(extractedValues[3]), acceleration: parseFloat(extractedValues[4]), sampling: parseFloat(extractedValues[3]), count: parseInt(extractedValues[4]) };
										console.log('kkk', objNonSortData)
										// objNonSortData[weekDate][data[i].wnode_id+'_'+data[i].wparameters] = {startReading:mathFormat(extractedValues[0],defaultReadingAndUnit['dataUnitObj'][data[i].wnode_id+'_'+data[i].wparameters],defaultReadingAndUnit['smallestUnitVal']),endReading:mathFormat(extractedValues[1],defaultReadingAndUnit['dataUnitObj'][data[i].wnode_id+'_'+data[i].wparameters],defaultReadingAndUnit['smallestUnitVal']),difference:mathFormat(extractedValues[2],defaultReadingAndUnit['dataUnitObj'][data[i].wnode_id+'_'+data[i].wparameters],defaultReadingAndUnit['smallestUnitVal']),speed:parseFloat(extractedValues[3]),acceleration:parseFloat(extractedValues[4]),sampling:parseFloat(extractedValues[3]),count:parseInt(extractedValues[4])};
									}
								}
							}
						}
					} catch (error) { console.log('error', error) }
					objData['data'] = sortCummulativeData(defaultReadingAndUnit, objNonSortData, request.body, lastRecordDate);
					// console.log(objData['data'])
					return cb(null, objData);
				} catch (exception) {
					var responseObj = {};
					responseObj.error = true;
					responseObj.reason = "Error: Unable to get data. Please try again!";
					return cb(null, responseObj);
				}
			});
		} catch (exception) {
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason = "Error: Unable to get data. Please try again!";
			return cb(null, responseObj);
		}
	}).catch(err => {
		var responseObj = {};
		responseObj.error = true;
		responseObj.reason = "Error: Unable to get data. Please try again!";
		return cb(null, responseObj);
	});
};

exports.getInstantaneousWeeklyData = function (request, cb) {
	var queryParameters = {};
	queryParameters.nodeId = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateTimeObject = momentTimezone.utc(toDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var lastRecordDate = '';
	if (0 != request.body.readingGap) {
		toDateTimeObject.add(1, 'weeks');
		if ('Sunday' == momentTimezone(toDateTimeObject).format('dddd')) {
			lastRecordDate = momentTimezone(toDateTimeObject).startOf('isoWeek').format('DD-MM-YYYY') + ' - ' + momentTimezone(toDateTimeObject).format('DD-MM-YYYY');
			console.log('in if ', lastRecordDate);
		} else {
			lastRecordDate = momentTimezone(toDateTimeObject).subtract(7, 'days').startOf('isoWeek').format('DD-MM-YYYY') + ' - ' + momentTimezone(toDateTimeObject).startOf('week').format('DD-MM-YYYY');
			console.log('in elsif ', lastRecordDate);
		}
	}
	queryParameters.fromYear = momentTimezone(fromDateTimeObject).startOf('isoWeek').format('YYYY');
	queryParameters.toYear = momentTimezone(toDateTimeObject).startOf('isoWeek').format('YYYY');
	queryParameters.fromDate = fromDateTime[0].split(' ')[0];
	queryParameters.toDate = toDateTime[0].split(' ')[0];
	// queryParameters.fromYear = momentTimezone(fromDateTimeObject).startOf('isoWeek').format('YYYY'); 
	// queryParameters.toYear = momentTimezone(toDateTimeObject).startOf('isoWeek').format('YYYY');
	var promiseAry = [];
	var reqObj = { interval: request.body.interval };
	var objWeeks = generateWeekObjects(queryParameters.fromYear, queryParameters.toYear, fromDateTimeObject, toDateTimeObject);
	// promiseAry.push(findReadingsByNode(reqObj['interval'],queryParameters));
	promiseAry.push(findReadingstestByNode(objWeeks, queryParameters, 1));
	Promise.all(promiseAry).then(function (results) {
		try {
			var data = results[0];
			var objData = { data: {} };
			if (!data || 0 == data.length) { return cb(null, objData); }
			Promise.all([findNodeDataSettings(userTimezoneSettings.companyId, queryParameters.nodeId)]).then(function (nodeResult) {
				try {
					var objNonSortData = objWeeks['data'];
					var dataObject, wYear, weekDate, extractedValues, timestamp;
					var defaultReadingAndUnit = getDefaultReadingAndUnit(queryParameters.nodeId, request.body.parameterId, nodeResult[0], 1);
					for (var i = 0; i < data.length; i++) {
						dataObject = data[i].wvalues;
						// dataObject = JSON.parse(data[i].wvalues);
						wYear = parseInt(data[i].wdate);
						if (objWeeks['slot'][wYear]) {
							for (var key in objWeeks['slot'][wYear]) {
								if (dataObject[key]) {
									weekDate = objWeeks['slot'][wYear][key];
									extractedValues = dataObject[key].split(',');
									if (1 == Object.keys(objNonSortData[weekDate]).length) {
										timestamp = objNonSortData[weekDate]['timestamp'];
										objNonSortData[weekDate] = lodash.clone(defaultReadingAndUnit['defaultReadingObject']);
										objNonSortData[weekDate]['timestamp'] = timestamp;
									}
									objNonSortData[weekDate][data[i].wnode_id + '_' + data[i].wparameters] = { 
										min: mathFormat(extractedValues[2], defaultReadingAndUnit['dataUnitObj'][data[i].wnode_id + '_' + data[i].wparameters], defaultReadingAndUnit['smallestUnitVal']), 
										max: mathFormat(extractedValues[3], defaultReadingAndUnit['dataUnitObj'][data[i].wnode_id + '_' + data[i].wparameters], defaultReadingAndUnit['smallestUnitVal']), 
										average: mathFormat(extractedValues[0], defaultReadingAndUnit['dataUnitObj'][data[i].wnode_id + '_' + data[i].wparameters], defaultReadingAndUnit['smallestUnitVal']), 
										sampling: parseFloat(extractedValues[4]), 
										count: parseFloat(extractedValues[5]), 
										standardDeviation:extractedValues[1] };
								}
							}
						}
					}
					objData['data'] = sortInstantaneousData(defaultReadingAndUnit, objNonSortData, lastRecordDate);
					return cb(null, objData);
				} catch (exception) {
					var responseObj = {};
					responseObj.error = true;
					responseObj.reason = "Error: Unable to get data. Please try again!";
					return cb(null, responseObj);
				}
			});
		} catch (exception) {
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason = "Error: Unable to get data. Please try again!";
			return cb(null, responseObj);
		}
	}).catch(err => {
		var responseObj = {};
		responseObj.error = true;
		responseObj.reason = "Error: Unable to get data. Please try again!";
		return cb(null, responseObj);
	});
};

exports.getCummulativeMonthlyData = function (request, cb) {
	var queryParameters = {};
	queryParameters.nodeId = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateTimeObject = momentTimezone.utc(toDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var lastRecordDate = '';
	if (0 != request.body.readingGap) {
		toDateTimeObject.add(1, 'months');
		lastRecordDate = toDateTimeObject.format('MMM YYYY');
	}
	var fromMonth = fromDateTimeObject.format('YYYY-MM');
	var toMonth = toDateTimeObject.format('YYYY-MM');
	queryParameters.fromDate = 2017;
	queryParameters.toDate = 2017;
	var promiseAry = [];
	var reqObj = { interval: request.body.interval };
	promiseAry.push(findReadingsByNode(reqObj['interval'], queryParameters));
	Promise.all(promiseAry).then(function (results) {
		try {
			var data = results[0];
			var objData = { data: {} };
			if (!data || 0 == data.length) { return cb(null, objData); }
			console.log('data',data,'queryParameters',queryParameters)
			Promise.all([findNodeDataSettings(userTimezoneSettings.companyId, queryParameters.nodeId)]).then(function (nodeResult) {
				try {
					var arrMonthsYear = createMonthsYear();
					var objNonSortData = createMonths(fromMonth, toMonth);
					var currentMonth = moment(fromMonth + '-01').format('MMM YYYY');
					var monthIndex = arrMonthsYear.indexOf(currentMonth);
					monthIndex = (-1 == monthIndex) ? 1 : monthIndex;
					var extractedValues, timestamp;
					var defaultReadingAndUnit = getDefaultReadingAndUnit(queryParameters.nodeId, request.body.parameterId, nodeResult[0], 0);
					for (var i = 0; i < data.length; i++) {
						var dataObject = JSON.parse(data[i].mvalues);
						var month = fromMonth;
						startingIndex = monthIndex;
						for (; startingIndex <= 60; startingIndex++) {
							if (toMonth < month) {
								break;
							}
							if (dataObject[startingIndex]) {
								extractedValues = dataObject[startingIndex].split(',');
								if (0 == Object.keys(objNonSortData[arrMonthsYear[startingIndex]]).length) {
									timestamp = momentTimezone.utc(arrMonthsYear[startingIndex] + '+0000', 'MMM YYYYZ').valueOf();
									objNonSortData[arrMonthsYear[startingIndex]] = lodash.clone(defaultReadingAndUnit['defaultReadingObject']);
									objNonSortData[arrMonthsYear[startingIndex]]['timestamp'] = timestamp;
								}
								objNonSortData[arrMonthsYear[startingIndex]][data[i].mnode_id + '_' + data[i].mparameters] = { startReading: mathFormat(extractedValues[0], defaultReadingAndUnit['dataUnitObj'][data[i].mnode_id + '_' + data[i].mparameters], defaultReadingAndUnit['smallestUnitVal']), endReading: mathFormat(extractedValues[1], defaultReadingAndUnit['dataUnitObj'][data[i].mnode_id + '_' + data[i].mparameters], defaultReadingAndUnit['smallestUnitVal']), difference: mathFormat(extractedValues[2], defaultReadingAndUnit['dataUnitObj'][data[i].mnode_id + '_' + data[i].mparameters], defaultReadingAndUnit['smallestUnitVal']), speed: parseFloat(extractedValues[3]), acceleration: parseFloat(extractedValues[4]), sampling: parseFloat(extractedValues[3]), count: parseInt(extractedValues[4]) };
							}
							var month = moment(month + '-01').add(1, 'M').format('YYYY-MM');
						}
					}
					objData['data'] = sortCummulativeDataByDateFormat(defaultReadingAndUnit, objNonSortData, request.body, lastRecordDate, 'MMM YYYYZ');
					return cb(null, objData);
				} catch (exception) {
					console.log('monthly exception1', exception)
					var responseObj = {};
					responseObj.error = true;
					responseObj.reason = "Error: Unable to get data. Please try again!";
					return cb(null, responseObj);
				}
			});
		} catch (exception) {
			console.log('monthly exception2', exception)
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason = "Error: Unable to get data. Please try again!";
			return cb(null, responseObj);
		}
	}).catch(err => {
		console.log('monthly err', err)
		var responseObj = {};
		responseObj.error = true;
		responseObj.reason = "Error: Unable to get data. Please try again!";
		return cb(null, responseObj);
	});
};

exports.getInstantaneousMonthlyData = function (request, cb) {
	var queryParameters = {};
	queryParameters.nodeId = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateTimeObject = momentTimezone.utc(toDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var fromMonth = fromDateTimeObject.format('YYYY-MM');
	var toMonth = toDateTimeObject.format('YYYY-MM');
	queryParameters.fromDate = 2017;
	queryParameters.toDate = 2017;
	var promiseAry = [];
	var reqObj = { interval: request.body.interval };
	promiseAry.push(findReadingsByNode(reqObj['interval'], queryParameters));
	Promise.all(promiseAry).then(function (results) {
		try {
			var data = results[0];
			var objData = { data: {} };
			if (!data || 0 == data.length) { return cb(null, objData); }
			Promise.all([findNodeDataSettings(userTimezoneSettings.companyId, queryParameters.nodeId)]).then(function (nodeResult) {
				try {
					var arrMonthsYear = createMonthsYear();
					var objNonSortData = createMonths(fromMonth, toMonth);
					var currentMonth = moment(fromMonth + '-01').format('MMM YYYY');
					var monthIndex = arrMonthsYear.indexOf(currentMonth);
					monthIndex = (-1 == monthIndex) ? 1 : monthIndex;
					var extractedValues, timestamp;
					var defaultReadingAndUnit = getDefaultReadingAndUnit(queryParameters.nodeId, request.body.parameterId, nodeResult[0], 1);
					for (var i = 0; i < data.length; i++) {
						var dataObject = JSON.parse(data[i].mvalues);
						var month = fromMonth;
						startingIndex = monthIndex;
						for (; startingIndex <= 60; startingIndex++) {
							if (toMonth < month) {
								break;
							}
							if (dataObject[startingIndex]) {
								extractedValues = dataObject[startingIndex].split(',');
								if (0 == Object.keys(objNonSortData[arrMonthsYear[startingIndex]]).length) {
									timestamp = momentTimezone.utc(arrMonthsYear[startingIndex] + '+0000', 'MMM YYYYZ').valueOf();
									objNonSortData[arrMonthsYear[startingIndex]] = lodash.clone(defaultReadingAndUnit['defaultReadingObject']);
									objNonSortData[arrMonthsYear[startingIndex]]['timestamp'] = timestamp;
								}
								objNonSortData[arrMonthsYear[startingIndex]][data[i].mnode_id + '_' + data[i].mparameters] = { min: mathFormat(extractedValues[2], defaultReadingAndUnit['dataUnitObj'][data[i].mnode_id + '_' + data[i].mparameters], defaultReadingAndUnit['smallestUnitVal']), max: mathFormat(extractedValues[3], defaultReadingAndUnit['dataUnitObj'][data[i].mnode_id + '_' + data[i].mparameters], defaultReadingAndUnit['smallestUnitVal']), average: mathFormat(extractedValues[0], defaultReadingAndUnit['dataUnitObj'][data[i].mnode_id + '_' + data[i].mparameters], defaultReadingAndUnit['smallestUnitVal']), sampling: parseFloat(extractedValues[4]), count: parseFloat(extractedValues[5]), standardDeviation: parseFloat(extractedValues[1]) };
							}
							month = moment(month + '-01').add(1, 'M').format('YYYY-MM');
						}
					}
					objData['data'] = sortInstantaneousDataByDateFormat(defaultReadingAndUnit, objNonSortData, 'MMM YYYYZ');
					return cb(null, objData);
				} catch (exception) {
					var responseObj = {};
					responseObj.error = true;
					responseObj.reason = "Error: Unable to get data. Please try again!";
					return cb(null, responseObj);
				}
			});
		} catch (exception) {
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason = "Error: Unable to get data. Please try again!";
			return cb(null, responseObj);
		}
	}).catch(err => {
		var responseObj = {};
		responseObj.error = true;
		responseObj.reason = "Error: Unable to get data. Please try again!";
		return cb(null, responseObj);
	});
};

exports.getCummulativeYearlyData = function (request, cb) {
	var queryParameters = {};
	queryParameters.nodeId = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateTimeObject = momentTimezone.utc(toDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	if (0 != request.body.readingGap) {
		toDateTimeObject.add(1, 'years');
		lastRecordDate = toDateTimeObject.format('YYYY');
	}
	var fromYear = fromDateTimeObject.format('YYYY');
	var toYear = toDateTimeObject.format('YYYY');
	queryParameters.fromDate = 2017;
	queryParameters.toDate = (2017 > toYear) ? 2017 : parseInt(toYear);
	var promiseAry = [];
	var reqObj = { interval: request.body.interval };
	promiseAry.push(findReadingsByNode(reqObj['interval'], queryParameters));
	Promise.all(promiseAry).then(function (results) {
		try {
			var data = results[0];
			var objData = { data: {} };
			if (!data || 0 == data.length) { return cb(null, objData); }
			Promise.all([findNodeDataSettings(userTimezoneSettings.companyId, queryParameters.nodeId)]).then(function (nodeResult) {
				try {
					var arrYears = createYear();
					var objNonSortData = createYearlyArray(fromYear, toYear);
					var extractedValues, timestamp;
					var defaultReadingAndUnit = getDefaultReadingAndUnit(queryParameters.nodeId, request.body.parameterId, nodeResult[0], 0);
					for (var i = 0; i < data.length; i++) {
						var dataObject = JSON.parse(data[i].yvalues);
						var year = fromYear;
						var startingIndex = arrYears.indexOf(fromYear);
						startingIndex = (-1 === startingIndex) ? 1 : startingIndex;
						for (; startingIndex <= 10; startingIndex++) {
							if (toYear < year) {
								break;
							}
							if (dataObject[startingIndex]) {
								var extractedValues = dataObject[startingIndex].split(',');
								if (0 == Object.keys(objNonSortData[arrYears[startingIndex]]).length) {
									objNonSortData[arrYears[startingIndex]] = lodash.clone(defaultReadingAndUnit['defaultReadingObject']);
									timestamp = momentTimezone.utc(arrYears[startingIndex] + '+0000', 'YYYYZ').valueOf();
									objNonSortData[arrYears[startingIndex]]['timestamp'] = timestamp;
								}
								objNonSortData[arrYears[startingIndex]][data[i].ynode_id + '_' + data[i].yparameters] = { startReading: mathFormat(extractedValues[0], defaultReadingAndUnit['dataUnitObj'][data[i].ynode_id + '_' + data[i].yparameters], defaultReadingAndUnit['smallestUnitVal']), endReading: mathFormat(extractedValues[1], defaultReadingAndUnit['dataUnitObj'][data[i].ynode_id + '_' + data[i].yparameters], defaultReadingAndUnit['smallestUnitVal']), difference: mathFormat(extractedValues[2], defaultReadingAndUnit['dataUnitObj'][data[i].ynode_id + '_' + data[i].yparameters], defaultReadingAndUnit['smallestUnitVal']), speed: parseFloat(extractedValues[3]), acceleration: parseFloat(extractedValues[4]), sampling: parseFloat(extractedValues[3]), count: parseInt(extractedValues[4]) };
							}
							year++;
						}
					}
					objData['data'] = sortCummulativeDataByDateFormat(defaultReadingAndUnit, objNonSortData, request.body, lastRecordDate, 'YYYYZ');
					return cb(null, objData);
				} catch (exception) {
					var responseObj = {};
					responseObj.error = true;
					responseObj.reason = "Error: Unable to get data. Please try again!";
					return cb(null, responseObj);
				}
			});
		} catch (exception) {
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason = "Error: Unable to get data. Please try again!";
			return cb(null, responseObj);
		}
	}).catch(err => {
		var responseObj = {};
		responseObj.error = true;
		responseObj.reason = "Error: Unable to get data. Please try again!";
		return cb(null, responseObj);
	});
};

exports.getInstantaneousYearlyData = function (request, cb) {
	var queryParameters = {};
	queryParameters.nodeId = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateTimeObject = momentTimezone.utc(toDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var fromYear = fromDateTimeObject.format('YYYY');
	var toYear = toDateTimeObject.format('YYYY');
	queryParameters.fromDate = 2017;
	queryParameters.toDate = (2017 > toYear) ? 2017 : parseInt(toYear);
	var promiseAry = [];
	var reqObj = { interval: request.body.interval };
	promiseAry.push(findReadingsByNode(reqObj['interval'], queryParameters));
	Promise.all(promiseAry).then(function (results) {
		try {
			var data = results[0];
			var objData = { data: {} };
			if (!data || 0 == data.length) { return cb(null, objData); }
			Promise.all([findNodeDataSettings(userTimezoneSettings.companyId, queryParameters.nodeId)]).then(function (nodeResult) {
				try {
					var arrYears = createYear();
					var objNonSortData = createYearlyArray(fromYear, toYear);
					var extractedValues, timestamp;
					var defaultReadingAndUnit = getDefaultReadingAndUnit(queryParameters.nodeId, request.body.parameterId, nodeResult[0], 1);
					for (var i = 0; i < data.length; i++) {
						var dataObject = JSON.parse(data[i].yvalues);
						var year = fromYear;
						var startingIndex = arrYears.indexOf(fromYear);
						startingIndex = (-1 === startingIndex) ? 1 : startingIndex;
						for (; startingIndex <= 10; startingIndex++) {
							if (toYear < year) {
								break;
							}
							if (dataObject[startingIndex]) {
								extractedValues = dataObject[startingIndex].split(',');
								if (0 == Object.keys(objNonSortData[arrYears[startingIndex]]).length) {
									objNonSortData[arrYears[startingIndex]] = lodash.clone(defaultReadingAndUnit['defaultReadingObject']);
									timestamp = momentTimezone.utc(arrYears[startingIndex] + '+0000', 'YYYYZ').valueOf();
									objNonSortData[arrYears[startingIndex]]['timestamp'] = timestamp;
								}
								objNonSortData[arrYears[startingIndex]][data[i].ynode_id + '_' + data[i].yparameters] = { min: mathFormat(extractedValues[2], defaultReadingAndUnit['dataUnitObj'][data[i].ynode_id + '_' + data[i].yparameters], defaultReadingAndUnit['smallestUnitVal']), max: mathFormat(extractedValues[3], defaultReadingAndUnit['dataUnitObj'][data[i].ynode_id + '_' + data[i].yparameters], defaultReadingAndUnit['smallestUnitVal']), average: mathFormat(extractedValues[0], defaultReadingAndUnit['dataUnitObj'][data[i].ynode_id + '_' + data[i].yparameters], defaultReadingAndUnit['smallestUnitVal']), sampling: parseFloat(extractedValues[4]), count: parseFloat(extractedValues[5]), standardDeviation: parseFloat(extractedValues[1]) };
							}
							year++;
						}
					}
					objData['data'] = sortInstantaneousDataByDateFormat(defaultReadingAndUnit, objNonSortData, 'YYYYZ');
					return cb(null, objData);
				} catch (exception) {
					var responseObj = {};
					responseObj.error = true;
					responseObj.reason = "Error: Unable to get data. Please try again!";
					return cb(null, responseObj);
				}
			});
		} catch (exception) {
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason = "Error: Unable to get data. Please try again!";
			return cb(null, responseObj);
		}
	}).catch(err => {
		var responseObj = {};
		responseObj.error = true;
		responseObj.reason = "Error: Unable to get data. Please try again!";
		return cb(null, responseObj);
	});
};

exports.getRawData = function (request, cb) {
	var queryParameters = {};
	queryParameters.nodeName = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateTimeObject = momentTimezone.utc(toDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var dateTimeSlots = nodeTimeZoneSlotCalculation(fromDateTimeObject, toDateTimeObject);
	queryParameters.fromDate = dateTimeSlots.fromDateTime;
	queryParameters.toDate = dateTimeSlots.toDateTime;
	queryParameters.fromSlots = dateTimeSlots.fromSlot;
	queryParameters.toSlots = dateTimeSlots.toSlot;
	var promiseAry = [];
	var reqObj = { interval: request.body.interval };
	promiseAry.push(findReadingsByNode(reqObj['interval'], queryParameters));
	Promise.all(promiseAry).then(function (results) {
		try {
			var data = results[0];
			var objData = { data: {} };
			if (!data || 0 == data.length) { return cb(null, objData); }
			Promise.all([findNodeDataSettings(userTimezoneSettings.companyId, queryParameters.nodeName)]).then(function (nodeResult) {
				try {
					if (0 === Object.keys(nodeResult[0]).length && Object.keys(nodeResult[0]).length !== queryParameters.nodeName.length) {
						responseObj = {};
						responseObj.error = true;
						responseObj.reason = "Error: Unable to get data. Please assign timezone to node.";
						return cb(null, responseObj);
					}
					data = data.sort(function (a, b) {
						if (a['ctime_stamp'] > b['ctime_stamp']) { return -1; }
						else if (a['ctime_stamp'] < b['ctime_stamp']) { return 1; }
						else { return 0; }
					});
					var startIndex = data.length - 1;
					var timeStamp, nodeId, arrNodeData;
					var readings = {};
					var defaultReadingAndUnit = getDefaultReadingAndUnit(request.body.nodeId, request.body.parameterId, nodeResult[0], -1);
					for (var i = startIndex; i >= 0; i--) {
						arrNodeData = JSON.parse(data[i].parameters_values);
						var readingDateTime = momentTimezone.utc(data[i].ctime_stamp).tz(nodeResult[0][data[i].node_id].timezone);
						timeStamp = readingDateTime.format('DD-MM-YYYY HH:mm:ss');
						if ('undefined' == typeof readings[timeStamp]) {
							readings[timeStamp] = lodash.clone(defaultReadingAndUnit['defaultReadingObject']);
							readings[timeStamp]['timestamp'] = momentTimezone.utc(timeStamp + '+0000', 'DD-MM-YYYY HH:mm:ssZ').valueOf();
						}
						nodeId = data[i].node_id;
						request.body.parameterId.forEach(function (parameter, index) {
							readings[timeStamp][nodeId + '_' + parameter] = mathFormat(arrNodeData[parameter], defaultReadingAndUnit['dataUnitObj'][nodeId + '_' + parameter], defaultReadingAndUnit['smallestUnitVal']);
						});
					}
					objData['data'] = readings;
					return cb(null, objData);
				} catch (exception) {
					var responseObj = {};
					responseObj.error = true;
					responseObj.reason = "Error: Unable to get data. Please try again!";
					return cb(null, responseObj);
				}
			});
		} catch (exception) {
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason = "Error: Unable to get data. Please try again!";
			return cb(null, responseObj);
		}
	}).catch(err => {
		var responseObj = {};
		responseObj.error = true;
		responseObj.reason = "Error: Unable to get data. Please try again!";
		return cb(null, responseObj);
	});
};

exports.getProcessedRawData = function (request, cb) {
	var queryParameters = {};
	queryParameters.nodeName = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateObject = momentTimezone.utc(fromDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateObject = momentTimezone.utc(toDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var dateTimeSlots = nodeTimeZoneSlotCalculation(fromDateObject, toDateObject);
	queryParameters.fromDate = dateTimeSlots.fromDateTime;
	queryParameters.toDate = dateTimeSlots.toDateTime;
	queryParameters.fromSlots = dateTimeSlots.fromSlot;
	queryParameters.toSlots = dateTimeSlots.toSlot;
	var readingDateTime;
	var timestamp;
	switch (request.body.interval) {
		case 'fifteen': readingDateTime = fromDateObject.format('DD-MM-YYYY HH:mm') + ' - ' + toDateObject.format('HH:mm');
			timestamp = parseInt(momentTimezone.utc(fromDateObject.format('YYYY-MM-DD') + ' ' + toDateObject.format('HH:mm') + ':00+0000', 'YYYY-MM-DD HH:mm:ssZ').format('x'));
			break;
		case 'hourly': readingDateTime = fromDateObject.format('DD-MM-YYYY HH:mm') + ' - ' + toDateObject.format('HH:mm');
			timestamp = parseInt(momentTimezone.utc(fromDateObject.format('YYYY-MM-DD') + ' ' + toDateObject.format('HH:mm') + ':00+0000', 'YYYY-MM-DD HH:mm:ssZ').format('x'));
			break;
		case 'daily': readingDateTime = fromDateObject.format('DD-MM-YYYY');
			timestamp = parseInt(momentTimezone.utc(fromDateObject.format('YYYY-MM-DD') + ' 00:00:00+0000', 'YYYY-MM-DD HH:mm:ssZ').format('x'));
			break;
		case 'weekly': readingDateTime = fromDateObject.format('DD-MM-YYYY') + ' - ' + toDateObject.format('DD-MM-YYYY');
			timestamp = parseInt(momentTimezone.utc(toDateObject.format('YYYY-MM-DD') + ' 00:00:00+0000', 'YYYY-MM-DD HH:mm:ssZ').format('x'));
			break;
		case 'monthly': readingDateTime = fromDateObject.format('MMM-YYYY');
			timestamp = parseInt(momentTimezone.utc(fromDateObject.format('YYYY-MM') + '-01 00:00:00+0000', 'YYYY-MM-DD HH:mm:ssZ').format('x'));
			break;
		case 'yearly': readingDateTime = fromDateObject.format('YYYY');
			timestamp = parseInt(momentTimezone.utc(fromDateObject.format('YYYY') + '-01-01 00:00:00+0000', 'YYYY-MM-DD HH:mm:ssZ').format('x'));
			break;
		default: readingDateTime = fromDateObject.format('DD-MM-YYYY HH:mm') + ' - ' + toDateObject.format('DD-MM-YYYY HH:mm');
			timestamp = parseInt(momentTimezone.utc(toDateObject.format('YYYY-MM-DD HH:mm') + ':00+0000', 'YYYY-MM-DD HH:mm:ssZ').format('x'));
	}
	report.findRawReadingsByNode(queryParameters, function (err, data) {
		try {
			if (err) {
				responseObj = {};
				responseObj.error = true;
				responseObj.reason = "Error: Unable to get data. Please try again!";
				return cb(null, responseObj);
			}
			var arrData = { data: {} };
			if (!data || 0 == data.length) { return cb(null, arrData); }
			Promise.all([findNodeDataSettings(userTimezoneSettings.companyId, queryParameters.nodeName)]).then(function (nodeResult) {
				try {
					var startIndex = data.length - 1;
					var timeStamp, nodeId, arrNodeData;
					var readings = {};
					var arr = {};
					if (1 == request.body.isinstantaneous) {
						var defaultReadingAndUnit = getDefaultReadingAndUnit(request.body.nodeId, request.body.parameterId, nodeResult[0], 1);
						for (var nodeIndex = 0; nodeIndex < request.body.nodeId.length; nodeIndex++) {
							request.body.parameterId.forEach(function (parameter, index) {
								arr[request.body.nodeId[nodeIndex] + '_' + parameter] = { min: { unitReading: null, lowestUnitReading: null, lowestReading: null, reading: null, unit: '' }, max: { unitReading: null, lowestUnitReading: null, lowestReading: null, reading: null, unit: '' }, average: { unitReading: null, lowestUnitReading: null, lowestReading: null, reading: null, unit: '' }, addition: null, sampling: null, count: null, standardDeviation: null };
							});
						}
						readings = lodash.clone(arr);
						for (var i = startIndex; i >= 0; i--) {
							arrNodeData = JSON.parse(data[i].parameters_values);
							nodeId = data[i].node_id;
							request.body.parameterId.forEach(function (parameter, index) {
								if (arrNodeData[parameter]) {
									var dbReading = parseFloat(arrNodeData[parameter]);
									var minValue = (readings[nodeId + '_' + parameter]['min']['reading']) ? parseFloat(readings[nodeId + '_' + parameter]['min']['reading']) : dbReading;
									var maxValue = (readings[nodeId + '_' + parameter]['max']['reading']) ? parseFloat(readings[nodeId + '_' + parameter]['max']['reading']) : dbReading;
									var minReading = (dbReading > minValue) ? minValue : dbReading;
									var maxReading = (dbReading < maxValue) ? maxValue : dbReading;
									readings[nodeId + '_' + parameter]['min'] = mathFormat(minReading, defaultReadingAndUnit['dataUnitObj'][nodeId + '_' + parameter], defaultReadingAndUnit['smallestUnitVal']);
									readings[nodeId + '_' + parameter]['max'] = mathFormat(maxReading, defaultReadingAndUnit['dataUnitObj'][nodeId + '_' + parameter], defaultReadingAndUnit['smallestUnitVal']);
									readings[nodeId + '_' + parameter]['addition'] = (readings[nodeId + '_' + parameter]['addition']) ? parseFloat(dbReading + readings[nodeId + '_' + parameter]['addition']) : dbReading;
								}
								readings[nodeId + '_' + parameter]['count']++;
							});
						}
						for (var key in readings) {
							var average = (readings[key]['count'] && readings[key]['addition']) ? parseFloat((readings[key]['addition']) / readings[key]['count']) : null;
							readings[key]['average'] = mathFormat(average, defaultReadingAndUnit['dataUnitObj'][key], defaultReadingAndUnit['smallestUnitVal']);
						}
						arrData['data'][readingDateTime] = readings;
						arrData['data'][readingDateTime]['timestamp'] = timestamp;
						return cb(null, arrData);
					} else {
						var defaultReadingAndUnit = getDefaultReadingAndUnit(request.body.nodeId, request.body.parameterId, nodeResult[0], 0);
						for (var nodeIndex = 0; nodeIndex < request.body.nodeId.length; nodeIndex++) {
							request.body.parameterId.forEach(function (parameter, index) {
								arr[request.body.nodeId[nodeIndex] + '_' + parameter] = { startReading: { unitReading: null, lowestUnitReading: null, lowestReading: null, reading: null, unit: '' }, endReading: { unitReading: null, lowestUnitReading: null, lowestReading: null, reading: null, unit: '' }, difference: { unitReading: null, lowestUnitReading: null, lowestReading: null, reading: null, unit: '' }, speed: null, acceleration: null, sampling: null, count: null };
							});
						}
						readings = lodash.clone(arr);
						for (var i = startIndex; i >= 0; i--) {
							arrNodeData = JSON.parse(data[i].parameters_values);
							nodeId = data[i].node_id;
							request.body.parameterId.forEach(function (parameter, index) {
								var dbReading = (arrNodeData[parameter]) ? parseFloat(arrNodeData[parameter]) : null;
								if (0 === readings[nodeId + '_' + parameter]['count']) {
									readings[nodeId + '_' + parameter]['startReading'] = mathFormat(dbReading, defaultReadingAndUnit['dataUnitObj'][nodeId + '_' + parameter], defaultReadingAndUnit['smallestUnitVal']);
								}
								readings[nodeId + '_' + parameter]['count']++;
								readings[nodeId + '_' + parameter]['endReading'] = mathFormat(dbReading, defaultReadingAndUnit['dataUnitObj'][nodeId + '_' + parameter], defaultReadingAndUnit['smallestUnitVal']);
							});
						}

						for (var key in readings) {
							var difference = parseFloat(readings[key]['endReading']['reading'] - readings[key]['startReading']['reading']);
							readings[key]['difference'] = mathFormat(difference, defaultReadingAndUnit['dataUnitObj'][key], defaultReadingAndUnit['smallestUnitVal']);
						}
						arrData['data'][readingDateTime] = readings;
						arrData['data'][readingDateTime]['timestamp'] = timestamp;
						return cb(null, arrData);
					}
				} catch (exception) {
					var responseObj = {};
					responseObj.error = true;
					responseObj.reason = "Error: Unable to get data. Please try again!";
					return cb(null, responseObj);
				}
			});
		} catch (exception) {
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason = "Error: Unable to get data. Please try again!";
			return cb(null, responseObj);
		}
	});
};

function createDailyArray(fromDate, toDate) {
	var objData = {};
	while (fromDate <= toDate) {
		objData[fromDate.format('DD-MM-YYYY')] = { timestamp: momentTimezone.utc(fromDate.format('YYYY-MM-DD'), 'YYYY-MM-DD').valueOf() };
		fromDate.add(1, 'days');
	}
	return objData;
}

function createTimeAsPerDataPoints(addValue, totalSlot) {
	toTime = '00:00';
	objSlot = {};
	for (i = 1; i < totalSlot; i++) {
		var dateTime = new Date("2015-06-17 " + toTime);
		toTime = moment("2015-06-17 " + toTime).format("HH:mm");
		fromTime = new Date("2015-06-17 " + toTime);
		fromTime.setMinutes(dateTime.getMinutes() + addValue);
		objSlot[i] = [];
		objSlot[i] = [toTime, moment(fromTime).format("HH:mm")];
		toTime = moment(fromTime).format("HH:mm");
	}
	objSlot[totalSlot] = [moment(fromTime).format("HH:mm"), '23:59'];
	return objSlot;
}

function generateWeekObjects(fromYear, toYear, startDate, endDate) {
	// console.log("fromYear =>",fromYear);
	// console.log("toYear =>",toYear);
	// console.log("startDate =>",startDate);
	// console.log("endDate =>", endDate);
	var actualFromDate = momentTimezone.utc(startDate, 'YYYY-MM-DD HH:mm:ssZ').startOf('isoWeek');
	var actualEndDate = momentTimezone.utc(endDate, 'YYYY-MM-DD HH:mm:ssZ').endOf('isoWeek');
	var actualFromDateTimestamp = momentTimezone(actualFromDate).valueOf();
	var actualEndDateTimestamp = momentTimezone(actualEndDate).valueOf();
	// var fromDate = momentTimezone.utc(fromYear + '-01-01 00:00:00+0000', 'YYYY-MM-DD HH:mm:ssZ').day(1).isoWeek(1);
	var fromDate = momentTimezone.utc('2022' + '-01-01 00:00:00+0000', 'YYYY-MM-DD HH:mm:ssZ').day(1).isoWeek(1);
	var objData = { slot: {}, data: {} };
	console.log('actualFromDate==', actualFromDate, 'actualEndDate---', actualEndDate, 'fromDate--', fromDate)
	var startIndex = 1, currentProcessYear, startDateTimeStamp, endDateTimeStamp;
	while (fromYear <= toYear) {
		startIndex = 1;
		objData['slot'][fromYear] = {};
		currentProcessYear = fromYear;
		do {
			startDateTimeStamp = fromDate.startOf('isoWeek').valueOf();
			endDateTimeStamp = fromDate.endOf('isoWeek').valueOf();
			weeknumber = momentTimezone(fromDate).isoWeek();
			if ((startDateTimeStamp >= actualFromDateTimestamp && endDateTimeStamp <= actualEndDateTimestamp)) {
				var dateFrom = fromDate.startOf('isoWeek').format('DD-MM-YYYY');
				var dateTo = fromDate.endOf('isoWeek').format('DD-MM-YYYY');
				objData['slot'][fromYear][startIndex] = dateFrom + ' - ' + dateTo;
				objData['data'][dateFrom + ' - ' + dateTo] = { timestamp: momentTimezone.utc(dateTo + ' 00:00:00+00:00', 'DD-MM-YYYY HH:mm:ssZ').valueOf() };
				fromDate = fromDate.add(1, 'week');
			} else {
				fromDate = fromDate.add(1, 'week');
			}
			startIndex++;
			currentProcessYear = fromDate.format('YYYY');
		} while (currentProcessYear == fromYear);
		fromYear++;
	}
	return objData;
}

function createMonthsYear() {
	var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	arrMonthsYear = [];
	var startYear = 2017;
	var month = 0;
	for (var i = 1; i <= 60; i++) {
		arrMonthsYear[i] = monthNames[month] + ' ' + startYear;
		if (11 <= month) {
			month = 0;
			startYear = startYear + 1;
		} else {
			month++;
		}
	}
	return arrMonthsYear;
}

function createMonths(fromMonth, toMonth) {
	var arrData = {};
	fromMonth = moment(fromMonth, "YYYY-MM").format("YYYY-MM");
	toMonth = moment(toMonth, "YYYY-MM").format("YYYY-MM");
	while (fromMonth <= toMonth) {
		currentMonth = moment(fromMonth + '-01').format('DD-MM-YYYY');
		fromMonth = moment(fromMonth).format('MMM YYYY');
		arrData[fromMonth] = {};
		fromMonth = moment(currentMonth, 'DD-MM-YYYY').add(1, 'M').format('YYYY-MM');
	}
	return arrData;
}

function createYearlyArray(fromYear, toYear) {
	var arrData = {};
	for (i = fromYear; i <= toYear; i++) {
		arrData[i] = {};
	}
	return arrData;
}

function createYear() {
	arrYears = ['NoYear'];
	var startYear = 2017;
	for (var i = 1; i <= 10; i++) {
		arrYears[i] = startYear++;
	}
	return arrYears.map(String);
}

function createIntervalDataArray(fromDateTime, toDateTime, userTimezone, intervalInMinutes) {
	var objData = {};
	var objTime = {};
	if (15 == intervalInMinutes) {
		objTime = { "00:15": "00:15", "00:30": "00:30", "00:45": "00:45", "01:00": "01:00", "01:15": "01:15", "01:30": "01:30", "01:45": "01:45", "02:00": "02:00", "02:15": "02:15", "02:30": "02:30", "02:45": "02:45", "03:00": "03:00", "03:15": "03:15", "03:30": "03:30", "03:45": "03:45", "04:00": "04:00", "04:15": "04:15", "04:30": "04:30", "04:45": "04:45", "05:00": "05:00", "05:15": "05:15", "05:30": "05:30", "05:45": "05:45", "06:00": "06:00", "06:15": "06:15", "06:30": "06:30", "06:45": "06:45", "07:00": "07:00", "07:15": "07:15", "07:30": "07:30", "07:45": "07:45", "08:00": "08:00", "08:15": "08:15", "08:30": "08:30", "08:45": "08:45", "09:00": "09:00", "09:15": "09:15", "09:30": "09:30", "09:45": "09:45", "10:00": "10:00", "10:15": "10:15", "10:30": "10:30", "10:45": "10:45", "11:00": "11:00", "11:15": "11:15", "11:30": "11:30", "11:45": "11:45", "12:00": "12:00", "12:15": "12:15", "12:30": "12:30", "12:45": "12:45", "13:00": "13:00", "13:15": "13:15", "13:30": "13:30", "13:45": "13:45", "14:00": "14:00", "14:15": "14:15", "14:30": "14:30", "14:45": "14:45", "15:00": "15:00", "15:15": "15:15", "15:30": "15:30", "15:45": "15:45", "16:00": "16:00", "16:15": "16:15", "16:30": "16:30", "16:45": "16:45", "17:00": "17:00", "17:15": "17:15", "17:30": "17:30", "17:45": "17:45", "18:00": "18:00", "18:15": "18:15", "18:30": "18:30", "18:45": "18:45", "19:00": "19:00", "19:15": "19:15", "19:30": "19:30", "19:45": "19:45", "20:00": "20:00", "20:15": "20:15", "20:30": "20:30", "20:45": "20:45", "21:00": "21:00", "21:15": "21:15", "21:30": "21:30", "21:45": "21:45", "22:00": "22:00", "22:15": "22:15", "22:30": "22:30", "22:45": "22:45", "23:00": "23:00", "23:15": "23:15", "23:30": "23:30", "23:45": "23:45", "00:00": "23:59" };
	} else if (60 == intervalInMinutes) {
		objTime = { "01:00": "01:00", "02:00": "02:00", "03:00": "03:00", "04:00": "04:00", "05:00": "05:00", "06:00": "06:00", "07:00": "07:00", "08:00": "08:00", "09:00": "09:00", "10:00": "10:00", "11:00": "11:00", "12:00": "12:00", "13:00": "13:00", "14:00": "14:00", "15:00": "15:00", "16:00": "16:00", "17:00": "17:00", "18:00": "18:00", "19:00": "19:00", "20:00": "20:00", "21:00": "21:00", "22:00": "22:00", "23:00": "23:00", "00:00": "23:59" };
	}
	var currentToDateTime = momentTimezone.utc(momentTimezone.tz(userTimezone).format('YYYY-MM-DD HH:mm:ss') + '+0000', 'YYYY-MM-DD HH:mm:ssZ');
	currentToDateTime = (toDateTime > currentToDateTime) ? currentToDateTime.subtract(intervalInMinutes, 'minutes') : toDateTime;
	while (fromDateTime < currentToDateTime) {
		var endTime = momentTimezone(fromDateTime).add(intervalInMinutes, 'minutes').format('HH:mm');
		var dateString = fromDateTime.format('HH:mm') + ' - ' + objTime[endTime];
		objData[fromDateTime.format('DD-MM-YYYY') + ' ' + dateString] = { timestamp: momentTimezone.utc(fromDateTime.format('YYYY-MM-DD') + ' ' + objTime[endTime] + ':00+0000', 'YYYY-MM-DD HH:mm:ssZ').valueOf() };
		fromDateTime.add(intervalInMinutes, 'minutes');
	}
	return objData;
}

nodeTimeZoneSlotCalculation = function (fromDateTime, toDateTime) {
	var startingTime = moment('2017-01-01 00:00:00', 'YYYY-MM-DD HH:mm:ss').valueOf();
	var fromSlot = Math.floor((((moment(fromDateTime.format('YYYY-MM-DD HH:mm:ss')).valueOf() - startingTime) / 1000) / 60) / 15);
	var toSlot = Math.floor((((moment(toDateTime.format('YYYY-MM-DD HH:mm:ss')).valueOf() - startingTime) / 1000) / 60) / 15);
	return { 'fromDateTime': fromDateTime, 'fromSlot': fromSlot, 'toDateTime': toDateTime, 'toSlot': toSlot };
}

getCurrentUserTimezone = function (request) {
	if (request.session && true == request.session.passport.user.timezone_setting && '' != request.session.passport.user.timezone && '' != request.session.passport.user.timezone_offset) {
		return { 'timezone': request.session.passport.user.timezone, 'timezoneOffset': request.session.passport.user.timezone_offset, 'companyId': request.session.passport.user.company_id };
	} else if ('undefined' != typeof request.fromDifferentApi && true == request.body.timezone_setting && '' != request.body.timezone && '' != request.body.timezone_offset) {
		return { 'timezone': request.body.timezone, 'timezoneOffset': request.body.timezone_offset, 'companyId': request.body.company_id };
	}
	return { 'timezone': 'Africa/Freetown', 'timezoneOffset': '+0000', 'companyId': request.session.passport.user.company_id };
}

exports.getNodeFifteenMinDailyData = function (request, cb) {
	var queryParameters = {};
	queryParameters.nodeId = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateTimeObject = momentTimezone.utc(toDateTime[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	queryParameters.fromDate = fromDateTimeObject.format('YYYY-MM-DD');
	queryParameters.toDate = toDateTimeObject.format('YYYY-MM-DD');
	report.findFifteenMinDailyReadingsByNode(queryParameters, function (err, data) {
		try {
			if (err || !data || 'undefined' == typeof data) {
				responseObj = {};
				responseObj.error = true;
				responseObj.reason = "Error: Unable to get data. Please try again!";
				return cb(null, responseObj);
			}
			return cb(null, data);
		} catch (exception) {
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason = "Error: Unable to get data. Please try again!";
			return cb(null, responseObj);
		}
	});
};

function getSparkAPIData(reqObj, queryParameters) {
	return new Promise((resolve, reject) => {
		switch (reqObj['interval']) {
			case 'fifteen':
				sparkAPI.getFifteenMinutesSparkData(queryParameters, reqObj['currentDate'], function (err, data) {
					if (err) {
						return reject(err);
					}
					return resolve(data);
				});
				break;

			case 'hourly':
				sparkAPI.getHourlySparkData(queryParameters, reqObj['currentDate'], function (err, data) {
					if (err) {
						return reject(err);
					}
					return resolve(data);
				});
				break;
		}
	});
}
function findReadingstestByNode(dates, queryParameters, parameterType) {
	console.log(queryParameters)
	return new Promise((resolve, reject) => {
		startdate = moment(queryParameters.fromDate, 'YYYY-MM-DD').startOf('isoWeek').format("YYYY-MM-DD");
		enddate = moment(queryParameters.toDate, 'YYYY-MM-DD').endOf('isoWeek').format("YYYY-MM-DD");
		report.findDailytestReadingsByNode(queryParameters, startdate, enddate, function (err, data) {
			// console.log('hhhh', data)
			if (err) {
				return reject(err);
			}
			var xx = {}
			var a, s, e, sample = 0, count = 0, min, max, avg = 0;
			try {
				for (var i = 0; i < data.length; i++) {
					if (null != data[i].dvalues && '' != data[i].dvalues) {
						var date = data[i].reading_date;
						var weeknumber = momentTimezone(date, "YYYY-MM-DD").isoWeek();
						if (xx[weeknumber] == undefined) {
							xx[weeknumber] = []
						}
						var a = data[i].dvalues.split(',');
						xx[weeknumber].push(a)
					}
				}
				// console.log('hhll', xx)
				var z = {}; var dataArray = [], object = {};
				if (0 == parameterType) {
					for (var j in xx) {
						for (var k = 0; k < xx[j].length; k++) {
						// for (var k = 0; k < j.length; k++) {
							s = xx[j][k][0];
							e = xx[j][xx[j].length - 1][1];
							// e = xx[j][j.length - 1][1];
							d = e - s;
							count = parseInt(xx[j][k][4]);
							count = count + count;
							sample = (sample + parseFloat(xx[j][k][3]));
						}
						if (z[j] == undefined) {
							z[j] = []
						}
						sample = sample/xx[j].length
						z[j].push(s, e, d, sample, count)
						z[j] = z[j].toString();
					}
				}
				if (1 == parameterType) {
					var test =  {}
					for (var j in xx) {
						if (z[j] == undefined) {
							z[j] = []
						}
						if (z[j]['min'] == undefined) {
							z[j]['min'] = []
						}
						if (z[j]['max'] == undefined) {
							z[j]['max'] = []
						}
						console.log(xx[j].length)
						for (var k = 0; k < xx[j].length; k++) {
							avg = (avg + parseInt(xx[j][k][0]) / xx[j].length);
							count = count + parseInt(xx[j][k][5]);
							// count = count + count
							sample = (sample + parseFloat(xx[j][k][4]));
							z[j]['min'].push(xx[j][k][2])
							z[j]['max'].push(xx[j][k][3])
						}
						z[j]['min'] = math.min(z[j]['min'])
						z[j]['max'] = math.max(z[j]['max'])
						if (test[j] == undefined) {
							test[j] = []
						}
						sample = sample/xx[j].length
						z[j].push(avg,0,z[j]['min'], z[j]['max'], sample, count)
						z[j] = z[j].toString();
						console.log('final objetc',z)
					}
				}
				object['wnode_id'] = queryParameters.nodeId;
				object['wdate'] = parseInt(queryParameters.fromYear);
				object['wparameters'] = queryParameters.parameters;
				object['wvalues'] = z;
				dataArray.push(object)
			} catch (e) {
				console.log(e);
			}
			return resolve(dataArray);
		});
	});
}
function findReadingsByNode(interval, queryParameters) {
	return new Promise((resolve, reject) => {
		switch (interval) {
			case 'fifteen':
				report.findFifteenMinutesReadingsByNode(queryParameters, function (err, data) {
					if (err) {
						return reject(err);
					}
					return resolve(data);
				});
				break;

			case 'hourly':
				report.findHourlyReadingsByNode(queryParameters, function (err, data) {
					if (err) {
						return reject(err);
					}
					return resolve(data);
				});
				break;

			case 'daily':
				report.findDailyReadingsByNode(queryParameters, function (err, data) {
					if (err) {
						return reject(err);
					}
					return resolve(data);
				});
				break;

			case 'weekly':
				report.findWeeklyReadingsByNode(queryParameters, function (err, data) {
					if (err) {
						return reject(err);
					}
					return resolve(data);
				});
				break;

			case 'monthly':
				report.findMonthlyReadingsByNode(queryParameters, function (err, data) {
					if (err) {
						return reject(err);
					}
					return resolve(data);
				});
				break;

			case 'yearly':
				report.findYearlyReadingsByNode(queryParameters, function (err, data) {
					if (err) {
						return reject(err);
					}
					return resolve(data);
				});
				break;

			case 'all':
				report.findRawReadingsByNode(queryParameters, function (err, data) {
					if (err) {
						return reject(err);
					}
					return resolve(data);
				});
				break;
		}
	});
}

function findNodeDataSettings(companyId, nodeUniqueIdAry) {
	return new Promise((resolve, reject) => {
		report.findNodeDataSettings(companyId, nodeUniqueIdAry, function (err, nodeResult) {
			if (err) {
				return reject(err);
			}
			var nodeObj = {};
			for (var nodeIndex in nodeResult) {
				nodeObj[nodeResult[nodeIndex]['node_unique_id']] = nodeResult[nodeIndex];
			}
			return resolve(nodeObj);
		})
	});
}

function getDefaultReadingAndUnit(nodeIdAry, parameterIdAry, nodeData, parameterType) {
	var defaultReadingObject = {};
	var dataUnitObj = {};
	var unitPrefixObj = getUnitPrefix();
	var unitValueAry = [];
	for (var nodeIndex = 0; nodeIndex < nodeIdAry.length; nodeIndex++) {
		var nodeDataSettingObj = ('undefined' != typeof nodeData[nodeIdAry[nodeIndex]]['data_settings'] && null != nodeData[nodeIdAry[nodeIndex]]['data_settings']) ? JSON.parse(nodeData[nodeIdAry[nodeIndex]]['data_settings']) : '';
		parameterIdAry.forEach(function (parameter, index) {
			if (parameterType == -1) defaultReadingObject[nodeIdAry[nodeIndex] + '_' + parameter] = { unitReading: null, lowestUnitReading: null, lowestReading: null, reading: null, unit: '' }
			else if (parameterType == 1) defaultReadingObject[nodeIdAry[nodeIndex] + '_' + parameter] = { min: { unitReading: null, lowestUnitReading: null, lowestReading: null, reading: null, unit: '' }, max: { unitReading: null, lowestUnitReading: null, lowestReading: null, reading: null, unit: '' }, average: { unitReading: null, lowestUnitReading: null, lowestReading: null, reading: null, unit: '' }, sampling: null, count: null, standardDeviation: null };
			else if (parameterType == 0) defaultReadingObject[nodeIdAry[nodeIndex] + '_' + parameter] = { startReading: { unitReading: null, lowestUnitReading: null, lowestReading: null, reading: null, unit: '' }, endReading: { unitReading: null, lowestUnitReading: null, lowestReading: null, reading: null, unit: '' }, difference: { unitReading: null, lowestUnitReading: null, lowestReading: null, reading: null, unit: '' }, speed: null, acceleration: null, sampling: null, count: null };
			var dataUnitAry = [];
			dataUnitAry[0] = (nodeDataSettingObj && 'undefined' != typeof nodeDataSettingObj['incomingDataUnit'] && 'undefined' != typeof nodeDataSettingObj['incomingDataUnit'][parameter]) ? nodeDataSettingObj['incomingDataUnit'][parameter] : '';
			dataUnitAry[1] = (nodeDataSettingObj && 'undefined' != typeof nodeDataSettingObj['displayDataUnit'] && 'undefined' != typeof nodeDataSettingObj['displayDataUnit'][parameter]) ? nodeDataSettingObj['displayDataUnit'][parameter] : '';
			var baseUnit = '';
			if ('undefined' != typeof unitPrefixObj['nameObj'][dataUnitAry[1]]) {
				baseUnit = unitPrefixObj['nameObj'][dataUnitAry[1]]['unit'];
				unitValueAry.push(unitPrefixObj['nameObj'][dataUnitAry[1]]['value']);
			}
			dataUnitObj[nodeIdAry[nodeIndex] + '_' + parameter] = { dataUnit: dataUnitAry, baseUnit: baseUnit, autoUnit: nodeDataSettingObj['autoUnit'] };
		});
	}
	var smallestUnitVal = unitValueAry.length > 0 ? Math.min(...unitValueAry) : '';
	return { defaultReadingObject: defaultReadingObject, dataUnitObj: dataUnitObj, smallestUnitVal: smallestUnitVal };
}

function sortCummulativeData(defaultReadingAndUnit, objNonSortData, requestObject, lastRecordDate) {
	var previousKey = '';
	var objReadings = {};
	var objPreviousValues = {};
	for (var key in objNonSortData) {
		if (1 == Object.keys(objNonSortData[key]).length) {
			timestamp = objNonSortData[key]['timestamp'];
			objNonSortData[key] = lodash.cloneDeep(defaultReadingAndUnit['defaultReadingObject']);
			objNonSortData[key]['timestamp'] = timestamp;
		}
		if (0 == requestObject.readingGap) {
			objReadings[key] = {};
			objReadings[key] = objNonSortData[key];
			continue;
		}
		for (var node in objNonSortData[key]) {
			if ('timestamp' == node) {
				continue;
			}
			if (null != objNonSortData[key][node]['startReading']['unitReading']) {
				if ('undefined' !== typeof objPreviousValues[node]) {
					previousKey = objPreviousValues[node];
					objNonSortData[previousKey][node]['difference'] = (null !== objNonSortData[previousKey][node]['difference']['unitReading']) ? mathEval(objNonSortData[previousKey][node]['difference']['unitReading'] + ' + (' + ((null != objNonSortData[key][node]['startReading']['unitReading']) ? objNonSortData[key][node]['startReading']['unitReading'] : 0 + ' ' + defaultReadingAndUnit['dataUnitObj'][node]['dataUnit'][1]) + ' - ' + ((null != objNonSortData[previousKey][node]['endReading']['unitReading']) ? objNonSortData[previousKey][node]['endReading']['unitReading'] : 0 + ' ' + defaultReadingAndUnit['dataUnitObj'][node]['dataUnit'][1]) + ')', defaultReadingAndUnit['dataUnitObj'][node], defaultReadingAndUnit['smallestUnitVal']) : (mathEval('0 + (' + objNonSortData[key][node]['startReading']['unitReading'] + ' - ' + objNonSortData[previousKey][node]['endReading']['unitReading'] + ')', defaultReadingAndUnit['dataUnitObj'][node], defaultReadingAndUnit['smallestUnitVal']));
					objNonSortData[previousKey][node]['endReading'] = objNonSortData[key][node]['startReading'];
				}
				objPreviousValues[node] = '';
				objPreviousValues[node] = key;
			}
		}
		if (lastRecordDate == key) {
			break;
		}
		objReadings[key] = {};
		objReadings[key] = objNonSortData[key];
	}
	return objReadings;
}


function sortCummulativeDataByDateFormat(defaultReadingAndUnit, objNonSortData, requestObject, lastRecordDate, dateFormat) {
	console.log('in', defaultReadingAndUnit, objNonSortData, requestObject, lastRecordDate, dateFormat)
	var previousKey = '';
	var objReadings = {};
	var objPreviousValues = {};
	for (var key in objNonSortData) {
		if (0 == Object.keys(objNonSortData[key]).length) {
			timestamp = momentTimezone.utc(key + '+0000', dateFormat).valueOf();
			//timestamp = objNonSortData[key]['timestamp'];
			objNonSortData[key] = lodash.cloneDeep(defaultReadingAndUnit['defaultReadingObject']);
			objNonSortData[key]['timestamp'] = timestamp;
		}
		if (0 == requestObject.readingGap) {
			objReadings[key] = {};
			objReadings[key] = objNonSortData[key];
			continue;
		}
		for (var node in objNonSortData[key]) {
			if ('timestamp' == node) {
				continue;
			}
			if (null != objNonSortData[key][node]['startReading']['unitReading']) {
				if ('undefined' !== typeof objPreviousValues[node]) {
					previousKey = objPreviousValues[node];
					objNonSortData[previousKey][node]['difference'] = (null !== objNonSortData[previousKey][node]['difference']['unitReading']) ? mathEval(objNonSortData[previousKey][node]['difference']['unitReading'] + ' + (' + ((null != objNonSortData[key][node]['startReading']['unitReading']) ? objNonSortData[key][node]['startReading']['unitReading'] : 0 + ' ' + defaultReadingAndUnit['dataUnitObj'][node]['dataUnit'][1]) + ' - ' + ((null != objNonSortData[previousKey][node]['endReading']['unitReading']) ? objNonSortData[previousKey][node]['endReading']['unitReading'] : 0 + ' ' + defaultReadingAndUnit['dataUnitObj'][node]['dataUnit'][1]) + ')', defaultReadingAndUnit['dataUnitObj'][node], defaultReadingAndUnit['smallestUnitVal']) : (mathEval('0 + (' + objNonSortData[key][node]['startReading']['unitReading'] + ' - ' + objNonSortData[previousKey][node]['endReading']['unitReading'] + ')', defaultReadingAndUnit['dataUnitObj'][node], defaultReadingAndUnit['smallestUnitVal']));
					objNonSortData[previousKey][node]['endReading'] = objNonSortData[key][node]['startReading'];
				}
				objPreviousValues[node] = '';
				objPreviousValues[node] = key;
			}
		}
		if (lastRecordDate == key) {
			break;
		}
		objReadings[key] = {};
		objReadings[key] = objNonSortData[key];
	}
	return objReadings;
}

function sortInstantaneousData(defaultReadingAndUnit, objNonSortData, lastRecordDate) {
	if (lastRecordDate) {
		var objReadings = {};
		for (var key in objNonSortData) {
			if (1 == Object.keys(objNonSortData[key]).length) {
				timestamp = objNonSortData[key]['timestamp'];
				objNonSortData[key] = lodash.cloneDeep(defaultReadingAndUnit['defaultReadingObject']);
				objNonSortData[key]['timestamp'] = timestamp;
			}
			if (lastRecordDate == key) {
				break;
			}
			objReadings[key] = {};
			objReadings[key] = objNonSortData[key];
		}
		return objReadings;
	}
	if (!lastRecordDate) {
		for (var key in objNonSortData) {
			if (1 == Object.keys(objNonSortData[key]).length) {
				timestamp = objNonSortData[key]['timestamp'];
				objNonSortData[key] = lodash.cloneDeep(defaultReadingAndUnit['defaultReadingObject']);
				objNonSortData[key]['timestamp'] = timestamp;
			}
		}
		return objNonSortData;
	}
}

function sortInstantaneousDataByDateFormat(defaultReadingAndUnit, objNonSortData, dateFormat) {
	for (var key in objNonSortData) {
		if (0 == Object.keys(objNonSortData[key]).length) {
			timestamp = momentTimezone.utc(key + '+0000', dateFormat).valueOf();
			objNonSortData[key] = lodash.cloneDeep(defaultReadingAndUnit['defaultReadingObject']);
			objNonSortData[key]['timestamp'] = timestamp;
		}
	}
	return objNonSortData;
}

function getUnitPrefix() {
	if (Object.keys(unitPrefixObj).length == 0) {
		var localUnitPrefixObj = { nameObj: {}, valueObj: {} };
		var responseObj = math.type.Unit.getUnitList();
		for (var unitIndex in responseObj['UNITS']) {
			if ('undefined' == typeof localUnitPrefixObj['valueObj'][unitIndex]) {
				localUnitPrefixObj['valueObj'][unitIndex] = {};
			}
			for (var prefixIndex in responseObj['UNITS'][unitIndex]['prefixes']) {
				localUnitPrefixObj['nameObj'][prefixIndex + unitIndex] = { unit: unitIndex, value: responseObj['UNITS'][unitIndex]['prefixes'][prefixIndex]['value'] };
				localUnitPrefixObj['valueObj'][unitIndex][responseObj['UNITS'][unitIndex]['prefixes'][prefixIndex]['value']] = prefixIndex + unitIndex;
			}
		}
		unitPrefixObj = localUnitPrefixObj;
		return unitPrefixObj;
	}
	else {
		return unitPrefixObj;
	}
}

mathFormat = function (readingValue, dataUnitObj, smallestUnit) {
	if (null === readingValue || readingValue == 'null' || 'undefined' == typeof readingValue) {
		return { unitReading: null, lowestUnitReading: null, lowestReading: null, reading: null, unit: '' };
	}
	if ('' == dataUnitObj['dataUnit'][0]) { //If data incoming unit not defined then return value
		return { unitReading: readingValue + ' ', lowestUnitReading: readingValue + ' ', lowestReading: parseFloat(readingValue), reading: parseFloat(readingValue), unit: '' };
	}
	if ('' == dataUnitObj['dataUnit'][1]) { //If data incoming unit not defined then return value
		return { unitReading: readingValue + ' ', lowestUnitReading: readingValue + ' ', lowestReading: parseFloat(readingValue), reading: parseFloat(readingValue), unit: '' };
	}
	var actualValue = math.to(math.unit(readingValue, dataUnitObj['dataUnit'][0]), dataUnitObj['dataUnit'][0]);//Convert to unit
	//Convert to visualization defined unit. If not defined then set to autoexponential:{lower:1e-50,upper:1e+50}}))
	var convertedValue = (dataUnitObj['autoUnit'] === true || '' == dataUnitObj['dataUnit'][1]) ? math.format(actualValue, { notation: "auto", precision: 3, exponential: { lower: 1e-50, upper: 1e+50 } }) : math.format(actualValue.to(dataUnitObj['dataUnit'][1]), { notation: "fixed", precision: 3, exponential: { lower: 1e-50, upper: 1e+50 } });
	convertedValue = convertedValue.replace(/[()]/g, '');
	var lowestConvertedValue = convertedValue;
	if ('undefined' != typeof unitPrefixObj['nameObj'][dataUnitObj['dataUnit'][1]] && smallestUnit) {
		if (unitPrefixObj['nameObj'][dataUnitObj['dataUnit'][1]]['value'] > smallestUnit && 'undefined' != typeof unitPrefixObj['valueObj'][dataUnitObj['baseUnit']][smallestUnit]) {
			lowestConvertedValue = (dataUnitObj['autoUnit'] === true || '' == dataUnitObj['dataUnit'][1]) ? math.format(actualValue, { notation: "fixed", precision: 3, exponential: { lower: 1e-50, upper: 1e+50 } }) : math.format(actualValue.to(unitPrefixObj['valueObj'][dataUnitObj['baseUnit']][smallestUnit]), { notation: "fixed", precision: 3, exponential: { lower: 1e-50, upper: 1e+50 } });
			lowestConvertedValue = lowestConvertedValue.replace(/[()]/g, '');
		}
	}
	var convertedValueAry = convertedValue.split(' ');
	var lowestConvertedValueAry = lowestConvertedValue.split(' ');
	return { unitReading: convertedValue, lowestUnitReading: lowestConvertedValue, lowestReading: parseFloat(lowestConvertedValueAry[0]), reading: parseFloat(convertedValueAry[0]), unit: dataUnitObj['dataUnit'][1] };
}

mathEval = function (expression, dataUnitObj, smallestUnit) {
	if (null === expression || expression == 'null' || 'undefined' == typeof expression) {//If expression blank
		return { unitReading: null, lowestUnitReading: null, lowestReading: null, reading: null, unit: '' };
	}
	if ('' == dataUnitObj['dataUnit'][0]) { //If data incoming unit not defined then return value
		var actualValue = math.eval(expression);
		return { unitReading: actualValue + ' ', lowestUnitReading: actualValue + ' ', lowestReading: parseFloat(actualValue), reading: parseFloat(actualValue), unit: '' };
	}
	if ('' == dataUnitObj['dataUnit'][1]) { //If data incoming unit not defined then return value
		var actualValue = math.eval(expression);
		return { unitReading: actualValue + ' ', lowestUnitReading: actualValue + ' ', lowestReading: parseFloat(actualValue), reading: parseFloat(actualValue), unit: '' };
	}
	var actualValue = math.eval(expression);
	var convertedValue = (dataUnitObj['autoUnit'] === true || '' == dataUnitObj['dataUnit'][1]) ? math.format(actualValue, { notation: "auto", precision: 3, exponential: { lower: 1e-50, upper: 1e+50 } }) : math.format(actualValue.to(dataUnitObj['dataUnit'][1]), { notation: "fixed", precision: 3, exponential: { lower: 1e-50, upper: 1e+50 } });
	convertedValue = convertedValue.replace(/[()]/g, '');
	var lowestConvertedValue = convertedValue;
	if ('undefined' != typeof unitPrefixObj['nameObj'][dataUnitObj['dataUnit'][1]] && smallestUnit) {
		if (unitPrefixObj['nameObj'][dataUnitObj['dataUnit'][1]]['value'] > smallestUnit && 'undefined' != typeof unitPrefixObj['valueObj'][dataUnitObj['baseUnit']][smallestUnit]) {
			lowestConvertedValue = (dataUnitObj['autoUnit'] === true || '' == dataUnitObj['dataUnit'][1]) ? math.format(actualValue, { notation: "fixed", precision: 3, exponential: { lower: 1e-50, upper: 1e+50 } }) : math.format(actualValue.to(unitPrefixObj['valueObj'][dataUnitObj['baseUnit']][smallestUnit]), { notation: "fixed", precision: 3, exponential: { lower: 1e-50, upper: 1e+50 } });
			lowestConvertedValue = lowestConvertedValue.replace(/[()]/g, '');
		}
	}
	var convertedValueAry = convertedValue.split(' ');
	var lowestConvertedValueAry = lowestConvertedValue.split(' ');
	return { unitReading: convertedValue, lowestUnitReading: lowestConvertedValue, lowestReading: parseFloat(lowestConvertedValueAry[0]), reading: parseFloat(convertedValueAry[0]), unit: dataUnitObj['dataUnit'][1] };
}


exports.realTimeData = function (request, cb) {
	try {
		var objData = request.body;
		var nodeDataSettingObj = ('undefined' != typeof request.session[request.body.meter] && null != request.session[request.body.meter]) ? JSON.parse(request.session[request.body.meter]) : '';
		for (var parameter in request.body) {
			if (parameter == 'meter' || parameter == 'slot') continue;
			var dataUnitAry = [];
			dataUnitAry[0] = (nodeDataSettingObj && 'undefined' != typeof nodeDataSettingObj['incomingDataUnit'] && 'undefined' != typeof nodeDataSettingObj['incomingDataUnit'][parameter]) ? nodeDataSettingObj['incomingDataUnit'][parameter] : '';
			dataUnitAry[1] = (nodeDataSettingObj && 'undefined' != typeof nodeDataSettingObj['displayDataUnit'] && 'undefined' != typeof nodeDataSettingObj['displayDataUnit'][parameter]) ? nodeDataSettingObj['displayDataUnit'][parameter] : '';
			if (dataUnitAry[0] && dataUnitAry[1]) {
				var actualValue = math.to(math.unit(request.body[parameter], dataUnitAry[0]), dataUnitAry[0]);//Convert to unit
				var convertedValue = (nodeDataSettingObj['autoUnit'] === true || '' == dataUnitAry[1]) ? math.format(actualValue, { notation: "auto", precision: 3, exponential: { lower: 1e-50, upper: 1e+50 } }) : math.format(actualValue.to(dataUnitAry[1]), { notation: "fixed", precision: 3, exponential: { lower: 1e-50, upper: 1e+50 } });
				convertedValue = convertedValue.replace(/[()]/g, '');
				objData[parameter] = { unitReading: convertedValue, reading: parseFloat(convertedValue), unit: dataUnitAry[0] };
			}
			else objData[parameter] = { unitReading: request.body[parameter] + ' ', reading: parseFloat(request.body[parameter]), unit: dataUnitAry[0] };
		}
		return cb(null, JSON.stringify(objData));
	}
	catch (exception) {
		console.log('exception - ', exception)
	}
};