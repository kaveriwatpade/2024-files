var express = require('express');
var router = express.Router();
var alarmandnotification = require('../../models').alarmandnotification;
var authenticationHelpers = require('../authentication-helpers');
var Promise = require('promise');
var general = require(__base + 'models').general;
var meterIndexObj = {};
var lodash = require('lodash');
var fs = require('fs');

router.post('/alarmList', authenticationHelpers.isClientAuth, function (req, res) {
	alarmandnotification.alarmList(req.session.passport.user, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": true, "reason": "No records found.", "result": [] });
			return res;
		}
		res.json({ "error": false, "result": result });
		res.end();
		return res;
	});
});

router.post('/submitAlarm', authenticationHelpers.isClientAuth, function (req, res) {
	req.body.category = 'alarm';
	if (req.body.action == 'add') {
		alarmandnotification.addAlarm(req.body, req.session.passport.user, function (err) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			alarmandnotification.getAlarm(req.session.passport.user, function (err, result) {
				if (err) {
					res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
					return res;
				}
				req.body.alarmId = result.alarm_id;
				req.body.addedDatetime = result.added_datetime;
				req.body.activeSince = result.active_since;
				ssh2Connection(req, res);
			});
		});
	}

	if (req.body.action == 'edit') {
		alarmandnotification.updateAlarm(req.body, req.session.passport.user, function (err) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			ssh2Connection(req, res);
		});
	}

	if (req.body.action == 'delete') {
		alarmandnotification.deleteAlarm(req.body, req.session.passport.user, function (err) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			ssh2Connection(req, res);
		});
	}

	if (req.body.action == 'status') {
		alarmandnotification.updateAlarmStatus(req.body, req.session.passport.user, function (err) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			ssh2Connection(req, res);
		});
	}
});

router.post('/notificationList', authenticationHelpers.isClientAuth, function (req, res) {
	alarmandnotification.notificationList(req.session.passport.user, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": true, "reason": "No records found.", "result": [] });
			return res;
		}
		res.json({ "error": false, "result": result });
		res.end();
		return res;
	});
});

router.post('/submitNotification', authenticationHelpers.isClientAuth, function (req, res) {
	req.body.category = 'notification';
	if (req.body.action == 'add') {
		alarmandnotification.addNotification(req.body, req.session.passport.user, function (err) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			alarmandnotification.getNotification(req.session.passport.user, function (err, result) {
				if (err) {
					res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
					return res;
				}
				req.body.notificationId = result.notification_id;
				req.body.addedDatetime = result.added_datetime;
				req.body.activeSince = result.active_since;
				ssh2Connection(req, res);
			});
		});
	}

	if (req.body.action == 'edit') {
		alarmandnotification.updateNotification(req.body, req.session.passport.user, function (err) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			ssh2Connection(req, res);
		});
	}

	if (req.body.action == 'delete') {
		alarmandnotification.deleteNotification(req.body, req.session.passport.user, function (err) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			ssh2Connection(req, res);
		});
	}

	if (req.body.action == 'status') {
		alarmandnotification.updateNotificationStatus(req.body, req.session.passport.user, function (err) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			ssh2Connection(req, res);
		});
	}
});

var ssh2Connection = function (req, res) {
	req.body.email = (null != req.body.email && req.body.email.length > 0) ? req.body.email.join() : "null";
	req.body.mobile = (null != req.body.mobile && req.body.mobile.length > 0) ? req.body.mobile.join() : "null";

	var eventResult = {};
	// var eventResult = (req.body.action == 'add')? req.body : {};
	if (req.body.action == 'add') {
		if ('alarm' == req.body.category) eventResult['alarmId'] = req.body.alarmId;
		else eventResult['notificationId'] = req.body.notificationId;
		eventResult['addedDatetime'] = req.body.addedDatetime;
		eventResult['activeSince'] = req.body.activeSince;
	}
	/* WSO to connection is done in general.js file. if connection successfull then proceed else return */
	general.ssh2Connection(function (err, sftp) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" + err, "result": eventResult });
			return res;
		}
		var actionMsg = req.body.action + (('add' == req.body.action || 'edit' == req.body.action) ? 'ed' : (('status' == req.body.action) ? ' updated' : 'd'));
		var category = req.body.category.charAt(0).toUpperCase() + req.body.category.slice(1);
		Promise.all([
			getCompanyAlarmList(req.session.passport.user.company_id),
			getCompanyNotificationList(req.session.passport.user.company_id)
		]).then(function (resultOfList) {
			var nodeUniqueIdObj = {};
			try {
				if (null != resultOfList[0]) {
					resultOfList[0].forEach(element => {
						if (false == element['is_active']) return;
						var queryObj = JSON.parse(element.query);
						getNodeParametersFromQuery(queryObj.query.group, nodeUniqueIdObj);
					});
				}
				/* *added by piyush to not made execution plan of notification for inox  */
				// if (null != resultOfList[1]) {
				if (null != resultOfList[1] && req.session.passport.user.company_id != '00e24a07-0731-4712-ae0e-7af7bc536da6') {
					resultOfList[1].forEach(element => {
						if (false == element['is_active']) return;
						var nodeUniqueId = req.body.nodesObj[element['node_id']]['node_unique_id'];
						if ('undefined' == typeof nodeUniqueIdObj[nodeUniqueId]) nodeUniqueIdObj[nodeUniqueId] = [];
						// var parameterId = element.parameter_id.split('parameter');
						// if (-1 == nodeUniqueIdObj[nodeUniqueId].indexOf(parameterId[1])) nodeUniqueIdObj[nodeUniqueId].push(parameterId[1]);
						var parameterId = element.parameter_id;
						if (-1 == nodeUniqueIdObj[nodeUniqueId].indexOf(parameterId)) nodeUniqueIdObj[nodeUniqueId].push(parameterId);
						nodeUniqueIdObj[nodeUniqueId].sort(function (a, b) { return a - b });
					});
				}
				if ('undefined' == typeof nodeUniqueIdObj[req.body.nodeUniqueId]) nodeUniqueIdObj[req.body.nodeUniqueId] = [];
			}
			catch (exception) {
				console.log(exception)
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			/*As our tool doesn't support '-' in file name so, replacing '-' by '_' from company_id and user_id */
			var companyIdForStream = req.session.passport.user.company_id.replace(/[-]/g, '_');
			var userIdForStream = req.session.passport.user.user_id.replace(/[-]/g, '_');
			Promise.all([
				generateRecieverFile(sftp, req.body.nodeUniqueId, nodeUniqueIdObj[req.body.nodeUniqueId]),
				generateInputStreamFile(sftp, req.body.nodeUniqueId, nodeUniqueIdObj[req.body.nodeUniqueId], companyIdForStream),
				generateOutputStreamFile(sftp, userIdForStream)
			]).then(function (resultOfStream) {
				if ('done' == resultOfStream[0] && 'done' == resultOfStream[1] && 'done' == resultOfStream[2]) {
					Promise.all([
						generateAlarmFile(sftp, req, companyIdForStream, userIdForStream, nodeUniqueIdObj),
						generatepublisherFile(sftp, req, userIdForStream)
					]).then(function (result) {
						// var actionMsg = req.body.action + (('add' == req.body.action || 'edit' == req.body.action) ? 'ed' : (('status' == req.body.action) ? ' updated' : 'd'));
						// var category = req.body.category.charAt(0).toUpperCase() + req.body.category.slice(1);
						/* return eventResult i.e (last inserted alarm id, notification id and added date time) required in front end*/
						res.json({ "error": false, "reason": category + ' ' + actionMsg + " successfully.", "result": eventResult });
						return res;
					}).catch(error => {
						res.json({ "error": true, "reason": "Error: Something went wrong. 1Please try again!" + error });
						return res;
					});
				}
			}).catch(errorOfStream => {
				res.json({ "error": true, "reason": "Error: Something went wrong. 2Please try again!" + errorOfStream, "result": eventResult });
				return res;
			});
		}).catch(errorofList => {
			res.json({ "error": true, "reason": "Error: Something went wrong. 3Please try again!" + errorofList, "result": eventResult });
			return res;
		});
	});
}

function getCompanyAlarmList(companyId) {
	return new Promise((resolve, reject) => {
		try {
			alarmandnotification.getCompanyAlarmList(companyId, function (err, result) {
				if (err) return reject('error');
				return resolve(result);
			});
		}
		catch (Exception) { return reject(Exception); }
	});
}

function getCompanyNotificationList(companyId) {
	return new Promise((resolve, reject) => {
		try {
			alarmandnotification.getCompanyNotificationList(companyId, function (err, result) {
				if (err) return reject('error');
				return resolve(result);
			});
		}
		catch (Exception) { return reject(Exception); }
	});
}

function generateRecieverFile(sftp, uniqueId, parameterAry) {
	return new Promise((resolve, reject) => {
		try {
			var InputStreamFileName = 'inp_' + uniqueId;
			var htmlForReceiver = '<?xml version="1.0" encoding="UTF-8"?>' +
				'\n<eventReceiver name="' + uniqueId + '" statistics="disable" trace="disable" xmlns="http://wso2.org/carbon/eventreceiver">' +
				'\n<from eventAdapterType="kafka">' +
				'\n<property name="events.duplicated.in.cluster">false</property>' +
				'\n<property name="zookeeper.connect">' + marcconfig.WSOZOOKEEPERCONNECTIONIP + '</property>' +
				'\n<property name="group.id">' + marcconfig.WSOZOOKEEPERGROUPID + '</property>' +
				'\n<property name="threads">' + marcconfig.WSOZOOKEEPERTOTALTHREADS + '</property>' +
				'\n<property name="topic">' + uniqueId + '</property>' +
				'\n</from>' +
				'\n<mapping customMapping="enable" type="json">' +
				'\n<property>' +
				'\n<from jsonPath="meter"/>' +
				'\n<to name="meter" type="string"/>' +
				'\n</property>' +
				'\n<property>' +
				'\n<from jsonPath="slot"/>' +
				'\n<to name="time" type="string"/>' +
				'\n</property>';
			parameterAry.forEach(parmId => {
				htmlForReceiver += '\n<property>' +
					'\n<from jsonPath="' + parmId + '"/>' +
					'\n<to default="0.00000098" name="parameter' + parmId + '" type="double"/>' +
					'\n</property>';
			});
			htmlForReceiver += '\n</mapping>' +
				'\n<to streamName="' + InputStreamFileName + '" version="1.0.0"/>' +
				'\n</eventReceiver>';
			/* Creating and writing node unique id wise receiver file in receiver path specified in config file */
			var readStream = sftp.createReadStream(marcconfig.REMOTEPATHFORRECEIVER + uniqueId + '.xml');
			readStream.on('data', function (chunk) {
				return resolve('done');
			});
			readStream.on('end', function () {
				try {
					if (0 == parameterAry.length) {
						sftp.unlink(marcconfig.REMOTEPATHFORRECEIVER + uniqueId + '.xml', function (err) {
							if (err) return reject(err);
							return resolve('done');
						});
					}
					else {
						sftp.writeFile(marcconfig.REMOTEPATHFORRECEIVER + uniqueId + '.xml', htmlForReceiver, function (err) {
							if (err) return reject(err);
							return resolve('done');
						});
					}
				} catch (exception) { return reject('error'); }
			});
			/* if receiver file not found then create one */
			readStream.on('error', function (err) {
				var errToString = err.toString();
				if ('Error: No such file' == errToString) {
					sftp.writeFile(marcconfig.REMOTEPATHFORRECEIVER + uniqueId + '.xml', htmlForReceiver, function (error) {
						if (error) return reject(error);
						return resolve('done');
					});
				}
				return resolve('done');
			});
		} catch (Exception) {
			return reject(Exception);
		}
	});
}

function generateInputStreamFile(sftp, uniqueId, parameterAry, cmpId) {
	return new Promise((resolve, reject) => {
		try {
			/* Node unique id wise input stream file in publisher path specified above */
			var fileNameForInputStream = 'inp_' + uniqueId;
			var inputStreamParameterAry = [{ "name": "meter", "type": "STRING" }, { "name": "time", "type": "STRING" }];
			parameterAry.forEach(parmId => {
				inputStreamParameterAry.push({ "name": "parameter" + parmId, "type": "DOUBLE" });
			});
			var inpStreamFileContent = { "name": fileNameForInputStream, "version": "1.0.0", "nickName": "", "description": "", "payloadData": inputStreamParameterAry };
			var readStream = sftp.createReadStream(marcconfig.REMOTEPATHFORSTREAMS + fileNameForInputStream + '.json');
			/* if input file already exist then return , do not write file again */
			readStream.on('data', function (chunk) {
				return resolve('done');
			});

			readStream.on('end', function () {
				try {
					if (0 == parameterAry.length) {
						sftp.unlink(marcconfig.REMOTEPATHFORSTREAMS + fileNameForInputStream + '.json', function (err) {
							if (err) return reject(err);
							return resolve('done');
						});
					}
					else {
						sftp.writeFile(marcconfig.REMOTEPATHFORSTREAMS + fileNameForInputStream + '.json', JSON.stringify(inpStreamFileContent), function (err) {
							if (err) return reject(err);
							return resolve('done');
						});
					}
				} catch (exception) { return reject('error'); }
			});

			/* if input file not found then write file */
			readStream.on('error', function (err) {
				var errToString = err.toString();
				if ('Error: No such file' == errToString) {
					sftp.writeFile(marcconfig.REMOTEPATHFORSTREAMS + fileNameForInputStream + '.json', JSON.stringify(inpStreamFileContent), function (error) {
						if (error) return reject(error);
						return resolve('done');
					});
				}
				return resolve('done');
			});
		} catch (Exception) {
			return reject(Exception);
		}
	});
}

function generateOutputStreamFile(sftp, userIdForStream) {
	return new Promise((resolve, reject) => {
		try {
			/* Creating and writing in output stream file */
			/* User id wise output stream file in publisher path specified above */
			var fileNameForOutputStream = 'out_' + userIdForStream;
			var readStream = sftp.createReadStream(marcconfig.REMOTEPATHFORSTREAMS + fileNameForOutputStream + '.json');

			readStream.on('data', function (chunk) {
				return resolve('done');
			});

			readStream.on('error', function (err) {
				var errToString = err.toString();
				if ('Error: No such file' == errToString) {
					var outStreamFileContent = { "name": fileNameForOutputStream, "version": "1.0.0", "nickName": "", "description": "", "payloadData": [{ "name": "companyid", "type": "STRING" }, { "name": "userid", "type": "STRING" }, { "name": "node", "type": "STRING" }, { "name": "time", "type": "STRING" }, { "name": "id", "type": "STRING" }, { "name": "value1", "type": "DOUBLE" }, { "name": "value2", "type": "DOUBLE" }, { "name": "message", "type": "STRING" }, { "name": "data", "type": "STRING" }, { "name": "flag", "type": "STRING" }, { "name": "c_type", "type": "STRING" }, { "name": "emails", "type": "STRING" }, { "name": "mobile_no", "type": "STRING" }] };
					sftp.writeFile(marcconfig.REMOTEPATHFORSTREAMS + fileNameForOutputStream + '.json', JSON.stringify(outStreamFileContent), function (err) {
						if (err) return reject(err);
						return resolve('done');
					});
				}
			});

		} catch (Exception) {
			return reject(Exception);
		}
	});
}

function generateAlarmFile(sftp, req, companyIdForStream, userIdForStream, nodeWiseParametersObj) {
	return new Promise((resolve, reject) => {
		try {
			var id = '', fileContent = '', replaceString = '', outputStream = '', query = '', nodeParamList = '', meterTime = 'time';
			/* Create company id wise execution plan */
			var fileName = 'exec_' + companyIdForStream + '.siddhiql';
			var communicationType = (req.body.communicationType) ? req.body.communicationType : 'BOTH';
			/* Read execution plan (company_id wise)
			if file doesn't exists then create file on readStream.error function else proceed */
			var readStream = sftp.createReadStream(marcconfig.REMOTEPATHFOREXECUTIONPLANS + fileName);
			var regExp = ('notification' == req.body.category)
				? "\\n\\n\/\\*Notification " + req.body.notificationId + " start\[\\s\\S\]\*\?Notification " + req.body.notificationId + " end\\*\/"
				: "\\n\\n\/\\*Alarm " + req.body.alarmId + " start\[\\s\\S\]\*\?Alarm " + req.body.alarmId + " end\\*\/";
			var sessionParameterObject = req.session.passport.user.parameters;
			//Empty meterIndexObj for removing duplicacy and smoth functioning
			meterIndexObj = {};
			if (true == req.body.isActive) {
				var commonSelect = '\nselect \'' + req.session.passport.user.company_id + '\' as companyid, \'' + req.session.passport.user.user_id + '\' as userid, ';
				var userMsg = req.body.message.replace(/"/g, '');
				// Wos2 query for alarm 
				if ('alarm' == req.body.category) {
					var queryObj = JSON.parse(req.body.query);
					//Function for generating equation for query  from equation object
					var equationQueryObj = generateEquationQueries(queryObj.query.group, companyIdForStream, req.body.window, sessionParameterObject);
					if (!equationQueryObj) {
						return reject('error');
					}
					commonSelect += '\'' + queryObj.query.group.rules[0].node.nodeName + '\' as node, ' + meterTime + ' as time,';
					// use it to made query @ window type is fixed 
					var nodeName = '\'' + queryObj.query.group.rules[0].node.nodeName + '\' as meter, ' + meterTime + ' as time,';
					var inputStreamObjFortotalMeters = 'from ';
					for (var j = 1; j <= Object.keys(meterIndexObj).length; j++) {
						inputStreamObjFortotalMeters += "inp_" + req.body.nodeUniqueId + " ->";
					}
					inputStreamObjFortotalMeters = inputStreamObjFortotalMeters.replace(/->*$/, "");
					var EquationQuery = inputStreamObjFortotalMeters + "[" + equationQueryObj['str'] + "]";

					// for new requirement change by piyush
					var EquationQueryNew = inputStreamObjFortotalMeters + "[" + equationQueryObj['new'] + "]";

					//Function to generate time object for total number of meters an pass it to time.
					id = req.body.alarmId;
					var alarm_Id = JSON.stringify(req.body.alarmId);
					alarm_Id = alarm_Id.replace(/"/g, "");
					alarm_Id = alarm_Id.replace(/[-]/g, '_');
					var queryType = (req.body.limitedNotification) ? 'complex' : 'simple';;
					var window = ('Fixed' == req.body.windowType) ? 'time' : 'timeBatch';
					//generating query type and node parameter list, passing in data attribute of query
					nodeParamList = "'" + queryObj.query.group.rules[0].node.nodeId + "'," + "'" + queryType + "'";
					// use it to made query @ window type is fixed 
					var dataString = nodeParamList;
					if ('' != nodeParamList) {
						nodeParamList += this.paramStr;
						// nodeParamList += JSON.stringify(this.paramStr);
						dataString += this.dataStr;
						// global, case-sensitive replacement
						nodeParamList = nodeParamList.replace(/"| /g, '');
					}
					var out2stream = '';
					for (i = 0; i < nodeWiseParametersObj[queryObj.query.group.rules[0].node.nodeUniqueId].length; i++) {
						out2stream += 'minout2value' + [i] + ' double, maxout2value' + [i] + ' double,';

					}
					if (true == req.body.limitedNotification) {
						var displayCondition = ('Constant' == queryObj.query.group.rules[0].isParamConstant) ? queryObj.query.group.rules[0].constant : queryObj.query.group.rules[0].comparisonParameter.parameterId;
					}
					/* for converting time selected by user into milliseconds */
					var timeInSec = (req.body.window) * 60 * 1000;
					/* if limited notification is true then build having query for alarm else normal query and normal alarm and window type is fixed and time>0*/
					if (true == req.body.limitedNotification) {
						query = EquationQuery + '#window.length(2)' + commonSelect + '\'' + id + '\' as id, min(parameter' + queryObj.query.group.rules[0].parameter.parameterId + ') as value1, max(parameter' + queryObj.query.group.rules[0].parameter.parameterId + ') as value2 ,' +
							'messageStringConcat("' + userMsg + '#",\'Min ' + queryObj.query.group.rules[0].parameter.parameterName + '\',min(' + queryObj.query.group.rules[0].parameter.parameterId + '),\'Max ' + queryObj.query.group.rules[0].parameter.parameterName +
							'\',max(' + queryObj.query.group.rules[0].parameter.parameterId + ')) as message, dataStringConcat(' + nodeParamList + ') as data, \'' + req.body.category + '\' as flag, \'' + communicationType + '\' as c_type, \'' + req.body.email +
							'\' as emails, \'' + req.body.mobile + '\' as mobile_no' + ' having value1 < ' + displayCondition + ' AND value2 >=' + displayCondition + '\ninsert into out_' + userIdForStream + ';'
					}
					else if (req.body.window > 0 && req.body.windowType == 'Fixed') {
						query = EquationQueryNew + '#window.' + window + '(' + req.body.window + ' min) \nselect ' + nodeName + this.parameters + 'min(' + meterTime + ':timestampInMilliseconds(' + meterTime + ',' + "'yyyy-MM-dd HH:mm:ss'" + ')) as etime, max(' + meterTime + ':timestampInMilliseconds(' + meterTime + ',' + "'yyyy-MM-dd HH:mm:ss'" + ')) as stime \ngroup by meter' + '\nhaving ' + this.having_values + '\ninsert into out2_' + alarm_Id + ';'
						query += '\n\nfrom out2_' + alarm_Id + '\nselect ' + nodeName + this.out2 + ' etime as st, stime as et, time:timestampInMilliseconds() as ct  \ngroup by meter' + ' \ninsert into out3_' + alarm_Id + ';'
						
						query += '\n\nfrom out3_' + alarm_Id + '#window.length(2)' + commonSelect + '\'' + id + '\' as id, out3value0 as value1, convert(max(ct)-min(ct),' + "'Double'" + ') as value2, messageStringConcat("' + userMsg + '#"' + this.out3 + ') as message, dataStringConcat(' + dataString + ') as data, \'' + req.body.category + '\' as flag, \'' + communicationType + '\' as c_type, \'' + req.body.email + '\' as emails, \'' + req.body.mobile + '\' as mobile_no' + '\ngroup by meter' + '\nhaving value2 == 0' + ' or  value2 > ' + timeInSec + ' \ninsert into out_' + userIdForStream + ';'
					}
					else {
						query = EquationQuery + '#window.' + window + '(' + req.body.window + ' min)' + commonSelect + '\'' + id + '\' as id, 0.00 as value1, 0.00 as value2,messageStringConcat("' + userMsg + '#"' + this.msgStr + ') as message,dataStringConcat(' + nodeParamList + ') as data, \'' + req.body.category + '\' as flag, ' +
							'\'' + communicationType + '\' as c_type, \'' + req.body.email + '\' as emails, \'' + req.body.mobile + '\' as mobile_no\noutput last every ' + req.body.window + ' min\ninsert into out_' + userIdForStream + ';';
					}
					replaceString = '\n\n' + '/*Alarm ' + id + ' start*/' + "\n" + query + "\n" + '/*Alarm ' + id + ' end*/';
				}
				/* if category is notification then add notification query */
				else {
					if (req.session.passport.user.company_id != '00e24a07-0731-4712-ae0e-7af7bc536da6') {
						var messageString = '';
						id = req.body.notificationId;
						commonSelect += '\'' + req.body.nodeName + '\' as node, ' + meterTime + ' as time,';
						req.body.frequencyIntervalTime = ('custom' == req.body.frequency) ? req.body.frequencyIntervalTime : '1';
						var freq = intervalString(req.body);
						nodeParamList += "'" + req.body.nodeId + "'," + "'notification',";
						// var fieldName = req.body.parameterId.split('parameter');
						// var paramData =  req.body.parameterId;
						var fieldName = req.body.parameterId;
						var paramData = 'parameter' + req.body.parameterId;
						if ('1' == req.body.parameterType && 'atEvent' != req.body.value) { paramData = req.body.value + '(parameter' + req.body.parameterId + ')' }
						if ('1' != req.body.parameterType && 'atEvent' != req.body.value) {
							paramData = ('startReading' == req.body.value) ? 'min( parameter' + req.body.parameterId + ')' : (('endReading' == req.body.value) ? 'max( parameter' + req.body.parameterId + ')' : 'max( parameter' + req.body.parameterId + ') - min( parameter' + req.body.parameterId + ')');
						}
						nodeParamList += "'" + fieldName + "'," + paramData;
						messageString += "'" + req.body.paramName+ "'," + paramData;
						// nodeParamList += "'" + fieldName[1] + "'," + paramData;
						// messageString += "'" + sessionParameterObject[fieldName[1]]['parameter_name'] + "'," + paramData;
						query = 'from inp_' + req.body.nodeUniqueId + '[meter==\'' + req.body.nodeUniqueId + '\']' +
							commonSelect + '\'' + id + '\' as id,' + paramData + ' as value1, 0.00 as value2 ,messageStringConcat("' + userMsg + '#",' + messageString + ') as message, dataStringConcat(' + nodeParamList + ') as data, \'' + req.body.category + '\' as flag, \'' + communicationType + '\' as c_type, \'' + req.body.email + '\' as emails, \'' + req.body.mobile + '\' as mobile_no' +
							'\noutput last every ' + freq + '\ninsert into out_' + userIdForStream + ';';
						replaceString = '\n\n' + '/*Notification ' + id + ' start*/' + "\n" + query + "\n" + '/*Notification ' + id + ' end*/';
					}
				}
			}
			var allInputStreams = "/*Input stream start*/";
			for (let nodeUniqueId in nodeWiseParametersObj) {
				var i = 0;
				/* create,add input and output stream with (alarm or notification) into it */
				if (0 < nodeWiseParametersObj[nodeUniqueId].length) {
					var inputStream = "\n@Import('inp_" + nodeUniqueId + ":1.0.0')\ndefine stream inp_" + nodeUniqueId + " (meter string, time string,";
					nodeWiseParametersObj[nodeUniqueId].forEach(paramId => {
						i++
						inputStream += ' parameter' + paramId + ' double,';
					});
					inputStream = inputStream.replace(/,*$/, ") ;");
					allInputStreams += inputStream + "\n";
					nodeWiseParametersObj[nodeUniqueId];
				}
			}
			allInputStreams += "/*Input stream end*/\n\n/*Input Stream*/";
			/* *Alarmid wise output stream */
      var outputId = ('alarm' == req.body.category) ? alarm_Id : id;
			outputStream = "/*Output stream " + outputId + " start*/\n@Export('out_" + userIdForStream + ":1.0.0')" +
				"\ndefine stream out_" + userIdForStream + "(companyid string,userid string,node string,time string,id string,value1 double,value2 double, message string, data string, flag string, c_type string, emails string,mobile_no string);\n";
			// outputStream = "/*Output stream " + alarm_Id + " start*/\n@Export('out_" + userIdForStream + ":1.0.0')" +
			// 	"\ndefine stream out_" + userIdForStream + "(companyid string,userid string,node string,time string,id string,value1 double,value2 double, message string, data string, flag string, c_type string, emails string,mobile_no string);\n";
			if (req.body.window > 0 && req.body.windowType == 'Fixed') {
				outputStream += "\ndefine stream out2_" + alarm_Id + "(meter string, time string, minout2value0 double, maxout2value0 double, etime long, stime long);\ndefine stream out3_" + alarm_Id + "(meter string, time string, out3value0 double, st long, et long, ct long);\n";
			}
			outputStream += "\n/*Output stream " + outputId + " end*/\n\n/*Output Stream*/";
		} catch (exception) {
			console.log(exception)
			return reject('error');
		}
		/* Enter into this function file exists(data is present) */
		readStream.on('data', function (chunk) {
			fileContent = chunk.toString('utf8');
			/* Delete output stream on add and edit action as it will be added again in next line note -  Dont delete output stream though all alarms and notification are delete */
			if ('add' == req.body.action || 'edit' == req.body.action || true == req.body.isActive) {
				// var expForOutputStream = new RegExp("\\n\\n\/\\*Output stream " + userIdForStream + " start\[\\s\\S\]\*\?Output stream " + userIdForStream + " end\\*\/", "gi");
				var expForOutputStream = new RegExp("\\n\\n\/\\*Output stream " + outputId + " start\[\\s\\S\]\*\?Output stream " + outputId + " end\\*\/", "gi");
				fileContent = fileContent.replace(expForOutputStream, '');
			}
			/* Replace alarm and notification if already present, used for global search case-insensitive*/
			var regularExpression = new RegExp(regExp, "gi");
			fileContent = fileContent.replace(regularExpression, '');

			var expForInputStream = new RegExp("\\n\\n\/\\*Input stream start\[\\s\\S\]\*\?Input stream end\\*\/", "gi");
			fileContent = fileContent.replace(expForInputStream, '');
			fileContent = fileContent.replace('\/\*Input Stream\*\/', allInputStreams);

			/* Replace output stream with string 'Output stream', Append alarms and notification */
			if (true == req.body.isActive) {
				fileContent = fileContent.replace('\/\*Output Stream\*\/', outputStream);
				fileContent = fileContent + replaceString;
			}
		});
		readStream.on('end', function () {
			try {
				if ('' != fileContent) {
					sftp.writeFile(marcconfig.REMOTEPATHFOREXECUTIONPLANS + fileName, fileContent, function (err) {
						if (err) {
							return reject(err);
						}
						return resolve('done');
					});
				} else {
					return reject('err');
				}
			} catch (exception) {
				return reject('error');
			}
		});

		/* Create and add basic structure in file */
		readStream.on('error', function (err) {
			try {
				var errToString = err.toString();
				if ('Error: No such file' == errToString) {
					/* for loop starts from 2 as parameters are passed from postion 3 onwards (postion 1 - node id, postion 2 - query type) */
					var concatFn = "\n\n/*Data string concat function start*/" +
						"\ndefine function dataStringConcat[JavaScript] return string {" +
						"\n\tvar str = '{';" +
						"\n\tstr += '\"nodeId\":\"'+data[0]+'\",\"query\":\"'+data[1]+'\",\"parameterId\":{'" +
						"\n\tfor(var i=2;i<data.length;i++){" +
						"\n\t\tif(0 == i%2){" +
						"\n\t\t\tstr += ((2 != i) ? ',': '')+'\"'+data[i]+'\":';" +
						"\n\t\t}" +
						"\n\t\telse{" +
						"\n\t\t\tstr +='\"'+data[i]+'\"';" +
						"\n\t\t}" +
						"\n\t}" +
						"\n\tstr += '}}';" +
						"\n\treturn str;" +
						"\n};\n /*Data string concat function end*/";
					var concatMessageFn = "\n\n/*Message string concat function start*/" +
						"\ndefine function messageStringConcat[JavaScript] return string {" +
						"\n\tvar str = '';" +
						"\n\tstr += data[0]+' ';" +
						"\n\tfor(var i=1;i<data.length;i++){" +
						"\n\t\tstr += data[i]+': '+data[++i]+' ';" +
						"\n\t}" +
						"\n\treturn str;" +
						"\n};\n /*Message string concat function end*/";
					var template = "/*Enter a unique ExecutionPlan*/\n@Plan:name('exec_" + companyIdForStream + "')\n\n" + allInputStreams + "\n\n" + outputStream + concatFn + concatMessageFn + replaceString;
					sftp.writeFile(marcconfig.REMOTEPATHFOREXECUTIONPLANS + fileName, template, function (error) {
						if (error) {
							return reject(error);
						}
						return resolve('done');
					});
				}
			} catch (exception) {
				return reject('err');
			}
		});
	});
}


function generatepublisherFile(sftp, req, userIdForStream) {
	return new Promise((resolve, reject) => {
		try {
			/* User id wise email/sms file in publisher path specified above */
			var fileName = 'pub_' + userIdForStream;
			var readStream = sftp.createReadStream(marcconfig.REMOTEPATHFORPUBLISHERS + fileName + '.xml');
			readStream.on('data', function (chunk) {
				return resolve('done');
			});
			readStream.on('error', function (err) {
				var errToString = err.toString();
				if ('Error: No such file' == errToString) {
					var htmlForSms = '<?xml version="1.0" encoding="UTF-8"?>' +
						'\n<eventPublisher name="' + fileName + '" statistics="disable" trace="disable" xmlns="http://wso2.org/carbon/eventpublisher">' +
						'\n<from streamName="out_' + userIdForStream + '" version="1.0.0"/>' +
						'\n<mapping customMapping="disable" type="text"></mapping>' +
						'\n<to eventAdapterType="custom-sms">' +
						'\n<property name="email.address"></property>' +
						'\n</to>' +
						'\n</eventPublisher>';
					sftp.writeFile(marcconfig.REMOTEPATHFORPUBLISHERS + fileName + '.xml', htmlForSms, function (error) {
						if (error) {
							return reject(error);
						}
						return resolve('done');
					});
				}
			});
		} catch (Exception) {
			return reject(Exception);
		}
	});
}

router.post('/alarmCount', authenticationHelpers.isClientAuth, function (req, res) {
	alarmandnotification.alarmCount(req.session.passport.user, function (err, result) {
		console.log()
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": false, "reason": "No record found.", "result": {} });
			return res;
		}
		res.json({ "error": false, "result": result });
		res.end();
		return res;
	});
});

router.post('/notificationCount', authenticationHelpers.isClientAuth, function (req, res) {
	alarmandnotification.notificationCount(req.session.passport.user, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": false, "reason": "No record found.", "result": {} });
			return res;
		}
		res.json({ "error": false, "result": result });
		res.end();
		return res;
	});
});

router.post('/findAlarm', authenticationHelpers.isClientAuth, function (req, res) {
	alarmandnotification.findAlarm(req.body, req.session.passport.user, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": false, "reason": "No record found.", "result": {} });
			return res;
		}
		res.json({ "error": false, "result": result });
		res.end();
		return res;
	});
});

router.post('/findNotification', authenticationHelpers.isClientAuth, function (req, res) {
	alarmandnotification.findNotification(req.body, req.session.passport.user, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": false, "reason": "No record found.", "result": {} });
			return res;
		}
		res.json({ "error": false, "result": result });
		res.end();
		return res;
	});
});

router.post('/pushEvents', authenticationHelpers.isClientAuth, function (req, res) {
	alarmandnotification.pushEvents(req.session.passport.user, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": true, "reason": "No records found." });
			return res;
		}
		res.json({ "error": false, "result": result });
		res.end();
		return res;
	});
});

function intervalString(frequency) {
	var freq = '';
	switch (frequency.frequency) {
		case 'hourly': freq = frequency.frequencyIntervalTime + ' hour';
			break;
		case 'daily': freq = frequency.frequencyIntervalTime + ' day';
			break;
		case 'weekly': freq = frequency.frequencyIntervalTime + ' week';
			break;
		case 'monthly': freq = frequency.frequencyIntervalTime + ' month';
			break;
		case 'yearly': freq = frequency.frequencyIntervalTime + ' year';
			break;
		case 'custom': freq = intervalString({ frequency: frequency.frequencyInterval, frequencyIntervalTime: frequency.frequencyIntervalTime });

	}
	return freq;
}

router.post('/activeAlarmCount', authenticationHelpers.isClientAuth, function (req, res) {
	alarmandnotification.activeAlarmCount(req.body, req.session.passport.user, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": false, "reason": "No record found.", "result": {} });
			return res;
		}
		res.json({ "error": false, "result": result });
		res.end();
		return res;
	});
});

router.post('/activeNotificationCount', authenticationHelpers.isClientAuth, function (req, res) {
	alarmandnotification.activeNotificationCount(req.body, req.session.passport.user, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": false, "reason": "No record found.", "result": {} });
			return res;
		}
		res.json({ "error": false, "result": result });
		res.end();
		return res;
	});
});

router.post('/smsSendCount', authenticationHelpers.isClientAuth, function (req, res) {
	alarmandnotification.smsSendCount(req.session.passport.user, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": false, "reason": "No record found.", "result": {} });
			return res;
		}
		res.json({ "error": false, "result": result });
		res.end();
		return res;
	});
});

router.post('/smsRemainingCount', authenticationHelpers.isClientAuth, function (req, res) {
	alarmandnotification.smsRemainingCount(req.session.passport.user, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": false, "reason": "No record found.", "result": {} });
			return res;
		}
		res.json({ "error": false, "result": result });
		res.end();
		return res;
	});
});

router.post('/pushEventsCount', authenticationHelpers.isClientAuth, function (req, res) {
	alarmandnotification.pushEventsCount(req.session.passport.user, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": false, "reason": "No record found.", "result": {} });
			return res;
		}
		res.json({ result });
		res.end();
		return res;
	});
});

function generateEquationQueries(group, companyIdForStream, window, sessionParameterObject) {
	if (!group) return "";
	this.paramStr = '';
	this.msgStr = '';
	this.parameterName = '';
	this.operator = '';
	this.newStr = '';
	this.constant = 0;
	this.parameters = '';
	this.having_values = '';
	this.out = '';
	this.out1 = '';
	this.out2 = '';
	this.out3 = '';
	this.dataStr = '';
	for (var str = "", i = 0; i < group.rules.length; i++) {
		i > 0 && (str += " " + group.condition + " ");
		i > 0 && (newStr += " " + group.condition + " ");
		i > 0 && (this.having_values += " " + group.condition + " ");
		var rulesAry = group.rules[i];
		if (rulesAry.group) {
			str += generateEquationQueries(rulesAry.group, companyIdForStream, window, sessionParameterObject);
		} else {
			if (!meterIndexObj[rulesAry.node.nodeUniqueId]) {
				meterIndexObj[rulesAry.node.nodeUniqueId] = Object.keys(meterIndexObj).length + 1;
			}
			this.operator = rulesAry.operator;
			this.constant = rulesAry.constant;
			var parameterId = rulesAry.parameter.parameterId;
			// var parameterId = rulesAry.parameter.parameterId.split('parameter');
			if ('Parameter' == rulesAry.isParamConstant) {
				var comparisonParameterId = rulesAry.comparisonParameter.parameterId;
				// var comparisonParameterId = rulesAry.comparisonParameter.parameterId.split('parameter')[1];
			}
			parameters += "min(parameter" + rulesAry.parameter.parameterId + ") as minout2value" + [i] + ",max(parameter" + rulesAry.parameter.parameterId + ") as maxout2value" + [i] + ',';
			out += 'minout2value' + [i] + ' double, maxout2value' + [i] + ' double,';
			if (this.operator == '<' || this.operator == '<=' || this.operator == '==') {
				this.having_values += '(maxout2value' + [i] + " " + this.operator + " " + this.constant + ')';
				this.out2 += 'maxout2value' + [i] + ' as out3value' + [i] + ',';
				this.out1 = '';
				this.out1 += 'out3value' + [i];
			}
			else {
				this.having_values += '(minout2value' + [i] + " " + this.operator + " " + this.constant + ')';
				this.out2 += 'minout2value' + [i] + ' as out3value' + [i] + ',';
				this.out1 = '';
				this.out1 += 'out3value' + [i];
			}
      /* *changed for caption start */
			this.dataStr += ",'parameter" + parameterId + "',";
			this.paramStr += ",parameter" + rulesAry.parameter.parameterId + "";
			this.msgStr += ",'" + rulesAry.parameter.parameterName + "',parameter" + rulesAry.parameter.parameterId;
			this.out3 += ",'" + rulesAry.parameter.parameterName + "',";
			this.parameterName = ",'" + rulesAry.parameter.parameterName + "',";
      str += "(meter == '" + rulesAry.node.nodeUniqueId + "' AND parameter" + rulesAry.parameter.parameterId + " " + rulesAry.operator + " " + (('Constant' == rulesAry.isParamConstant) ? rulesAry.constant : 'parameter' + rulesAry.comparisonParameter.parameterId) + ")";
			newStr += "(meter == '" + rulesAry.node.nodeUniqueId + "' AND parameter" + rulesAry.parameter.parameterId + " != " + (('Constant' == rulesAry.isParamConstant) ? '0.00000098 ' : 'parameter' + rulesAry.comparisonParameter.parameterId) + ")";
      /* *changed for caption end */
			// this.dataStr += ",'" + parameterId[1] + "',";
			// this.paramStr += ",'" + parameterId[1] + "'," + rulesAry.parameter.parameterId;
			// this.msgStr += ",'" + sessionParameterObject[parameterId[1]]['parameter_name'] + "'," + rulesAry.parameter.parameterId;
			// this.out3 += ",'" + sessionParameterObject[parameterId[1]]['parameter_name'] + "',";
			// this.parameterName = ",'" + sessionParameterObject[parameterId[1]]['parameter_name'] + "',";
			// str += "(meter == '" + rulesAry.node.nodeUniqueId + "' AND " + rulesAry.parameter.parameterId + " " + rulesAry.operator + " " + (('Constant' == rulesAry.isParamConstant) ? rulesAry.constant : rulesAry.comparisonParameter.parameterId) + ")";
			// newStr += "(meter == '" + rulesAry.node.nodeUniqueId + "' AND " + rulesAry.parameter.parameterId + " != " + (('Constant' == rulesAry.isParamConstant) ? '0.00000098 ' :  rulesAry.comparisonParameter.parameterId) + ")";
		}
		dataStr += this.out1;
		this.out3 += this.out1;
	}
	str + ")";
	newStr + ")";
	return { str: str, new: this.newStr };
}

function getNodeParametersFromQuery(group, nodeUniqueIdObj) {
	if (!group) return "";
	for (i = 0; i < group.rules.length; i++) {
		var rulesAry = group.rules[i];
		if (rulesAry.group) {
			generateEquationQueries(rulesAry.group);
		}
		else {
			if ('undefined' == typeof nodeUniqueIdObj[rulesAry.node.nodeUniqueId]) nodeUniqueIdObj[rulesAry.node.nodeUniqueId] = [];
			var parameterId = rulesAry.parameter.parameterId;//changed for caption
			// var parameterId = rulesAry.parameter.parameterId.split('parameter')[1];
			if (-1 == nodeUniqueIdObj[rulesAry.node.nodeUniqueId].indexOf(parameterId)) nodeUniqueIdObj[rulesAry.node.nodeUniqueId].push(parameterId);
			if ('Parameter' == rulesAry.isParamConstant) {
				var comparisonParameterId = rulesAry.comparisonParameter.parameterId;//changed for caption
				// var comparisonParameterId = rulesAry.comparisonParameter.parameterId.split('parameter')[1];
				if (-1 == nodeUniqueIdObj[rulesAry.node.nodeUniqueId].indexOf(comparisonParameterId)) nodeUniqueIdObj[rulesAry.node.nodeUniqueId].push(comparisonParameterId);
			}
			nodeUniqueIdObj[rulesAry.node.nodeUniqueId].sort();
		}
	}
}

module.exports = router;