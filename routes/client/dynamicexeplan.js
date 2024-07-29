var express = require('express'),
	http = require('http');
var app = express();
app.set('port', 1000);
global.__base = __dirname + '/../';
// marcconfig = require(__base + 'config/config');
marcconfig = require('../../config/config');
var general = require('../../models').general;
// var general = require(__base + 'models').general;
var momentTimezone = require('moment-timezone');
var object = {};
var nodeId = [];
var array = [];
var ar = [];
var fs = require('fs');
const { exception } = require('console');
var nodeobj = {};
var abc = { 'query': { 'group': '' } };
var insertquery = '';
var companyId = '';
var meterIndexObj = {};
var nodeName = '';
var concatMessageFn = '';
var scriptserver = http.createServer(app).listen(app.get('port'), function (err) {
	console.log('Script server listening on port ' + app.get('port'));
	// alarmList();
	ssh2Connection();
});

function alarmList() {
	params = { query: "select * from alarm" };
	general.dbSelect(params, function (err, result) {
		ssh2Connection(result)
	});
}

function ssh2Connection(result) {
	general.ssh2Connection(function (err, sftp) {
		if (err) {
			return;
		}
		Promise.all([
			getCompanyAlarmList()
		]).then(function (resultOfList) {
			var parameterId = '';
			var nodeUniqueId = '';
			var nodeUniqueIdObj = {};
			try {
				if (null != resultOfList[0]) {
					resultOfList[0].forEach(element => {
						params1 = { query: "select * from node where is_deleted = ? and company_id = ? allow filtering;", where: [0, element.company_id] };
						general.dbSelect(params1, function (err, result) {
							for (i = 0; i < result.length; i++) {
								object[result[i].node_id] = result[i].node_unique_id
								nodeobj[[result[i].node_id]] = result[i].node_name
							}
							nodeName = nodeobj[element.node_id]
							if (false == element['is_active']) return;
							nodeUniqueId = object[element.node_id];
							if ('undefined' == typeof nodeUniqueIdObj[nodeUniqueId]) nodeUniqueIdObj[nodeUniqueId] = [];
							parameterId = element.parameter_id.split('parameter');
							if (-1 == nodeUniqueIdObj[nodeUniqueId].indexOf(parameterId[1])) nodeUniqueIdObj[nodeUniqueId].push(parameterId[1]);
							// console.log(nodeUniqueIdObj[0])
							nodeUniqueIdObj[nodeUniqueId].sort(function (a, b) { return a - b });
							// var equationQueryObj = generateEquationQueries(queryObj.query.group, companyIdForStream);
							companyId = element.company_id;
							var companyIdForStream = companyId.replace(/[-]/g, '_');
							var userIdForStream = element.user_id.replace(/[-]/g, '_');
							// console.log(companyIdForStream, userIdForStream)
							if ('undefined' == typeof nodeUniqueIdObj[object[element.node_id]]) nodeUniqueIdObj[object[element.node_id]] = [];
							Promise.all([
								generateRecieverFile(sftp, nodeUniqueId, nodeUniqueIdObj[nodeUniqueId]),
								generateInputStreamFile(sftp, nodeUniqueId, nodeUniqueIdObj[nodeUniqueId], companyIdForStream),
								generateOutputStreamFile(sftp, userIdForStream)
							]).then(function (result) {
								if ('done' == result[0] && 'done' == result[1] && 'done' == result[2]) {
									Promise.all([
										generateAlarmFile(sftp, element, companyIdForStream, userIdForStream, nodeUniqueIdObj,nodeUniqueId),
										generatepublisherFile(sftp, userIdForStream)
									]).then(function (result) {
										console.log('success', result)
									}).catch('wos2exeplan', errorOfStream => {
										console.log(errorOfStream)
									});
								}
							}).catch('wos2catch', errorOfStream => {
								console.log(errorOfStream)
							});
						});
					});
				}
			}
			catch (exception) {
				console.log('trycatch', exception)
			}
			// var companyIdForStream = req.session.passport.user.company_id.replace(/[-]/g, '_');
			// var userIdForStream = req.session.passport.user.user_id.replace(/[-]/g, '_');
		}).catch(errorOfStream => {
			console.log('mainpromise', errorOfStream)
		});
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

function generateAlarmFile(sftp, req, companyIdForStream, userIdForStream, nodeWiseParametersObj,nodeUniqueId) {
	// console.log(req, companyIdForStream, userIdForStream, nodeWiseParametersObj)
	// console.log(req, '\n')
	return new Promise((resolve, reject) => {
		try {
			var id = '', fileContent = '', replaceString = '', outputStream = '', query = '', nodeParamList = '', meterTime = 'time';
			/* Create company id wise execution plan */
			var fileName = 'exec_' + companyIdForStream + '.siddhiql';
			var communicationType = req.communication_type;
			/* Read execution plan (company_id wise)
			if file doesn't exists then create file on readStream.error function else proceed */
			var readStream = sftp.createReadStream(marcconfig.REMOTEPATHFOREXECUTIONPLANS + fileName);
			// var regExp = ('undefined' == req.alarm_id)
			// ? "\\n\\n\/\\*Alarm " + req.alarm_id + " start\[\\s\\S\]\*\?Alarm " + req.alarm_id + " end\\*\/"
			//  :    "\\n\\n\/\\*Notification " + req.body.notificationId + " start\[\\s\\S\]\*\?Notification " + req.body.notificationId + " end\\*\/";
			var regExp =  "\\n\\n\/\\*Notification " +  req.notification_id + " start\[\\s\\S\]\*\?Notification " +  req.notification_id + " end\\*\/"
			var commonSelect = '\nselect \'' + req.company_id + '\' as companyid, \'' + req.user_id + '\' as userid, ';
			var userMsg = req.message.replace(/"/g, '');
			// console.log(JSON.parse(req.query).query.group.rules[0].node.nodeName)
			if (true == req.is_active) {
				var messageString = '';
				id = req.notification_id;
				commonSelect += '\'' + nodeName + '\' as node, ' + meterTime + ' as time,';
				req.frequencyIntervalTime = ('custom' == req.frequency) ? req.frequency_interval_time : '1';
				// console.log(req.frequencyIntervalTime)
				var freq = intervalString(req);
				nodeParamList += "'" + req.node_id + "'," + "'notification',";
				var fieldName = req.parameter_id.split('parameter');
				var paramData = req.parameter_id;
				// if ('1' == req.body.parameterType && 'atEvent' != req.body.value) { paramData = req.body.value + '(' + req.body.parameterId + ')' }
				// if ('1' != req.body.parameterType && 'atEvent' != req.body.value) {
				// 	paramData = ('startReading' == req.body.value) ? 'min(' + req.body.parameterId + ')' : (('endReading' == req.body.value) ? 'max(' + req.body.parameterId + ')' : 'max(' + req.body.parameterId + ') - min(' + req.body.parameterId + ')');
				// }
				nodeParamList += "'" + fieldName[1] + "'," + paramData;
				messageString += "'" +  "'," + paramData;
				query = 'from inp_' + nodeUniqueId + '[meter==\'' + nodeUniqueId + '\']' +
					commonSelect + '\'' + id + '\' as id, ' + paramData + ' as value1, 0.00 as value2 ,messageStringConcat("' + userMsg + '#",' + messageString + ') as message, dataStringConcat(' + nodeParamList + ') as data, \'' + 'notification' + '\' as flag, \'' + communicationType + '\' as c_type, \'' + req.email + '\' as emails, \'' + req.mobile + '\' as mobile_no' +
					'\noutput last every ' + freq + '\ninsert into out_' + userIdForStream + ';';
				replaceString = '\n\n' + '/*Notification ' + id + ' start*/' + "\n" + query + "\n" + '/*Notification ' + id + ' end*/';
				// console.log(replaceString)
			}
			var allInputStreams = "/*Input stream start*/";
			for (let nodeUniqueId in nodeWiseParametersObj) {
				/* create,add input and output stream with (alarm or notification) into it */
				if (0 < nodeWiseParametersObj[nodeUniqueId].length) {
					var inputStream = "\n@Import('inp_" + nodeUniqueId + ":1.0.0')\ndefine stream inp_" + nodeUniqueId + " (meter string, time string,";
					nodeWiseParametersObj[nodeUniqueId].forEach(paramId => {
						inputStream += ' parameter' + paramId + ' double,';
					});
					inputStream = inputStream.replace(/,*$/, ") ;");
					allInputStreams += inputStream + "\n";
					nodeWiseParametersObj[nodeUniqueId];
				}
			}
			allInputStreams += "/*Input stream end*/\n\n/*Input Stream*/";
			// console.log(allInputStreams)
			outputStream = "/*Output stream " + userIdForStream + " start*/\n@Export('out_" + userIdForStream + ":1.0.0')" +
				"\ndefine stream out_" + userIdForStream + "(companyid string,userid string,node string,time string,id string,value1 double,value2 double, message string, data string, flag string, c_type string, emails string,mobile_no string);\n";
			// if (req.window > 0 && req.window_type == 'Fixed') {
			// 	outputStream += "\ndefine stream out2(meter string, time string, " + out2stream + "etime long, stime long);\ndefine stream out3 (meter string, time string, out3value1 double, out3value2 double, st long, et long, ct long);";
			// }
			outputStream += "\n/*Output stream " + userIdForStream + " end*/\n\n/*Output Stream*/";
			// console.log('out', outputStream)
			// console.log(replaceString)
			// console.log('=================================================================')
			concatFn = "\n\n/*Data string concat function start*/" +
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
			concatMessageFn = "\n\n/*Message string concat function start*/" +
				"\ndefine function messageStringConcat[JavaScript] return string {" +
				"\n\tvar str = '';" +
				"\n\tstr += data[0]+' ';" +
				"\n\tfor(var i=1;i<data.length;i++){" +
				"\n\t\tstr += data[i]+': '+data[++i]+' ';" +
				"\n\t}" +
				"\n\treturn str;" +
				"\n};\n /*Message string concat function end*/";
		} catch (exception) {
			return reject('error', exception);
		}
		readStream.on('data', function (chunk) {
			fileContent = chunk.toString('utf8');
			/* Delete output stream on add and edit action as it will be added again in next line note -  Dont delete output stream though all alarms and notification are delete */
			if (true == req.is_active) {
				var expForOutputStream = new RegExp("\\n\\n\/\\*Output stream " + userIdForStream + " start\[\\s\\S\]\*\?Output stream " + userIdForStream + " end\\*\/", "gi");
				fileContent = fileContent.replace(expForOutputStream, '');
				// console.log('1-------------', fileContent)
			}
			/* Replace alarm and notification if already present, used for global search case-insensitive*/
			var regularExpression = new RegExp(regExp, "gi");
			fileContent = fileContent.replace(regularExpression, '');
			// console.log('2-------------', fileContent)

			var expForInputStream = new RegExp("\\n\\n\/\\*Input stream start\[\\s\\S\]\*\?Input stream end\\*\/", "gi");
			fileContent = fileContent.replace(expForInputStream, '');
			fileContent = fileContent.replace('\/\*Input Stream\*\/', allInputStreams);

			/* Replace output stream with string 'Output stream', Append alarms and notification */
			if (true == req.is_active) {
				fileContent = fileContent.replace('\/\*Output Stream\*\/', outputStream);
				fileContent = fileContent + replaceString;
				// console.log('3-------------', fileContent)
			}
			// console.log('final----------------', fileContent)
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

		readStream.on('error', function (err) {
			try {
				var errToString = err.toString();
				if ('Error: No such file' == errToString) {
					/* for loop starts from 2 as parameters are passed from postion 3 onwards (postion 1 - node id, postion 2 - query type) */

					var template = "/*Enter a unique ExecutionPlan*/\n@Plan:name('exec_" + companyIdForStream + "')\n\n" + allInputStreams + "\n\n" + outputStream + concatFn + concatMessageFn + replaceString;
					// console.log('--------------------------------------------------------------')
					console.log('template===========', template)
					// console.log('***************************************************************')
					// fs.writeFile('test.txt', template, 'utf8', function(error){
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

function generatepublisherFile(sftp, userIdForStream) {
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
			console.log('exceptionpub', Exception)
			return reject(Exception);
		}
	});
}

function getCompanyAlarmList() {
	return new Promise((resolve, reject) => {
		// 5b1960af-4f73-4bd5-96ba-432dd99bb0dd
		// params = { query: "select * from alarm_copy1 where company_id = 'aa77a06b-576d-49d5-9b8c-2410b4867b58'" };
		// params = { query: "SELECT * FROM alarm_copy1 WHERE alarm_id = 482abbf7-75ac-4cda-b75d-ba3b1e88dbd1 allow filtering;" };
		params = { query: "SELECT * FROM notification WHERE notification_id = ad93dc6b-d666-4678-ad2a-a1cd560f74d2;" };
		general.dbSelect(params, function (err, result) {
			if (err != null) {
				return reject(err);
			}
			return resolve(result);
		});
	});
}

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
		case 'custom': freq = intervalString({ frequency: frequency.frequency_interval, frequencyIntervalTime: frequency.frequencyIntervalTime });

	}
	return freq;
}

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
			var parameterId = rulesAry.parameter.parameterId.split('parameter');
			if ('Parameter' == rulesAry.isParamConstant) {
				var comparisonParameterId = rulesAry.comparisonParameter.parameterId.split('parameter')[1];
			}
			parameters += "min(" + rulesAry.parameter.parameterId + ") as minout2value" + [i] + ",max(" + rulesAry.parameter.parameterId + ") as maxout2value" + [i] + ',';
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
			this.dataStr += ",'" + parameterId[1] + "',";
			this.paramStr += ",'" + parameterId[1] + "'," + rulesAry.parameter.parameterId;
			this.msgStr += ",'" + rulesAry.parameter.parameterName + "'," + rulesAry.parameter.parameterId;
			this.out3 += ",'" + rulesAry.parameter.parameterName + "',";
			this.parameterName = ",'" + rulesAry.parameter.parameterName + "',";
			str += "(meter == '" + rulesAry.node.nodeUniqueId + "' AND " + rulesAry.parameter.parameterId + " " + rulesAry.operator + " " + (('Constant' == rulesAry.isParamConstant) ? rulesAry.constant : rulesAry.comparisonParameter.parameterId) + ")";
			newStr += "(meter == '" + rulesAry.node.nodeUniqueId + "' AND " + rulesAry.parameter.parameterId + " != " + (('Constant' == rulesAry.isParamConstant) ? '0.00000098' : rulesAry.comparisonParameter.parameterId) + ")";
		}
		dataStr += this.out1;
		this.out3 += this.out1;
	}
	str + ")";
	newStr + ")";
	return { str: str, new: this.newStr };
}

function getNodeParametersFromQuery(group, nodeUniqueIdObj, nodeUniqueId) {
	if (!group) return "";
	for (i = 0; i < group.rules.length; i++) {
		var rulesAry = group.rules[i];
		// nodeUniqueId =(rulesAry.node.nodeUniqueId)
		// console.log(rulesAry)
		if (rulesAry.group) {
			generateEquationQueries(rulesAry.group);
		}
		else {
			if ('undefined' == typeof nodeUniqueIdObj[rulesAry.node.nodeUniqueId]) nodeUniqueIdObj[rulesAry.node.nodeUniqueId] = [];
			var parameterId = rulesAry.parameter.parameterId.split('parameter')[1];
			if (-1 == nodeUniqueIdObj[rulesAry.node.nodeUniqueId].indexOf(parameterId)) nodeUniqueIdObj[rulesAry.node.nodeUniqueId].push(parameterId);
			if ('Parameter' == rulesAry.isParamConstant) {
				var comparisonParameterId = rulesAry.comparisonParameter.parameterId.split('parameter')[1];
				if (-1 == nodeUniqueIdObj[rulesAry.node.nodeUniqueId].indexOf(comparisonParameterId)) nodeUniqueIdObj[rulesAry.node.nodeUniqueId].push(comparisonParameterId);
			}
			nodeUniqueIdObj[rulesAry.node.nodeUniqueId].sort();
		}
	}
}