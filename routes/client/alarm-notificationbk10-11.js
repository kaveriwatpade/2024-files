var express = require('express');
var router = express.Router();
var alarmandnotification = require('../../models').alarmandnotification;
var authenticationHelpers = require('../authentication-helpers');
var Promise = require('promise');
var general = require(__base + 'models').general;
var meterIndexObj = {};

router.post('/alarmList', authenticationHelpers.isClientAuth, function (req, res) {
	alarmandnotification.alarmList(req.session.passport.user, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": true, "reason": "No records found.","result": [] });
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
			res.json({ "error": true, "reason": "No records found.","result": [] });
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
	//Commented by dharmi - multi mobile numbers not implemented on rupesh wso2 code. Remove this comment once done.
	//req.body.mobile = (null != req.body.mobile && req.body.mobile.length > 0 ) ? req.body.mobile.join() : "null";
	req.body.mobile = (null != req.body.mobile && req.body.mobile.length > 0) ? req.body.mobile[0] : "null";
	/* WSO to connection is done in general.js file. if connection successfull then proceed else return */

	var eventResult = {};
	if (req.body.action == 'add') {
		if ('alarm' == req.body.category) {
			eventResult['alarmId'] = req.body.alarmId;
		} else {
			eventResult['notificationId'] = req.body.notificationId;
		}
		eventResult['addedDatetime'] = req.body.addedDatetime;
		eventResult['activeSince'] = req.body.activeSince;
	}
	general.ssh2Connection(function (err, sftp) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" + err, "result": eventResult });
			return res;
		}
		/*As our tool doesn't support '-' in file name so, replacing '-' by '_' from companyid and user_id */
		var companyIdForStream = req.session.passport.user.company_id.replace(/[-]/g, '_');
		var userIdForStream = req.session.passport.user.user_id.replace(/[-]/g, '_');
		/* proceed further only after successfull creation of input and output stream.*/
		Promise.all([
			generateRecieverFile(sftp, companyIdForStream, req.body.deviceIdNodeAddress),
			generateInputStreamFile(sftp, companyIdForStream),
			generateOutputStreamFile(sftp, userIdForStream),
		]).then(function (resultOfStream) {
			if ('done' == resultOfStream[0] && 'done' == resultOfStream[1] && 'done' == resultOfStream[2]) {
				Promise.all([
					generateAlarmFile(sftp, req, companyIdForStream, userIdForStream),
					generatepublisherFile(sftp,req,userIdForStream)
				]).then(function (result) {
					var actionMsg = req.body.action + (('add' == req.body.action || 'edit' == req.body.action) ? 'ed' : (('status' == req.body.action) ? ' updated' : 'd'));
					var category = req.body.category.charAt(0).toUpperCase() + req.body.category.slice(1);
					/* return eventResult i.e (last inserted alarm id, notification id and added date time) required in front end*/
					res.json({ "error": false, "reason": category + ' ' + actionMsg + " successfully.", "result": eventResult });
					return res;
				}).catch(error => {
					res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" + error });
					return res;
				});
			}
		}).catch(errorOfStream => {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" + errorOfStrem, "result": eventResult });
			return res;
		});
	});
}

function generateRecieverFile(sftp, companyIdForReceiver, uniqueId) {
	return new Promise((resolve, reject) => {
		try {
			/* Creating and writing node unique id wise receiver file in receiver path specified in config file */
			var readStream = sftp.createReadStream(marcconfig.REMOTEPATHFORRECEIVER + uniqueId + '.xml');
			/* if receiver file already exist then return , do not write file again */
			readStream.on('data', function (chunk) {
				return resolve('done');
			});

			/* if receiver file not found then create one */
			readStream.on('error', function (err) {
				var errToString = err.toString();
				if ('Error: No such file' == errToString) {
					var InputStreamFileName = 'inp_' + companyIdForReceiver;
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
					for (var i = 1; i <= marcconfig.TOTALPARAMETERCOUNT; i++) {
						htmlForReceiver += '\n<property>' +
							'\n<from jsonPath="' + i + '"/>' +
							'\n<to default="0.00000098" name="parameter' + i + '" type="double"/>' +
							'\n</property>';
					}

					htmlForReceiver += '\n</mapping>' +
						'\n<to streamName="' + InputStreamFileName + '" version="1.0.0"/>' +
						'\n</eventReceiver>';
					sftp.writeFile(marcconfig.REMOTEPATHFORRECEIVER + uniqueId + '.xml', htmlForReceiver, function (error) {
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

function generateInputStreamFile(sftp, companyIdForStream) {
	return new Promise((resolve, reject) => {
		try {
			/* Creating and writing in input stream file */
			/* Company id wise input stream file in publisher path specified above */
			var fileNameForInputStream = 'inp_' + companyIdForStream;
			var readStream = sftp.createReadStream(marcconfig.REMOTEPATHFORSTREAMS + fileNameForInputStream + '.json');
			/* if input file already exist then return , do not write file again */
			readStream.on('data', function (chunk) {
				return resolve('done');
			});
			/* if input file not found then write file */
			readStream.on('error', function (err) {
				var errToString = err.toString();
				if ('Error: No such file' == errToString) {
					var inpStreamAry = [{ "name": "meter", "type": "STRING" }];
					inpStreamAry.push({ "name": "time", "type": "STRING" });
					for (var i = 1; i <= marcconfig.TOTALPARAMETERCOUNT; i++) {
						inpStreamAry.push({ "name": "parameter" + i, "type": "DOUBLE" });
					}
					var inpStreamFileContent = {
						"name": fileNameForInputStream,
						"version": "1.0.0",
						"nickName": "",
						"description": "",
						"payloadData": inpStreamAry
					};
					sftp.writeFile(marcconfig.REMOTEPATHFORSTREAMS + fileNameForInputStream + '.json', JSON.stringify(inpStreamFileContent), function (error) {
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

function generateOutputStreamFile(sftp, userIdForStream) {
	return new Promise((resolve, reject) => {
		try {
			/* Creating and writing in output stream file */
			/* User id wise output stream file in publisher path specified above */
			var fileNameForOutputStream = 'out_' + userIdForStream;
			var outStreamFileContent = {
				"name": fileNameForOutputStream,
				"version": "1.0.0",
				"nickName": "",
				"description": "",
				"payloadData": [
					{ "name": "companyid", "type": "STRING" },
					{ "name": "userid", "type": "STRING" },
					{ "name": "node", "type": "STRING" },
					{ "name": "time", "type": "STRING" },
					{ "name": "id", "type": "STRING" },
					{ "name": "value1", "type": "DOUBLE" },
					{ "name": "value2", "type": "DOUBLE" },
					{ "name": "message", "type": "STRING" },
					{ "name": "data", "type": "STRING" },
					{ "name": "flag", "type": "STRING" },
					{ "name": "c_type", "type": "STRING" },
					{ "name": "emails", "type": "STRING" },
					{ "name": "mobile_no", "type": "STRING" }
				]
			};
			sftp.writeFile(marcconfig.REMOTEPATHFORSTREAMS + fileNameForOutputStream + '.json', JSON.stringify(outStreamFileContent), function (err) {
				if (err) {
					return reject(err);
				}
				return resolve('done');
			});
		} catch (Exception) {
			return reject(Exception);
		}
	});
}

function generateAlarmFile(sftp, req, companyIdForStream, userIdForStream) {
	return new Promise((resolve, reject) => {
		try {
			var id = '';
			/* Create company id wise execution plan */
			var fileName = 'exec_' + companyIdForStream + '.siddhiql';
			var communicationType = (req.body.communicationType) ? req.body.communicationType : 'BOTH';
			/* Read execution plan (company_id wise)
			if file doesn't exists then create file on readStream.error function else proceed */
			var readStream = sftp.createReadStream(marcconfig.REMOTEPATHFOREXECUTIONPLANS + fileName);
			var fileContent = '';
			var regExp = ('notification' == req.body.category)
				? "\\n\\n\/\\*Notification " + req.body.notificationId + " start\[\\s\\S\]\*\?Notification " + req.body.notificationId + " end\\*\/"
				: "\\n\\n\/\\*Alarm " + req.body.alarmId + " start\[\\s\\S\]\*\?Alarm " + req.body.alarmId + " end\\*\/";
			var replaceString = '';
			var outputStream = '';
			//Empty meterIndexObj for removing duplicacy and smoth functioning
			meterIndexObj = {};
			var sessionParameterObject = req.session.passport.user.parameters;
			if (true == req.body.isActive) {
				var query = '';
				var nodeParamList = '';
				var meterTime = 'time';
				var nodeName = '';
				if ('alarm' == req.body.category) {
					var queryObj = JSON.parse(req.body.query);
					//Function for generating equation for query  from equation object
          var EquationQuery = generateEquationQueries(queryObj.query.group, companyIdForStream, req.body.window,sessionParameterObject,req.body.limitedNotification);
					if (!EquationQuery) {
						return reject('error');
					}
					var inputStreamObjFortotalMeters = 'from ';
					for (var j = 1; j <= Object.keys(meterIndexObj).length; j++) {
						inputStreamObjFortotalMeters += "inp_" + companyIdForStream + " ->";
					}
					inputStreamObjFortotalMeters = inputStreamObjFortotalMeters.replace(/->*$/, "");
					EquationQuery = inputStreamObjFortotalMeters + "[" + EquationQuery + "]";
					//Function to generate time object for total number of meters an pass it to time.
					nodeName = queryObj.query.group.rules[0].node.nodeName;
				}
				if ('notification' == req.body.category) nodeName = req.body.nodeName;

				var commonSelect = '\nselect \'' + req.session.passport.user.company_id + '\' as companyid, \'' + req.session.passport.user.user_id + '\' as userid, ' +
					'\'' + nodeName + '\' as node, ' + meterTime + ' as time,';
				var messageString = '';
				var userMsg = req.body.message.replace(/"/g, '');

				/* if category is notification then add notification query */
				if ('notification' == req.body.category) {
					id = req.body.notificationId;
					req.body.frequencyIntervalTime = ('custom' == req.body.frequency) ? req.body.frequencyIntervalTime : '1';
					var freq = intervalString(req.body);
					nodeParamList += "'"+req.body.nodeId+"',"+"'notification',";
					var fieldName = req.body.parameterId.split('parameter');
					nodeParamList += "'" + fieldName[1] + "'," + req.body.parameterId;
					messageString += "'" + sessionParameterObject[fieldName[1]]['parameter_name'] + "'," + req.body.parameterId;
					query = 'from inp_' + companyIdForStream + '[meter==\'' + req.body.deviceIdNodeAddress + '\']' +
						commonSelect + '\'' + id + '\' as id, ' + req.body.parameterId + ' as value1, 0.00 as value2 ,messageStringConcat("' + userMsg + '#",' + messageString + ') as message, dataStringConcat(' + nodeParamList + ') as data, \'' + req.body.category + '\' as flag, \'' + communicationType + '\' as c_type, \'' + req.body.email + '\' as emails, \'' + req.body.mobile + '\' as mobile_no' +
						'\noutput last every ' + freq + '\ninsert into out_' + userIdForStream + ';';
					replaceString = '\n\n' + '/*Notification ' + id + ' start*/' + "\n" + query + "\n" + '/*Notification ' + id + ' end*/';
				} else {
					id = req.body.alarmId;
					var queryType = (req.body.limitedNotification) ? 'complex' : 'simple';
					var window = ('Fixed' == req.body.windowType)? 'time' :'timeBatch';
					//generating query type and node parameter list, passing in data attribute of query
					nodeParamList = "'"+queryObj.query.group.rules[0].node.nodeId+"',"+"'" + queryType+"'";
					if ('' != nodeParamList) {
						nodeParamList += JSON.stringify(this.paramStr);
						nodeParamList = nodeParamList.replace(/"| /g, '');
					}
					if (true == req.body.limitedNotification) {
						var parameterId = queryObj.query.group.rules[0].parameter.parameterId;
						var displayCondition = ('Constant' == queryObj.query.group.rules[0].isParamConstant) ? queryObj.query.group.rules[0].constant : queryObj.query.group.rules[0].comparisonParameter.parameterId;
					}
          /* if limited notification is true then build having query for alarm else normal query */
					query = (true == req.body.limitedNotification)
						? EquationQuery +'#window.length(2)'+ commonSelect + '\'' + id + '\' as id, min(' + queryObj.query.group.rules[0].parameter.parameterId + ') as value1, max(' + queryObj.query.group.rules[0].parameter.parameterId + ') as value2 ,' +
						'messageStringConcat("' + userMsg + '#",\'Min ' + queryObj.query.group.rules[0].parameter.parameterName + '\',min(' + queryObj.query.group.rules[0].parameter.parameterId + '),\'Max ' + queryObj.query.group.rules[0].parameter.parameterName +
						'\',max(' + queryObj.query.group.rules[0].parameter.parameterId + ')) as message, dataStringConcat(' + nodeParamList + ') as data, \'' + req.body.category + '\' as flag, \'' + communicationType + '\' as c_type, \'' + req.body.email +
						'\' as emails, \'' + req.body.mobile + '\' as mobile_no' + ' having value1 < ' + displayCondition + ' AND value2 >=' + displayCondition + '\ninsert into out_' + userIdForStream + ';'
						: EquationQuery +'#window.'+window+'('+req.body.window+' min)'+ commonSelect + '\'' + id + '\' as id, 0.00 as value1, 0.00 as value2,messageStringConcat("' + userMsg + '#"'+this.msgStr+') as message,dataStringConcat(' + nodeParamList + ') as data, \'' + req.body.category + '\' as flag, ' +
						'\'' + communicationType + '\' as c_type, \'' + req.body.email + '\' as emails, \'' + req.body.mobile + '\' as mobile_no\n' + 'insert into out_' + userIdForStream + ';';

					replaceString = '\n\n' + '/*Alarm ' + id + ' start*/' + "\n" + query + "\n" + '/*Alarm ' + id + ' end*/';
				}
				outputStream = "/*Output stream " + userIdForStream + " start*/\n@Export('out_" + userIdForStream + ":1.0.0')\ndefine stream out_" + userIdForStream +
					" (companyid string,userid string,node string,time string,id string,value1 double,value2 double, message string, data string, flag string, c_type string, emails string,mobile_no string);\n/*Output stream " + userIdForStream + " end*/\n\n/*Output Stream*/";

			}
		} catch (exception) {
			return reject('error');
		}
		/* Enter into this function file exists(data is present) */
		readStream.on('data', function (chunk) {
			fileContent = chunk.toString('utf8');
			/* Devare output stream on add and edit action as it will be added again in next line
			note -  Dont devare output stream though all alarms and notification are devared */
			if ('add' == req.body.action || 'edit' == req.body.action || true == req.body.isActive) {
				var expForOutputStream = new RegExp("\\n\\n\/\\*Output stream " + userIdForStream + " start\[\\s\\S\]\*\?Output stream " + userIdForStream + " end\\*\/", "gi");
				fileContent = fileContent.replace(expForOutputStream, '');
			}
			/* Replace alarm and notification if already present */
			var regularExpression = new RegExp(regExp, "gi");
			fileContent = fileContent.replace(regularExpression, '');

			/* Replace output stream with string 'Output stream'
			Append alarms and notification */
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
					/* if file doesn't exists create one and add input and output stream with (alarm or notification) into it */
					var inputStream = "/*Input stream start*/\n@Import('inp_" + companyIdForStream + ":1.0.0')" +
						"\ndefine stream inp_" + companyIdForStream + " (meter string, time string,";
					/* For loop for adding all parameters in input stream */
					for (var j = 1; j <= marcconfig.TOTALPARAMETERCOUNT; j++) {
						inputStream += ' parameter' + j + ' double,';
					}
					inputStream = inputStream.replace(/,*$/, ") ;");
					inputStream += "\n/*Input stream end*/";
					/* for loop starts from 2 as parameters are passed from postion 3 onwards (postion 1 - node id, postion 2 - query type) */
					var concatFn = "\n\n/*Data string concat function start*/"+
					"\ndefine function dataStringConcat[JavaScript] return string {"+
					"\n\tvar str = '{';"+
					"\n\tstr += '\"nodeId\":\"'+data[0]+'\",\"query\":\"'+data[1]+'\",\"parameterId\":{'"+
					"\n\tfor(var i=2;i<data.length;i++){"+
							"\n\t\tif(0 == i%2){"+
									"\n\t\t\tstr += ((2 != i) ? ',': '')+'\"'+data[i]+'\":';"+
							"\n\t\t}"+
							"\n\t\telse{"+
									"\n\t\t\tstr +='\"'+data[i]+'\"';"+
							"\n\t\t}"+
					"\n\t}"+
					"\n\tstr += '}}';"+
					"\n\treturn str;"+
					"\n};\n /*Data string concat function end*/";
					var concatMessageFn = "\n\n/*Message string concat function start*/"+
					"\ndefine function messageStringConcat[JavaScript] return string {"+
					"\n\tvar str = '';"+
					"\n\tstr += data[0]+' ';"+
					"\n\tfor(var i=1;i<data.length;i++){"+
							"\n\t\tstr += data[i]+': '+data[++i]+' ';"+
					"\n\t}"+
					"\n\treturn str;"+
					"\n};\n /*Message string concat function end*/";
					var template = "/*Enter a unique ExecutionPlan*/\n@Plan:name('exec_" + companyIdForStream + "')\n\n" + inputStream + "\n\n" + outputStream + concatFn + concatMessageFn + replaceString;
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

function generatepublisherFile(sftp,req,userIdForStream){
	return new Promise((resolve, reject) =>{
		try{
			 /* User id wise email/sms file in publisher path specified above */
			 var fileName = 'pub_'+userIdForStream;
			 var readStream = sftp.createReadStream(marcconfig.REMOTEPATHFORPUBLISHERS+fileName+'.xml');
			 var fileContent = '';
			 readStream.on('data',function(chunk){
				 return resolve('done');
			 });
			 readStream.on('error', function(err) {
				 var errToString = err.toString();
				 if('Error: No such file' == errToString){
					var htmlForSms ='<?xml version="1.0" encoding="UTF-8"?>'+
													'\n<eventPublisher name="'+fileName+'" statistics="disable" trace="disable" xmlns="http://wso2.org/carbon/eventpublisher">'+
													'\n<from streamName="out_'+userIdForStream+'" version="1.0.0"/>'+
													'\n<mapping customMapping="disable" type="text"></mapping>'+
													'\n<to eventAdapterType="custom-sms">'+
															'\n<property name="email.address"></property>'+
													'\n</to>'+
													'\n</eventPublisher>';
					 sftp.writeFile(marcconfig.REMOTEPATHFORPUBLISHERS+fileName+'.xml', htmlForSms, function(error) {
						 if (error) {
							 return reject(error);
						 }
						 return resolve('done');
					 });
				  }
			 });
		 }catch(Exception){
			 return reject(Exception);
		 }
	});
}

router.post('/alarmCount', authenticationHelpers.isClientAuth, function (req, res) {
	alarmandnotification.alarmCount(req.session.passport.user, function (err, result) {
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

router.post('/pushEventsCount', authenticationHelpers.isClientAuth, function(req, res){
	alarmandnotification.pushEventsCount(req.session.passport.user,function(err, result){
		if (err) { 
			res.json({"error" : true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
			if (!result) {  
			res.json({"error" : false,"reason": "No record found.","result" : {}}); 
			return res; 
		}
		res.json({result});
		res.end();
		return res;
	});
});

function generateEquationQueries(group, companyIdForStream, window,sessionParameterObject,limitedNotification) {
	if (!group) return "";
	this.paramStr = '';
  this.msgStr = '';
	for (var str = "", i = 0; i < group.rules.length; i++) {
		i > 0 && (str += " " + group.condition + " ");
		var rulesAry = group.rules[i];
		if (rulesAry.group) {
			str += generateEquationQueries(rulesAry.group, companyIdForStream, window,sessionParameterObject);
		} else {
			if (!meterIndexObj[rulesAry.node.deviceIdNodeAddress]) {
				meterIndexObj[rulesAry.node.deviceIdNodeAddress] = Object.keys(meterIndexObj).length + 1;
			}
			var parameterId = rulesAry.parameter.parameterId.split('parameter');
			this.paramStr += ",'"+parameterId[1]+"',"+rulesAry.parameter.parameterId;
			this.msgStr += ",'"+sessionParameterObject[parameterId[1]]['parameter_name'] + "'," + rulesAry.parameter.parameterId;
      str += "(meter == '" + rulesAry.node.deviceIdNodeAddress;
      str += (true == limitedNotification)? "')" : "' AND " + rulesAry.parameter.parameterId + " " + rulesAry.operator + " " + (('Constant' == rulesAry.isParamConstant) ? rulesAry.constant : rulesAry.comparisonParameter.parameterId) + ")";
		}
	}
	str + ")";
	return str;
}

module.exports = router;