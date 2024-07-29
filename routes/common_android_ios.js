var math = require('mathjs');
var lodash = require('lodash');
var report = require(__base + 'models').report;
var moment = require('moment');
var momentTimezone = require('moment-timezone');

exports.getRealtimeData = function(request,cb){
	var queryParameters = {};
	queryParameters.nodeId = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateTimeObject = momentTimezone.utc(toDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var dateTimeSlots = nodeTimeZoneSlotCalculation(fromDateTimeObject,toDateTimeObject);
	queryParameters.fromDate = momentTimezone.tz(fromDateTime,'YYYY-MM-DD HH:mm:ssZ',userTimezoneSettings['timezone']).utc().format('YYYY-MM-DD HH:mm:ssZ')
	queryParameters.toDate = momentTimezone.tz(toDateTime,'YYYY-MM-DD HH:mm:ssZ',userTimezoneSettings['timezone']).utc().format('YYYY-MM-DD HH:mm:ssZ')
	queryParameters.slot = [dateTimeSlots.fromSlot,dateTimeSlots.toSlot];
	report.findRealtimeData(queryParameters, function(err, data) {
		try{
			if (err) {
				var responseObj = {};
				responseObj.error = true;
				responseObj.reason ="Error: Unable to get data. Please try again!";
				return cb(null,responseObj); 
			}
			var objData = {data:{}};
			if(!data || 0 == data.length) { return cb(null, objData); }
			var objReadings = {};
			for(var key in data){
				var arrNodeData = JSON.parse(data[key].parameters_values);
				if('undefined' === typeof objReadings[data[key].node_id]){
					request.body.parameterId.forEach(function (parameter,index) {
						objReadings[data[key].node_id+'_'+parameter] = (arrNodeData[parameter]) ? parseFloat(arrNodeData[parameter]) : null;
					});
				}
			}
			objData['data'] = objReadings;
			return cb(null, objData);
		}catch(exception){
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason ="Error: Unable to get data. Please try again!";
			return cb(null,responseObj); 
		}
	});
};

exports.getCummulativeFifteenMinutesData = function(request,cb){
	var queryParameters = {};
	queryParameters.nodeId = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var lastRecordDate = '';
	var toDateTimeObject = momentTimezone.utc(toDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	if(0 != request.body.readingGap){
		('23:59' == toDateTimeObject.format('HH:mm')) ? toDateTimeObject.add(1,'seconds').add(15,'minutes') : toDateTimeObject.add(15,'minutes');
		lastRecordDate = momentTimezone(toDateTimeObject).subtract(15,'minutes').format('DD-MM-YYYY HH:mm')+ ' - '+ toDateTimeObject.format('HH:mm');
	}
	queryParameters.fromDate = fromDateTimeObject.format('YYYY-MM-DD');
	queryParameters.toDate = toDateTimeObject.format('YYYY-MM-DD');
	report.findFifteenMinutesReadingsByNode(queryParameters, function(err, data) {
		try{
			if(err) { 
				responseObj = {};
				responseObj.error = true;
				responseObj.reason ="Error: Unable to get data. Please try again!";
				return cb(null,responseObj); 
			}
			var objData = {data:{}};
			if(!data || 0 == data.length) { return cb(null, objData); }
			var objNonSortData = createIntervalDataArray(fromDateTimeObject, toDateTimeObject,userTimezoneSettings.timezone,15);
			var objSlot = createTimeAsPerDataPoints(15,96);
			var nodeId = '';
			var nodeObject = {};
			var extractedValues,date,parameterValues,time,nodeTime,parameterId;
			var parameterDivision = {};
			var timestamp;
			for(var nodeIndex=0;nodeIndex<request.body.nodeId.length;nodeIndex++){
				request.body.parameterId.forEach(function (parameter,index) {
					parameterDivision[parameter] = 1;
					if('9d3d2d7f-0c70-4408-8630-4796bce49a2d' == userTimezoneSettings.companyId && '37' == parameter){
						parameterDivision[parameter] = 1000;
					}
					nodeObject[request.body.nodeId[nodeIndex]+'_'+parameter] = {startReading:null,endReading:null,difference:null,speed:null,acceleration:null,sampling:null,count:null};
				});
			}
			for (var i=0; i<data.length; i++) {
				parameterValues = JSON.parse(data[i].fvalues);
				date = moment(data[i].reading_date,'YYYY-MM-DD').format('DD-MM-YYYY');
				for(var key in parameterValues){
					extractedValues = parameterValues[key].split(',');
					time = objSlot[key];
					nodeTime = date+' '+time[0]+' - '+time[1];
					if(objNonSortData[nodeTime]){
						parameterId = data[i].fparameters;
						nodeId = data[i].fnode_id;
						
						if(1 == Object.keys(objNonSortData[nodeTime]).length){
							timestamp = objNonSortData[nodeTime]['timestamp'];
							objNonSortData[nodeTime] = lodash.clone(nodeObject);
							objNonSortData[nodeTime]['timestamp'] = timestamp;
						}
						objNonSortData[nodeTime][nodeId+'_'+parameterId] = {startReading:parseFloat(extractedValues[1])/parameterDivision[parameterId],endReading:parseFloat(extractedValues[0])/parameterDivision[parameterId],difference: parseFloat(extractedValues[2])/parameterDivision[parameterId],speed:parseFloat(extractedValues[3]),acceleration:parseFloat(extractedValues[4]),sampling:parseFloat(extractedValues[5]),count:parseFloat(extractedValues[6])};
					}
				}	
			}
			var previousKey = '';
			var objReadings = {};
			var objPreviousValues = {};
			for(var key in objNonSortData){
				if(1  ==  Object.keys(objNonSortData[key]).length){
					timestamp = objNonSortData[key]['timestamp'];
					objNonSortData[key] = lodash.cloneDeep(nodeObject);
					objNonSortData[key]['timestamp'] = timestamp;
				}
				
				if(0 == request.body.readingGap){
					objReadings[key] = {};
					objReadings[key] = objNonSortData[key];
					continue;
				}
				for(var node in objNonSortData[key]){
					if(null != objNonSortData[key][node].startReading){
						if('undefined' !== typeof objPreviousValues[node]){
							previousKey = objPreviousValues[node];
							objNonSortData[previousKey][node].difference = (null !== objNonSortData[previousKey][node].difference) ? objNonSortData[previousKey][node].difference + (objNonSortData[key][node].startReading - objNonSortData[previousKey][node].endReading) : (0 + (objNonSortData[key][node].startReading - objNonSortData[previousKey][node].endReading)) ;
							objNonSortData[previousKey][node].endReading = objNonSortData[key][node].startReading;
						}
						objPreviousValues[node] = '';
						objPreviousValues[node] = key;
					}
				}

				if(lastRecordDate == key){
					break;
				}
				
				objReadings[key] = {};
				objReadings[key] = objNonSortData[key];
			}
			objData['data'] = objReadings;
			return cb(null, objData);
		}catch(exception){
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason ="Error: Unable to get data. Please try again!";
			return cb(null,responseObj);
		}
	});
};

exports.getInstantaneousFifteenMinutesData = function(request,cb){
	var queryParameters = {};
	queryParameters.nodeId = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateTimeObject = momentTimezone.utc(toDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	queryParameters.fromDate = fromDateTimeObject.format('YYYY-MM-DD');
	queryParameters.toDate = toDateTimeObject.format('YYYY-MM-DD');
	report.findFifteenMinutesReadingsByNode(queryParameters, function(err, data) {
		try{
			if(err) { 
				responseObj = {};
				responseObj.error = true;
				responseObj.reason ="Error: Unable to get data. Please try again!";
				return cb(null,responseObj); 
			}
			var objData = {data:{}};
			if (!data || 0 == data.length) { return cb(null, objData); }
			var objNonSortData = createIntervalDataArray(fromDateTimeObject, toDateTimeObject,userTimezoneSettings.timezone,15);
			var objSlot = createTimeAsPerDataPoints(15,96);
			var nodeId = '';
			var nodeObject = {};
			var extractedValues,date,parameterValues,time,nodeTime,parameterId,timestamp;
			for(var nodeIndex=0;nodeIndex<request.body.nodeId.length;nodeIndex++){
				request.body.parameterId.forEach(function (parameter,index) {
					nodeObject[request.body.nodeId[nodeIndex]+'_'+parameter] = {min:null,max:null,average:null,sampling:null,count:null,standardDeviation:null};
				});
			}
			for (var i=0; i<data.length; i++) {
				var parameterValues = JSON.parse(data[i].fvalues);
				var date = moment(data[i].reading_date,'YYYY-MM-DD').format('DD-MM-YYYY');
				for(var key in parameterValues){
					extractedValues = parameterValues[key].split(',');
					time = objSlot[key];
					nodeTime = date+' '+time[0]+' - '+time[1];
					if(objNonSortData[nodeTime]){
						parameterId = data[i].fparameters;
						nodeId = data[i].fnode_id;
						if(1 == Object.keys(objNonSortData[nodeTime]).length){
							timestamp  =objNonSortData[nodeTime]['timestamp'];
							objNonSortData[nodeTime] = lodash.clone(nodeObject);
							objNonSortData[nodeTime]['timestamp'] = timestamp;
						}
						objNonSortData[nodeTime][nodeId+'_'+parameterId] = {min:parseFloat(extractedValues[2]),max:parseFloat(extractedValues[3]),average: parseFloat(extractedValues[0]),sampling:parseFloat(extractedValues[4]),count:parseFloat(extractedValues[5]),standardDeviation:parseFloat(extractedValues[1])};
					}
				}
				
			}
			for(var key in objNonSortData){
				if(1  ==  Object.keys(objNonSortData[key]).length){
					timestamp = objNonSortData[key]['timestamp'];
					objNonSortData[key] = lodash.cloneDeep(nodeObject);
					objNonSortData[key]['timestamp'] = timestamp;
				}
			}
			objData['data'] = objNonSortData;
			return cb(null, objData);
		}catch(exception){
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason ="Error: Unable to get data. Please try again!";
			return cb(null,responseObj);
		}
	});
};

exports.getInstantaneousHourlyData = function(request,cb){
	var queryParameters = {};
	queryParameters.nodeId = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateTimeObject = momentTimezone.utc(toDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	queryParameters.fromDate = fromDateTimeObject.format('YYYY-MM-DD');
	queryParameters.toDate = toDateTimeObject.format('YYYY-MM-DD');
	report.findHourlyReadingsByNode(queryParameters, function(err, data) {
		try{
			if(err) { 
				responseObj = {};
				responseObj.error = true;
				responseObj.reason ="Error: Unable to get data. Please try again!";
				return cb(null,responseObj); 
			}
			var objData = {data:{}};
			if (!data || 0 == data.length) { return cb(null, objData); }
			var objNonSortData = createIntervalDataArray(fromDateTimeObject, toDateTimeObject,userTimezoneSettings.timezone,60);
			var objSlot = createTimeAsPerDataPoints(60,24);
			var nodeObject = {};
			var extractedValues,date,parameterValues,time,nodeTime,timestamp;
			for(var nodeIndex=0;nodeIndex<request.body.nodeId.length;nodeIndex++){
				request.body.parameterId.forEach(function (parameter,index) {
					nodeObject[request.body.nodeId[nodeIndex]+'_'+parameter] = {min:null,max:null,average:null,sampling:null,count:null,standardDeviation:null};
				});
			}
			for (var i=0; i<data.length; i++) {
				var parameterValues = JSON.parse(data[i].hvalues);
				var date = moment(data[i].reading_date,'YYYY-MM-DD').format('DD-MM-YYYY');
				for(var key in parameterValues){
					extractedValues = parameterValues[key].split(',');
					time = objSlot[key];
					nodeTime = date+' '+time[0]+' - '+time[1];
					if(objNonSortData[nodeTime]){
						if(1 == Object.keys(objNonSortData[nodeTime]).length){
							timestamp  =objNonSortData[nodeTime]['timestamp'];
							objNonSortData[nodeTime] = lodash.clone(nodeObject);
							objNonSortData[nodeTime]['timestamp'] = timestamp;
						}
						objNonSortData[nodeTime][data[i].fnode_id+'_'+data[i].fparameters] = {min:parseFloat(extractedValues[2]),max:parseFloat(extractedValues[3]),average: parseFloat(extractedValues[0]),sampling:parseFloat(extractedValues[4]),count:parseFloat(extractedValues[5]),standardDeviation:parseFloat(extractedValues[1])};
					}
				}
				
			}

			for(var key in objNonSortData){
				if(1  ==  Object.keys(objNonSortData[key]).length){
					timestamp = objNonSortData[key]['timestamp'];
					objNonSortData[key] = lodash.cloneDeep(nodeObject);
					objNonSortData[key]['timestamp'] = timestamp;
				}
			}
			objData['data'] = objNonSortData;
			return cb(null, objData);
		}catch(exception){
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason ="Error: Unable to get data. Please try again!";
			return cb(null,responseObj);
		}
	});
};

exports.getCummulativeHourlyData = function(request,cb){
	var queryParameters = {};
	queryParameters.nodeId = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateTimeObject = momentTimezone.utc(toDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var lastRecordDate = '';
	if(0 != request.body.readingGap){
		('23:59' == toDateTimeObject.format('HH:mm')) ? toDateTimeObject.add(1,'seconds').add(1,'hours') : toDateTimeObject.add(1,'hours');
		lastRecordDate = momentTimezone(toDateTimeObject).subtract(1,'hours').format('DD-MM-YYYY HH:mm')+ ' - '+ toDateTimeObject.format('HH:mm');
	}
	queryParameters.fromDate = fromDateTimeObject.format('YYYY-MM-DD');
	queryParameters.toDate = toDateTimeObject.format('YYYY-MM-DD');
	report.findHourlyReadingsByNode(queryParameters, function(err, data) {
		try{
			if(err) { 
				responseObj = {};
				responseObj.error = true;
				responseObj.reason ="Error: Unable to get data. Please try again!";
				return cb(null,responseObj); 
			}
			var objData = {data:{}};
			if(!data || 0 == data.length) { return cb(null, objData); }
			var objNonSortData = createIntervalDataArray(fromDateTimeObject, toDateTimeObject,userTimezoneSettings.timezone,60);
			var objSlot = createTimeAsPerDataPoints(60,24);
			var nodeObject = {};
			var extractedValues,date,parameterValues,time,nodeTime,timestamp;
			var parameterDivision = {};
			for(var nodeIndex=0;nodeIndex<request.body.nodeId.length;nodeIndex++){
				request.body.parameterId.forEach(function (parameter,index) {
					parameterDivision[parameter] = 1;
					if('9d3d2d7f-0c70-4408-8630-4796bce49a2d' == userTimezoneSettings.companyId && '37' == parameter){
						parameterDivision[parameter] = 1000;
					}
					nodeObject[request.body.nodeId[nodeIndex]+'_'+parameter] = {startReading:null,endReading:null,difference:null,speed:null,acceleration:null,sampling:null,count:null};
				});
			}
			for (var i=0; i<data.length; i++) {
				parameterValues = JSON.parse(data[i].hvalues);
				date = moment(data[i].reading_date,'YYYY-MM-DD').format('DD-MM-YYYY');
				for(var key in parameterValues){
					extractedValues = parameterValues[key].split(',');
					time = objSlot[key];
					nodeTime = date+' '+time[0]+' - '+time[1];
					if(objNonSortData[nodeTime]){
						if(1 == Object.keys(objNonSortData[nodeTime]).length){
							timestamp = objNonSortData[nodeTime]['timestamp'];
							objNonSortData[nodeTime] = lodash.clone(nodeObject);
							objNonSortData[nodeTime]['timestamp'] = timestamp;
						}
						objNonSortData[nodeTime][data[i].fnode_id+'_'+data[i].fparameters] = {startReading:parseFloat(extractedValues[0])/parameterDivision[data[i].fparameters],endReading:parseFloat(extractedValues[1])/parameterDivision[data[i].fparameters],difference: parseFloat(extractedValues[2])/parameterDivision[data[i].fparameters],sampling:parseFloat(extractedValues[3]),count:parseFloat(extractedValues[4]),speed:parseFloat(extractedValues[3]),acceleration:parseFloat(extractedValues[4])};
					}
				}	
			}
			
			var previousKey = '';
			var objReadings = {};
			var objPreviousValues = {};
			for(var key in objNonSortData){
				if(1  ==  Object.keys(objNonSortData[key]).length){
					timestamp  =objNonSortData[key]['timestamp'];
					objNonSortData[key] = lodash.cloneDeep(nodeObject);
					objNonSortData[key]['timestamp'] = timestamp;
				}
				
				if(0 == request.body.readingGap){
					objReadings[key] = {};
					objReadings[key] = objNonSortData[key];
					continue;
				}
				for(var node in objNonSortData[key]){
					if(null != objNonSortData[key][node].startReading){
						if('undefined' !== typeof objPreviousValues[node]){
							previousKey = objPreviousValues[node];
							objNonSortData[previousKey][node].difference = (null !== objNonSortData[previousKey][node].difference) ? objNonSortData[previousKey][node].difference + (objNonSortData[key][node].startReading - objNonSortData[previousKey][node].endReading) : (0 + (objNonSortData[key][node].startReading - objNonSortData[previousKey][node].endReading)) ;
							objNonSortData[previousKey][node].endReading = objNonSortData[key][node].startReading;
						}
						objPreviousValues[node] = '';
						objPreviousValues[node] = key;
					}
				}

				if(lastRecordDate == key){
					break;
				}
				
				objReadings[key] = {};
				objReadings[key] = objNonSortData[key];
			}
			objData['data'] = objReadings;
			return cb(null, objData);
		}catch(exception){
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason ="Error: Unable to get data. Please try again!";
			return cb(null,responseObj);
		}
	});
};

exports.getCummulativeWeeklyData = function(request,cb){
	var queryParameters = {};
	queryParameters.nodeId = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateTimeObject = momentTimezone.utc(toDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var lastRecordDate = '';
	if(0 != request.body.readingGap){
		toDateTimeObject.add(1,'weeks');
		if('Sunday' == momentTimezone(toDateTimeObject).format('dddd')){
			lastRecordDate = momentTimezone(toDateTimeObject).startOf('isoWeek').format('DD-MM-YYYY')+ ' - '+ momentTimezone(toDateTimeObject).format('DD-MM-YYYY');
		}else{
			lastRecordDate = momentTimezone(toDateTimeObject).subtract(7,'days').startOf('isoWeek').format('DD-MM-YYYY')+ ' - '+ momentTimezone(toDateTimeObject).startOf('week').format('DD-MM-YYYY');
		}
	}
	queryParameters.fromYear = momentTimezone(fromDateTimeObject).startOf('isoWeek').format('YYYY'); 
	queryParameters.toYear = momentTimezone(toDateTimeObject).startOf('isoWeek').format('YYYY');
	report.findWeeklyReadingsByNode(queryParameters, function(err, data) {
		try{
			if(err) { 
				responseObj = {};
				responseObj.error = true;
				responseObj.reason ="Error: Unable to get data. Please try again!";
				return cb(null,responseObj); 
			}
			var objData = {data:{}};
			if(!data || 0 == data.length) { return cb(null, objData); }
			var objWeeks = generateWeekObjects(queryParameters.fromYear, queryParameters.toYear,fromDateTimeObject,toDateTimeObject);
			var objNonSortData = objWeeks['data'];
			var dataObject,wYear,weekDate,extractedValues,timestamp;
			var nodeObject = {};
			var parameterDivision = {};
			for(var nodeIndex=0;nodeIndex<request.body.nodeId.length;nodeIndex++){
				request.body.parameterId.forEach(function (parameter,index) {
					parameterDivision[parameter] = 1;
					if('9d3d2d7f-0c70-4408-8630-4796bce49a2d' == userTimezoneSettings.companyId && '37' == parameter){
						parameterDivision[parameter] = 1000;
					}
					nodeObject[request.body.nodeId[nodeIndex]+'_'+parameter] = {startReading:null,endReading:null,difference:null,sampling:null,count:null};
				});
			}

			for (var i=0; i<data.length; i++) {
				dataObject = JSON.parse(data[i].wvalues);
				wYear = parseInt(data[i].wdate);
				if(objWeeks['slot'][wYear]){
					for(var key in objWeeks['slot'][wYear]){
						if(dataObject[key]){
							weekDate = objWeeks['slot'][wYear][key];
							extractedValues = dataObject[key].split(',');
							if(1 == Object.keys(objNonSortData[weekDate]).length){
								timestamp = objNonSortData[weekDate]['timestamp'];
								objNonSortData[weekDate] = lodash.clone(nodeObject);
								objNonSortData[weekDate]['timestamp']  =timestamp;
							}
							objNonSortData[weekDate][data[i].wnode_id+'_'+data[i].wparameters] = {startReading:parseFloat(extractedValues[0])/parameterDivision[data[i].wparameters],endReading:parseFloat(extractedValues[1])/parameterDivision[data[i].wparameters],difference: parseFloat(extractedValues[2])/parameterDivision[data[i].wparameters],sampling:parseFloat(extractedValues[3]),count:parseFloat(extractedValues[4])};
						}
					}
				}
			}

			var previousKey = '';
			var objReadings = {};
			var objPreviousValues = {};
			for(var key in objNonSortData){
				if(1  ==  Object.keys(objNonSortData[key]).length){
					timestamp = objNonSortData[key]['timestamp'];
					objNonSortData[key] = lodash.cloneDeep(nodeObject);
					objNonSortData[key]['timestamp'] = timestamp;
				}
				
				if(0 == request.body.readingGap){
					objReadings[key] = {};
					objReadings[key] = objNonSortData[key];
					continue;
				}
				for(var node in objNonSortData[key]){
					if(null != objNonSortData[key][node].startReading){
						if('undefined' !== typeof objPreviousValues[node]){
							previousKey = objPreviousValues[node];
							objNonSortData[previousKey][node].difference = (null !== objNonSortData[previousKey][node].difference) ? objNonSortData[previousKey][node].difference + (objNonSortData[key][node].startReading - objNonSortData[previousKey][node].endReading) : (0 + (objNonSortData[key][node].startReading - objNonSortData[previousKey][node].endReading)) ;
							objNonSortData[previousKey][node].endReading = objNonSortData[key][node].startReading;
						}
						objPreviousValues[node] = '';
						objPreviousValues[node] = key;
					}
				}

				if(lastRecordDate == key){
					break;
				}
				
				objReadings[key] = {};
				objReadings[key] = objNonSortData[key];
			}
			objData['data'] = objReadings;
			return cb(null, objData);
		}catch(exception){
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason ="Error: Unable to get data. Please try again!";
			return cb(null,responseObj);
		}
	
	});
};

exports.getInstantaneousWeeklyData = function(request,cb){

	var queryParameters = {};
	queryParameters.nodeId = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateTimeObject = momentTimezone.utc(toDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var lastRecordDate = '';
	if(0 != request.body.readingGap){
		toDateTimeObject.add(1,'weeks');
		if('Sunday' == momentTimezone(toDateTimeObject).format('dddd')){
			lastRecordDate = momentTimezone(toDateTimeObject).startOf('isoWeek').format('DD-MM-YYYY')+ ' - '+ momentTimezone(toDateTimeObject).format('DD-MM-YYYY');
		}else{
			lastRecordDate = momentTimezone(toDateTimeObject).subtract(7,'days').startOf('isoWeek').format('DD-MM-YYYY')+ ' - '+ momentTimezone(toDateTimeObject).startOf('week').format('DD-MM-YYYY');
		}
	}
	queryParameters.fromYear = momentTimezone(fromDateTimeObject).startOf('isoWeek').format('YYYY'); 
	queryParameters.toYear = momentTimezone(toDateTimeObject).startOf('isoWeek').format('YYYY');
	report.findWeeklyReadingsByNode(queryParameters, function(err, data) {
		try{
			if(err) { 
				responseObj = {};
				responseObj.error = true;
				responseObj.reason ="Error: Unable to get data. Please try again!";
				return cb(null,responseObj); 
			}

			var objData = {data:{}};
			if(!data || 0 == data.length) { return cb(null, objData); }
			var objWeeks = generateWeekObjects(queryParameters.fromYear, queryParameters.toYear,fromDateTimeObject,toDateTimeObject);
			var objNonSortData = objWeeks['data'];
			var dataObject,wYear,weekDate,extractedValues,timestamp;
			var nodeObject = {};
			for(var nodeIndex=0;nodeIndex<request.body.nodeId.length;nodeIndex++){
				request.body.parameterId.forEach(function (parameter,index) {
					nodeObject[request.body.nodeId[nodeIndex]+'_'+parameter] = {min:null,max:null,average:null,sampling:null,count:null,standardDeviation:null};
				});
			}

			for (var i=0; i<data.length; i++) {
				dataObject = JSON.parse(data[i].wvalues);
				wYear = parseInt(data[i].wdate);
				if(objWeeks['slot'][wYear]){
					for(var key in objWeeks['slot'][wYear]){
						if(dataObject[key]){
							weekDate = objWeeks['slot'][wYear][key];
							extractedValues = dataObject[key].split(',');
							if(1 == Object.keys(objNonSortData[weekDate]).length){
								timestamp = objNonSortData[weekDate]['timestamp'];
								objNonSortData[weekDate] = lodash.clone(nodeObject);
								objNonSortData[weekDate]['timestamp']  =timestamp;
							}
							objNonSortData[weekDate][data[i].wnode_id+'_'+data[i].wparameters] = {min:parseFloat(extractedValues[2]),max:parseFloat(extractedValues[3]),average:parseFloat(extractedValues[0]),sampling:parseFloat(extractedValues[4]),count:parseFloat(extractedValues[5]),standardDeviation:parseFloat(extractedValues[1])};
						}
					}
				}
			}

			var objReadings = {};
			for(var key in objNonSortData){
				if(1  ==  Object.keys(objNonSortData[key]).length){
					timestamp  =objNonSortData[key]['timestamp'];
					objNonSortData[key] = lodash.cloneDeep(nodeObject);
					objNonSortData[key]['timestamp'] = timestamp;
				}
				if(lastRecordDate == key){
					break;
				}
				objReadings[key] = {};
				objReadings[key] = objNonSortData[key];
			}
			objData['data'] = objReadings;
			return cb(null, objData);
		}catch(exception){
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason ="Error: Unable to get data. Please try again!";
			return cb(null,responseObj);
		}
	
	});
};

function generateWeekObjects(fromYear,toYear,startDate,endDate){
	var actualFromDate = momentTimezone.utc(startDate,'YYYY-MM-DD HH:mm:ssZ').startOf('isoWeek');
	var actualEndDate = momentTimezone.utc(endDate,'YYYY-MM-DD HH:mm:ssZ').endOf('isoWeek');
	var actualFromDateTimestamp = momentTimezone(actualFromDate).valueOf();
	var actualEndDateTimestamp = momentTimezone(actualEndDate).valueOf();
	//var fromDate = momentTimezone.utc(fromYear+'-01-01 00:00:00+0000','YYYY-MM-DD HH:mm:ssZ').day(1).year(fromYear).isoWeek(1);
	var fromDate = momentTimezone.utc(fromYear+'-01-01 00:00:00+0000','YYYY-MM-DD HH:mm:ssZ').day(1).isoWeek(1);
	var objData = {slot:{},data:{}};
	var startIndex = 1,currentProcessYear,startDateTimeStamp,endDateTimeStamp;
	while(fromYear<=toYear){
		startIndex = 1;
		objData['slot'][fromYear] = {};
		currentProcessYear = fromYear;
		do{
			startDateTimeStamp = fromDate.startOf('isoWeek').valueOf();
			endDateTimeStamp = fromDate.endOf('isoWeek').valueOf();
			weeknumber = momentTimezone(fromDate).isoWeek();
			if((startDateTimeStamp >= actualFromDateTimestamp && endDateTimeStamp <= actualEndDateTimestamp)){
				var dateFrom = fromDate.startOf('isoWeek').format('DD-MM-YYYY');
				var dateTo = fromDate.endOf('isoWeek').format('DD-MM-YYYY');
				objData['slot'][fromYear][startIndex] = dateFrom+' - '+dateTo;
				objData['data'][dateFrom+' - '+dateTo] = {timestamp:momentTimezone.utc(dateTo+' 00:00:00+00:00','DD-MM-YYYY HH:mm:ssZ').valueOf()};
				fromDate = fromDate.add(1,'week');
			}else{
				fromDate = fromDate.add(1,'week');
			}
			startIndex++;
			currentProcessYear  = fromDate.format('YYYY');
		}while(currentProcessYear == fromYear);
		fromYear++;
	}
	return objData;
}

exports.getCummulativeDailyData = function(request,cb){

	var queryParameters = {};
	queryParameters.nodeId = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateTimeObject = momentTimezone.utc(toDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var lastRecordDate = '';
	if(0 != request.body.readingGap){
		toDateTimeObject.add(1,'days');
		lastRecordDate = toDateTimeObject.format('DD-MM-YYYY');
	}
	queryParameters.fromDate = fromDateTimeObject.format('YYYY-MM-DD');
	queryParameters.toDate = toDateTimeObject.format('YYYY-MM-DD');

	report.findDailyReadingsByNode(queryParameters, function(err, data) {
		try{
			if(err) { 
				responseObj = {};
				responseObj.error = true;
				responseObj.reason ="Error: Unable to get data. Please try again!";
				return cb(null,responseObj); 
			}
			var objData = {data:{}};
			if(!data || 0 == data.length) { return cb(null, objData); }
			var objNonSortData = createDailyArray(fromDateTimeObject, toDateTimeObject);
			var nodeObject = {};
			var extractedValues,date,parameterValues,time,nodeTimezoneToUserTimeZone,timestamp;
			var parameterDivision = {};
			for(var nodeIndex=0;nodeIndex<request.body.nodeId.length;nodeIndex++){
				request.body.parameterId.forEach(function (parameter,index) {
					parameterDivision[parameter] = 1;
					if('9d3d2d7f-0c70-4408-8630-4796bce49a2d' == userTimezoneSettings.companyId && '37' == parameter){
						parameterDivision[parameter] = 1000;
					}
					nodeObject[request.body.nodeId[nodeIndex]+'_'+parameter] = {startReading:null,endReading:null,difference:null,speed:null,acceleration:null,sampling:null,count:null};
				});
			}

			for (var i=0; i<data.length; i++) {
				date = moment(data[i].reading_date,'YYYY-MM-DD').format('DD-MM-YYYY');
				extractedValues = (null != data[i].dvalues && '' != data[i].dvalues) ? data[i].dvalues.split(',') : [];
				if(0 < extractedValues.length && objNonSortData[date]){
					if(1 == Object.keys(objNonSortData[date]).length){
						timestamp = objNonSortData[date]['timestamp'];
						objNonSortData[date] = lodash.clone(nodeObject);
						objNonSortData[date]['timestamp'] = timestamp;
					}
					objNonSortData[date][data[i].fnode_id+'_'+data[i].fparameters] = {startReading:parseFloat(extractedValues[0])/parameterDivision[data[i].fparameters],endReading:parseFloat(extractedValues[1])/parameterDivision[data[i].fparameters],difference: parseFloat(extractedValues[2])/parameterDivision[data[i].fparameters],sampling:parseFloat(extractedValues[3]),count:parseFloat(extractedValues[4]),speed:parseFloat(extractedValues[3]),acceleration:parseFloat(extractedValues[4])};	
				}
			}
			
			var previousKey = '';
			var objReadings = {};
			var objPreviousValues = {};
			for(var key in objNonSortData){
				if(1  ==  Object.keys(objNonSortData[key]).length){
					timestamp = objNonSortData[key]['timestamp'];
					objNonSortData[key] = lodash.cloneDeep(nodeObject);
					objNonSortData[key]['timestamp'] = timestamp;
				}
				
				if(0 == request.body.readingGap){
					objReadings[key] = {};
					objReadings[key] = objNonSortData[key];
					continue;
				}
				
				for(var node in objNonSortData[key]){
					if(null != objNonSortData[key][node].startReading){
						if('undefined' !== typeof objPreviousValues[node]){
							previousKey = objPreviousValues[node];
							objNonSortData[previousKey][node].difference = (null !== objNonSortData[previousKey][node].difference) ? objNonSortData[previousKey][node].difference + (objNonSortData[key][node].startReading - objNonSortData[previousKey][node].endReading) : (0 + (objNonSortData[key][node].startReading - objNonSortData[previousKey][node].endReading)) ;
							objNonSortData[previousKey][node].endReading = objNonSortData[key][node].startReading;
						}
						objPreviousValues[node] = '';
						objPreviousValues[node] = key;
					}
				}

				if(lastRecordDate == key){
					break;
				}
				
				objReadings[key] = {};
				objReadings[key] = objNonSortData[key];
			}
			objData['data'] = objReadings;
			return cb(null, objData);
		}catch(exception){
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason ="Error: Unable to get data. Please try again!";
			return cb(null,responseObj);
		}
	});
};

exports.getInstantaneousDailyData = function(request,cb){

	var queryParameters = {};
	queryParameters.nodeId = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateTimeObject = momentTimezone.utc(toDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	queryParameters.fromDate = fromDateTimeObject.format('YYYY-MM-DD');
	queryParameters.toDate = toDateTimeObject.format('YYYY-MM-DD');

	report.findDailyReadingsByNode(queryParameters, function(err, data) {
		try{
			if(err) { 
				responseObj = {};
				responseObj.error = true;
				responseObj.reason ="Error: Unable to get data. Please try again!";
				return cb(null,responseObj); 
			}
			var objData = {data:{}};
			if (!data || 0 == data.length) { return cb(null, objData); }
			var objNonSortData = createDailyArray(fromDateTimeObject, toDateTimeObject);
			var nodeObject = {};
			var extractedValues,date,parameterValues,timestamp;
			for(var nodeIndex=0;nodeIndex<request.body.nodeId.length;nodeIndex++){
				request.body.parameterId.forEach(function (parameter,index) {
					nodeObject[request.body.nodeId[nodeIndex]+'_'+parameter] = {min:null,max:null,average:null,sampling:null,count:null,standardDeviation:null};
				});
			}
			for (var i=0; i<data.length; i++) {
				var date = moment(data[i].reading_date,'YYYY-MM-DD').format('DD-MM-YYYY');
				extractedValues = (null != data[i].dvalues && '' != data[i].dvalues) ? data[i].dvalues.split(',') : [];
				if(0 < extractedValues.length && objNonSortData[date]){
					if(1 == Object.keys(objNonSortData[date]).length){
						timestamp = objNonSortData[date]['timestamp'];
						objNonSortData[date] = lodash.clone(nodeObject);
						objNonSortData[date]['timestamp'] = timestamp;
					}
					objNonSortData[date][data[i].fnode_id+'_'+data[i].fparameters] = {min:parseFloat(extractedValues[2]),max:parseFloat(extractedValues[3]),average: parseFloat(extractedValues[0]),sampling:parseFloat(extractedValues[4]),count:parseFloat(extractedValues[5]),standardDeviation:parseFloat(extractedValues[1])};
				}
			}

			for(var key in objNonSortData){
				if(1  ==  Object.keys(objNonSortData[key]).length){
					timestamp  =objNonSortData[key]['timestamp'];
					objNonSortData[key] = lodash.cloneDeep(nodeObject);
					objNonSortData[key]['timestamp'] = timestamp;
				}
			}
			objData['data'] = objNonSortData;
			return cb(null, objData);
		}catch(exception){
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason ="Error: Unable to get data. Please try again!";
			return cb(null,responseObj);
		}
	});
};

exports.getCummulativeMonthlyData = function(request,cb){
	var queryParameters = {};
	queryParameters.nodeId = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateTimeObject = momentTimezone.utc(toDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var lastRecordDate = '';
	if(0 != request.body.readingGap){
		toDateTimeObject.add(1,'months');
		lastRecordDate = toDateTimeObject.format('MMM YYYY');
	}
	var fromMonth = fromDateTimeObject.format('YYYY-MM');
	var toMonth = toDateTimeObject.format('YYYY-MM');
	queryParameters.fromDate = 2017;
	queryParameters.toDate = 2017;
	report.findMonthlyReadingsByNode(queryParameters, function(err, data) {
		try{
			if(err) { 
				responseObj = {};
				responseObj.error = true;
				responseObj.reason ="Error: Unable to get data. Please try again!";
				return cb(null,responseObj); 
			}
			var objData = {data:{}};
			if(!data || 0 == data.length) { return cb(null, objData); }
			
			var arrMonthsYear = createMonthsYear();
			var objNonSortData = createMonths(fromMonth, toMonth);
			var dataCount = data.length-1;
			var currentMonth = moment(fromMonth+'-01').format('MMM YYYY'); 
			var monthIndex = arrMonthsYear.indexOf(currentMonth);
			monthIndex = (-1 == monthIndex) ? 1 : monthIndex;
			var nodeObject = {};
			var extractedValues,timestamp;
			var parameterDivision = {};
			for(var nodeIndex=0;nodeIndex<request.body.nodeId.length;nodeIndex++){
				request.body.parameterId.forEach(function (parameter,index) {
					parameterDivision[parameter] = 1;
					if('9d3d2d7f-0c70-4408-8630-4796bce49a2d' == userTimezoneSettings.companyId && '37' == parameter){
						parameterDivision[parameter] = 1000;
					}
					nodeObject[request.body.nodeId[nodeIndex]+'_'+parameter] = {startReading:null,endReading:null,difference:null,sampling:null,count:null};
				});
			}
			for (var i=0; i<data.length; i++) {
				var dataObject = JSON.parse(data[i].mvalues);
				var month = fromMonth;
				startingIndex = monthIndex;
				for(;startingIndex <= 60;startingIndex++){
					if(toMonth < month){
						break;
					}
					if(dataObject[startingIndex]){
						extractedValues = dataObject[startingIndex].split(',');
						if(0 == Object.keys(objNonSortData[arrMonthsYear[startingIndex]]).length){
							timestamp = momentTimezone.utc(arrMonthsYear[startingIndex]+'+0000','MMM YYYYZ').valueOf();
							objNonSortData[arrMonthsYear[startingIndex]] = lodash.clone(nodeObject);
							objNonSortData[arrMonthsYear[startingIndex]]['timestamp'] = timestamp;
						}
						objNonSortData[arrMonthsYear[startingIndex]][data[i].mnode_id+'_'+data[i].mparameters] = {startReading:parseFloat(extractedValues[0])/parameterDivision[data[i].mparameters],endReading:parseFloat(extractedValues[1])/parameterDivision[data[i].mparameters],difference: parseFloat(extractedValues[2])/parameterDivision[data[i].mparameters],sampling:parseFloat(extractedValues[3]),count:parseFloat(extractedValues[4])};
					}
					var month = moment(month+'-01').add(1,'M').format('YYYY-MM'); 
				}
			}

			var previousKey = '';
			var objReadings = {};
			var objPreviousValues = {};
			for(var key in objNonSortData){
				if(0  ==  Object.keys(objNonSortData[key]).length){
					objNonSortData[key] = lodash.cloneDeep(nodeObject);
					timestamp = momentTimezone.utc(key+'+0000','MMM YYYYZ').valueOf();
					objNonSortData[key]['timestamp'] = timestamp;
				}
				
				if(0 == request.body.readingGap){
					objReadings[key] = {};
					objReadings[key] = objNonSortData[key];
					continue;
				}
				for(var node in objNonSortData[key]){
					if(null != objNonSortData[key][node].startReading){
						if('undefined' !== typeof objPreviousValues[node]){
							previousKey = objPreviousValues[node];
							objNonSortData[previousKey][node].difference = (null !== objNonSortData[previousKey][node].difference) ? objNonSortData[previousKey][node].difference + (objNonSortData[key][node].startReading - objNonSortData[previousKey][node].endReading) : (0 + (objNonSortData[key][node].startReading - objNonSortData[previousKey][node].endReading)) ;
							objNonSortData[previousKey][node].endReading = objNonSortData[key][node].startReading;
						}
						objPreviousValues[node] = '';
						objPreviousValues[node] = key;
					}
				}

				if(lastRecordDate == key){
					break;
				}
				
				objReadings[key] = {};
				objReadings[key] = objNonSortData[key];
			}
			objData['data'] = objReadings;
			return cb(null, objData);
		}catch(exception){
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason ="Error: Unable to get data. Please try again!";
			return cb(null,responseObj);
		}
	});
};

exports.getInstantaneousMonthlyData = function(request,cb){

	var queryParameters = {};
	queryParameters.nodeId = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateTimeObject = momentTimezone.utc(toDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var fromMonth = fromDateTimeObject.format('YYYY-MM');
	var toMonth = toDateTimeObject.format('YYYY-MM');
	queryParameters.fromDate = 2017;
	queryParameters.toDate = 2017;

	report.findMonthlyReadingsByNode(queryParameters, function(err, data) {
		try{
			if(err) { 
				responseObj = {};
				responseObj.error = true;
				responseObj.reason ="Error: Unable to get data. Please try again!";
				return cb(null,responseObj); 
			}
			var objData = {data:{}};
			if(!data || 0 == data.length) { return cb(null, objData); }
			
			var arrMonthsYear = createMonthsYear();
			var objNonSortData = createMonths(fromMonth, toMonth);
			var currentMonth = moment(fromMonth+'-01').format('MMM YYYY'); 
			var monthIndex = arrMonthsYear.indexOf(currentMonth);
			monthIndex = (-1 == monthIndex) ? 1 : monthIndex;
			var extractedValues,timestamp;
			var nodeObject = {};
			for(var nodeIndex=0;nodeIndex<request.body.nodeId.length;nodeIndex++){
				request.body.parameterId.forEach(function (parameter,index) {
					nodeObject[request.body.nodeId[nodeIndex]+'_'+parameter] = {min:null,max:null,average:null,sampling:null,count:null,standardDeviation:null};
				});
			}
			var month;
			for (var i=0; i<data.length; i++) {
				var dataObject = JSON.parse(data[i].mvalues);
				month = fromMonth;
				startingIndex = monthIndex;
				for(;startingIndex <= 60;startingIndex++){
					if(toMonth < month){
						break;
					}
					if(dataObject[startingIndex]){
						extractedValues = dataObject[startingIndex].split(',');
						if(0 == Object.keys(objNonSortData[arrMonthsYear[startingIndex]]).length){
							timestamp = momentTimezone.utc(arrMonthsYear[startingIndex]+'+0000','MMM YYYYZ').valueOf();
							objNonSortData[arrMonthsYear[startingIndex]] = lodash.clone(nodeObject);
							objNonSortData[arrMonthsYear[startingIndex]]['timestamp'] = timestamp;
						}
						objNonSortData[arrMonthsYear[startingIndex]][data[i].mnode_id+'_'+data[i].mparameters] = {min:parseFloat(extractedValues[2]),max:parseFloat(extractedValues[3]),average:parseFloat(extractedValues[0]),sampling:parseFloat(extractedValues[4]),count:parseFloat(extractedValues[5]),standardDeviation:parseFloat(extractedValues[1])};
					}
					month = moment(month+'-01').add(1,'M').format('YYYY-MM'); 
				}
			}

			for(var key in objNonSortData){
				if(0  ==  Object.keys(objNonSortData[key]).length){
					objNonSortData[key] = lodash.cloneDeep(nodeObject);
					timestamp = momentTimezone.utc(key+'+0000','MMM YYYYZ').valueOf();
					objNonSortData[key]['timestamp'] = timestamp;
				}
			}
			objData['data'] = objNonSortData;
			return cb(null, objData);
		}catch(exception){
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason ="Error: Unable to get data. Please try again!";
			return cb(null,responseObj);
		}
	});
};

exports.getInstantaneousYearlyData = function(request,cb){

	var queryParameters = {};
	queryParameters.nodeId = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateTimeObject = momentTimezone.utc(toDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var fromYear = fromDateTimeObject.format('YYYY');
	var toYear = toDateTimeObject.format('YYYY');
	queryParameters.fromDate = 2017;
	queryParameters.toDate = (2017 > toYear) ? 2017 : parseInt(toYear);

	report.findYearlyReadingsByNode(queryParameters, function(err, data) {	
		try{
			if(err) { 
				responseObj = {};
				responseObj.error = true;
				responseObj.reason ="Error: Unable to get data. Please try again!";
				return cb(null,responseObj); 
			}
			var objData = {data:{}};
			if(!data || 0 == data.length) { return cb(null, objData); }
			var arrYears = createYear();
			var objNonSortData = createYearlyArray(fromYear, toYear);
			var extractedValues,timestamp;
			var nodeObject = {};
			for(var nodeIndex=0;nodeIndex<request.body.nodeId.length;nodeIndex++){
				request.body.parameterId.forEach(function (parameter,index) {
					nodeObject[request.body.nodeId[nodeIndex]+'_'+parameter] = {min:null,max:null,average:null,sampling:null,count:null,standardDeviation:null};
				});
			}
			for (var i=0; i<data.length; i++) {
				var dataObject = JSON.parse(data[i].yvalues);
				var ydate = moment(data[i].ydate,'YYYY-MM-DD').format('YYYY-MM-DD');
				var year = fromYear;
				var startingIndex = arrYears.indexOf(fromYear);
				startingIndex = (-1 === startingIndex) ? 1 : startingIndex;
				for(;startingIndex <= 10;startingIndex++){
					if(toYear < year){
						break;
					}
					if(dataObject[startingIndex]){
						extractedValues = dataObject[startingIndex].split(',');
						if(0 == Object.keys(objNonSortData[arrYears[startingIndex]]).length){
							objNonSortData[arrYears[startingIndex]] = lodash.clone(nodeObject);
							timestamp = momentTimezone.utc(arrYears[startingIndex]+'+0000','YYYYZ').valueOf();
							objNonSortData[arrYears[startingIndex]]['timestamp'] = timestamp;
						}
						objNonSortData[arrYears[startingIndex]][data[i].ynode_id+'_'+data[i].yparameters] = {min:parseFloat(extractedValues[2]),max:parseFloat(extractedValues[3]),average:parseFloat(extractedValues[0]),sampling:parseFloat(extractedValues[4]),count:parseFloat(extractedValues[5]),standardDeviation:parseFloat(extractedValues[1])};
					}
					year++;
				}
			}

			for(var key in objNonSortData){
				if(0  ==  Object.keys(objNonSortData[key]).length){
					objNonSortData[key] = lodash.cloneDeep(nodeObject);
					timestamp = momentTimezone.utc(key+'+0000','YYYYZ').valueOf();
					objNonSortData[key]['timestamp'] = timestamp;
				}
			}
			objData['data'] = objNonSortData;
			return cb(null, objData);
		}catch(exception){
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason ="Error: Unable to get data. Please try again!";
			return cb(null,responseObj);
		}
	});
};

exports.getCummulativeYearlyData = function(request,cb){

	var queryParameters = {};
	queryParameters.nodeId = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateTimeObject = momentTimezone.utc(toDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	if(0 != request.body.readingGap){
		toDateTimeObject.add(1,'years');
		lastRecordDate = toDateTimeObject.format('YYYY');
	}
	var fromYear = fromDateTimeObject.format('YYYY');
	var toYear = toDateTimeObject.format('YYYY');
	queryParameters.fromDate = 2017;
	queryParameters.toDate = (2017 > toYear) ? 2017 : parseInt(toYear);
	report.findYearlyReadingsByNode(queryParameters, function(err, data) {
		try{
			if(err) { 
				responseObj = {};
				responseObj.error = true;
				responseObj.reason ="Error: Unable to get data. Please try again!";
				return cb(null,responseObj); 
			}
			var objData = {data:{}};
			if(!data || 0 == data.length) { return cb(null, objData); }
			
			var arrYears = createYear();
			var objNonSortData = createYearlyArray(fromYear, toYear);
			var dataCount = data.length-1;
			var extractedValues,timestamp;
			var nodeObject = {};
			var parameterDivision = {};
			for(var nodeIndex=0;nodeIndex<request.body.nodeId.length;nodeIndex++){
				request.body.parameterId.forEach(function (parameter,index) {
					parameterDivision[parameter] = 1;
					if('9d3d2d7f-0c70-4408-8630-4796bce49a2d' == userTimezoneSettings.companyId && '37' == parameter){
						parameterDivision[parameter] = 1000;
					}
					nodeObject[request.body.nodeId[nodeIndex]+'_'+parameter] = {startReading:null,endReading:null,difference:null,sampling:null,count:null};
				});
			}
			for (var i=0; i<data.length; i++) {
				var dataObject = JSON.parse(data[i].yvalues);
				var ydate = moment(data[i].ydate,'YYYY-MM-DD').format('YYYY-MM-DD');
				var year = fromYear;
				var startingIndex = arrYears.indexOf(fromYear);
				startingIndex = (-1 === startingIndex) ? 1 : startingIndex;
				for(;startingIndex <= 10;startingIndex++){
					if(toYear < year){
						break;
					}
					if(dataObject[startingIndex]){
						var extractedValues = dataObject[startingIndex].split(',');
						if(0 == Object.keys(objNonSortData[arrYears[startingIndex]]).length){
							objNonSortData[arrYears[startingIndex]] = lodash.clone(nodeObject);
							timestamp = momentTimezone.utc(arrYears[startingIndex]+'+0000','YYYYZ').valueOf();
							objNonSortData[arrYears[startingIndex]]['timestamp'] = timestamp;
						}
						objNonSortData[arrYears[startingIndex]][data[i].ynode_id+'_'+data[i].yparameters] = {startReading:parseFloat(extractedValues[0])/parameterDivision[data[i].yparameters],endReading:parseFloat(extractedValues[1])/parameterDivision[data[i].yparameters],difference: parseFloat(extractedValues[2])/parameterDivision[data[i].yparameters],sampling:parseFloat(extractedValues[3]),count:parseFloat(extractedValues[4])};
					}
					year++;
				}
			}

			var previousKey = '';
			var objReadings = {};
			var objPreviousValues = {};
			for(var key in objNonSortData){
				if(0  ==  Object.keys(objNonSortData[key]).length){
					objNonSortData[key] = lodash.cloneDeep(nodeObject);
					timestamp = momentTimezone.utc(key+'+0000','YYYYZ').valueOf();
					objNonSortData[key]['timestamp'] = timestamp;
				}
				
				if(0 == request.body.readingGap){
					objReadings[key] = {};
					objReadings[key] = objNonSortData[key];
					continue;
				}
				for(var node in objNonSortData[key]){
					if(null != objNonSortData[key][node].startReading){
						if('undefined' !== typeof objPreviousValues[node]){
							previousKey = objPreviousValues[node];
							objNonSortData[previousKey][node].difference = (null !== objNonSortData[previousKey][node].difference) ? objNonSortData[previousKey][node].difference + (objNonSortData[key][node].startReading - objNonSortData[previousKey][node].endReading) : (0 + (objNonSortData[key][node].startReading - objNonSortData[previousKey][node].endReading)) ;
							objNonSortData[previousKey][node].endReading = objNonSortData[key][node].startReading;
						}
						objPreviousValues[node] = '';
						objPreviousValues[node] = key;
					}
				}

				if(lastRecordDate == key){
					break;
				}
				
				objReadings[key] = {};
				objReadings[key] = objNonSortData[key];
			}
			objData['data'] = objReadings;
			return cb(null, objData);
		}catch(exception){
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason ="Error: Unable to get data. Please try again!";
			return cb(null,responseObj);
		}
	});
};

exports.getRawData = function(request,cb){
	var queryParameters = {};
	queryParameters.nodeName = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateTimeObject = momentTimezone.utc(toDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var dateTimeSlots = nodeTimeZoneSlotCalculation(fromDateTimeObject,toDateTimeObject);
	queryParameters.fromDate = dateTimeSlots.fromDateTime;
	queryParameters.toDate =dateTimeSlots.toDateTime;
	queryParameters.fromSlots =dateTimeSlots.fromSlot;
	queryParameters.toSlots =dateTimeSlots.toSlot;
	var companyId = request.session.passport.user.company_id;
	report.findNodeTimeZone(companyId,queryParameters.nodeName,function(err,nodeResult){
		if(err) { 
			responseObj = {};
			responseObj.error = true;
			responseObj.reason ="Error: Unable to get data. Please try again!";
			return cb(null,responseObj); 
		}

		if(0 === Object.keys(nodeResult).length && Object.keys(nodeResult).length !== queryParameters.nodeName.length) { 
			responseObj = {};
			responseObj.error = true;
			responseObj.reason ="Error: Unable to get data. Please assign timezone to node.";
			return cb(null,responseObj); 
		}
		report.findRawReadingsByNode(queryParameters, function(err, data) {
			try{
				if(err) { 
					responseObj = {};
					responseObj.error = true;
					responseObj.reason ="Error: Unable to get data. Please try again!";
					return cb(null,responseObj); 
				}
				var objData = {data:{}};
				if(!data || 0 == data.length) { return cb(null, objData); }
				data = data.sort(function(a,b){
					if(a['ctime_stamp'] > b['ctime_stamp']){ return -1; }
					else if(a['ctime_stamp'] < b['ctime_stamp']){ return 1; }
					else{ return 0;}
				});
				var startIndex = data.length-1;
				var timeStamp,nodeId,arrNodeData;
				var readings = {};
				var nodeObject = {};
				var parameterDivision = {};
				for(var nodeIndex=0;nodeIndex<request.body.nodeId.length;nodeIndex++){
					request.body.parameterId.forEach(function (parameter,index) {
						parameterDivision[parameter] = 1;
						if('9d3d2d7f-0c70-4408-8630-4796bce49a2d' == userTimezoneSettings.companyId && '37' == parameter){
							parameterDivision[parameter] = 1000;
						}
						nodeObject[request.body.nodeId[nodeIndex]+'_'+parameter] = null;
					});
				}
				for (var i=startIndex; i>=0; i--) {
					arrNodeData = JSON.parse(data[i].parameters_values);
					var readingDateTime  =momentTimezone.utc(data[i].ctime_stamp).tz(nodeResult[data[i].node_id].timezone);
					timeStamp = readingDateTime.format('DD-MM-YYYY HH:mm:ss');
					if('undefined' == typeof readings[timeStamp] ){
						readings[timeStamp] = lodash.clone(nodeObject);
						readings[timeStamp]['timestamp'] = momentTimezone.utc(timeStamp+'+0000','DD-MM-YYYY HH:mm:ssZ').valueOf();
					}
					nodeId = data[i].node_id;
					request.body.parameterId.forEach(function (parameter,index) {
						readings[timeStamp][nodeId+'_'+parameter] = (arrNodeData[parameter]) ? parseFloat(arrNodeData[parameter])/parameterDivision[parameter] : null;
					});
				}
				objData['data'] = readings;
				return cb(null, objData);
			}catch(exception){
				console.log('three',exception)
				var responseObj = {};
				responseObj.error = true;
				responseObj.reason ="Error: Unable to get data. Please try again!";
				return cb(null,responseObj);
			}
		});
	});
};

exports.getProcessedRawData = function(request,cb){

	var queryParameters = {};
	queryParameters.nodeName = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateObject = momentTimezone.utc(fromDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateObject = momentTimezone.utc(toDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var dateTimeSlots = nodeTimeZoneSlotCalculation(fromDateObject,toDateObject);
	queryParameters.fromDate = dateTimeSlots.fromDateTime;
	queryParameters.toDate =dateTimeSlots.toDateTime;
	queryParameters.fromSlots =dateTimeSlots.fromSlot;
	queryParameters.toSlots =dateTimeSlots.toSlot;
	var readingDateTime;
	var timestamp;
	switch(request.body.interval){
		case 'fifteen' : readingDateTime = fromDateObject.format('DD-MM-YYYY HH:mm')+' - '+toDateObject.format('HH:mm');
						timestamp = parseInt(momentTimezone.utc(fromDateObject.format('YYYY-MM-DD')+' '+toDateObject.format('HH:mm')+':00+0000','YYYY-MM-DD HH:mm:ssZ').format('x'));
						break;
		case 'hourly' : readingDateTime = fromDateObject.format('DD-MM-YYYY HH:mm')+' - '+toDateObject.format('HH:mm');
						timestamp = parseInt(momentTimezone.utc(fromDateObject.format('YYYY-MM-DD')+' '+toDateObject.format('HH:mm')+':00+0000','YYYY-MM-DD HH:mm:ssZ').format('x'));
						break;
		case 'daily'  : readingDateTime = fromDateObject.format('DD-MM-YYYY');
						timestamp = parseInt(momentTimezone.utc(fromDateObject.format('YYYY-MM-DD')+' 00:00:00+0000','YYYY-MM-DD HH:mm:ssZ').format('x'));
						break;
		case 'weekly' : readingDateTime = fromDateObject.format('DD-MM-YYYY') + ' - '+toDateObject.format('DD-MM-YYYY');
						timestamp = parseInt(momentTimezone.utc(toDateObject.format('YYYY-MM-DD')+' 00:00:00+0000','YYYY-MM-DD HH:mm:ssZ').format('x'));
						break;
		case 'monthly' : readingDateTime = fromDateObject.format('MMM-YYYY');
						timestamp = parseInt(momentTimezone.utc(fromDateObject.format('YYYY-MM')+'-01 00:00:00+0000','YYYY-MM-DD HH:mm:ssZ').format('x'));
						break;
		case 'yearly' : readingDateTime = fromDateObject.format('YYYY');
						timestamp = parseInt(momentTimezone.utc(fromDateObject.format('YYYY')+'-01-01 00:00:00+0000','YYYY-MM-DD HH:mm:ssZ').format('x'));
						break;
		default 	  : readingDateTime = fromDateObject.format('DD-MM-YYYY HH:mm') + ' - '+toDateObject.format('DD-MM-YYYY HH:mm');
						timestamp = parseInt(momentTimezone.utc(toDateObject.format('YYYY-MM-DD HH:mm')+':00+0000','YYYY-MM-DD HH:mm:ssZ').format('x'));
	}

	report.findRawReadingsByNode(queryParameters, function(err, data) {
		try{
			if(err) { 
				responseObj = {};
				responseObj.error = true;
				responseObj.reason ="Error: Unable to get data. Please try again!";
				return cb(null,responseObj); 
			}
			var arrData = {data:{}};
			if(!data || 0 == data.length) { return cb(null, arrData); }
			var startIndex = data.length-1;
			var timeStamp,nodeId,arrNodeData;
			var readings = {};
			var arr = {};
			if(1 === request.body.isinstantaneous){
				for(var nodeIndex=0;nodeIndex<request.body.nodeId.length;nodeIndex++){
					request.body.parameterId.forEach(function (parameter,index) {
						arr[request.body.nodeId[nodeIndex]+'_'+parameter] = {min:null,max:null,average:null,count:0,addition:null};
					});
				}
				readings = lodash.clone(arr);
				for (var i=startIndex; i>=0; i--) {
					arrNodeData = JSON.parse(data[i].parameters_values);
					nodeId = data[i].node_id;
					request.body.parameterId.forEach(function (parameter,index) {
						if(arrNodeData[parameter]){
							var dbReading = parseFloat(arrNodeData[parameter]);
							var minValue =(readings[nodeId+'_'+parameter]['min']) ? parseFloat(readings[nodeId+'_'+parameter]['min']) : dbReading;
							var maxValue =(readings[nodeId+'_'+parameter]['max']) ? parseFloat(readings[nodeId+'_'+parameter]['max']) : dbReading;
							readings[nodeId+'_'+parameter]['min'] = (dbReading > minValue) ? minValue : dbReading;
							readings[nodeId+'_'+parameter]['max'] = (dbReading < maxValue) ? maxValue : dbReading;
							readings[nodeId+'_'+parameter]['addition'] = (readings[nodeId+'_'+parameter]['addition']) ? parseFloat(dbReading + readings[nodeId+'_'+parameter]['addition']) : dbReading;
						
						}
						readings[nodeId+'_'+parameter]['count']++;
					});
				}
				for(var key in readings){
					readings[key]['average'] = (readings[key]['count'] && readings[key]['addition']) ? parseFloat((readings[key]['addition']) / readings[key]['count']) : null;
				}
				arrData['data'][readingDateTime] = readings;
				arrData['data'][readingDateTime]['timestamp'] = timestamp;
				return cb(null, arrData);
			}else{
				var parameterDivision = {};
				for(var nodeIndex=0;nodeIndex<request.body.nodeId.length;nodeIndex++){
					request.body.parameterId.forEach(function (parameter,index) {
						parameterDivision[parameter] = 1;
						if('9d3d2d7f-0c70-4408-8630-4796bce49a2d' == userTimezoneSettings.companyId && '37' == parameter){
							parameterDivision[parameter] = 1000;
						}
						arr[request.body.nodeId[nodeIndex]+'_'+parameter] = {startReading:null,endReading:null,difference:null,count:0};
					});
				}
				readings = lodash.clone(arr);
				for (var i=startIndex; i>=0; i--) {
					arrNodeData = JSON.parse(data[i].parameters_values);
					nodeId = data[i].node_id;
					request.body.parameterId.forEach(function (parameter,index) {
						var dbReading = (arrNodeData[parameter]) ? parseFloat(arrNodeData[parameter])/parameterDivision[parameter] : null;
						if(0 === readings[nodeId+'_'+parameter]['count']){
							readings[nodeId+'_'+parameter]['startReading'] = dbReading;
						}
						readings[nodeId+'_'+parameter]['count']++;
						readings[nodeId+'_'+parameter]['endReading'] = dbReading;
					});
				}

				for(var key in readings){
					readings[key]['difference'] = parseFloat(readings[key]['endReading'] - readings[key]['startReading']);
				}
				arrData['data'][readingDateTime] = readings;
				arrData['data'][readingDateTime]['timestamp'] = timestamp;
				return cb(null, arrData);
			}
			
		}catch(exception){
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason ="Error: Unable to get data. Please try again!";
			return cb(null,responseObj);
		}
	});
};

convertToUnit = function(data){
	var parameterValue = math.unit('934533333.8945345kilogram');
	return format(parameterValue);
};

function format (value) {
  var precision = 4;
  return math.format(value,{notation:"auto",  precision : 5, scientific: { lower: 1e-50,  upper: 1e+50 }});
}

function createDailyArray(fromDate, toDate){
	var objData = {};
	while(fromDate <= toDate){
		objData[fromDate.format('DD-MM-YYYY')] = {timestamp: momentTimezone.utc(fromDate.format('YYYY-MM-DD'),'YYYY-MM-DD').valueOf()};
		fromDate.add(1, 'days');
	}
	return objData;
}


function createTimeAsPerDataPoints(addValue,totalSlot){
	toTime = '00:00';
	objSlot = {};
	for(i=1;i<totalSlot;i++){
		var dateTime = new Date("2015-06-17 "+toTime);
		toTime = moment("2015-06-17 "+toTime).format("HH:mm");
		fromTime = new Date("2015-06-17 "+toTime);
		fromTime.setMinutes(dateTime.getMinutes() + addValue );
		objSlot[i] = [];
		objSlot[i] = [toTime,moment(fromTime).format("HH:mm")];
		toTime = moment(fromTime).format("HH:mm");
	}
	objSlot[totalSlot] = [moment(fromTime).format("HH:mm"),'23:59'];
	return objSlot;
}

function createMonthsYear(){

	var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	arrMonthsYear = [];
	var startYear = 2017;
	var month = 0;
	for(var i=1;i<=60;i++){
		arrMonthsYear[i] = monthNames[month]+' '+startYear;
		if(11 <= month){
			month = 0;
			startYear = startYear + 1;
		}else{
			month++;
		}
		
	}
	return arrMonthsYear;
}

function createMonths(fromMonth,toMonth){
	var arrData = {};
	fromMonth = moment(fromMonth,"YYYY-MM").format("YYYY-MM");
	toMonth = moment(toMonth,"YYYY-MM").format("YYYY-MM");
	while(fromMonth <= toMonth){
		currentMonth = moment(fromMonth+'-01').format('DD-MM-YYYY');
		fromMonth = moment(fromMonth).format('MMM YYYY');
		arrData[fromMonth] = {};
		fromMonth = moment(currentMonth,'DD-MM-YYYY').add(1, 'M').format('YYYY-MM');
	}
	return arrData;
}

function createYearlyArray(fromYear,toYear){
	var arrData = {};
	for(i = fromYear;i <= toYear;i++){
		arrData[i] = {};
	}
	return arrData;
}

function createYear(){
	arrYears = ['NoYear'];
	var startYear = 2017;
	for(var i=1;i<=10;i++){
		arrYears[i] = startYear++;
	}
	return arrYears.map(String);
}

function createIntervalDataArray(fromDateTime,toDateTime,userTimezone,intervalInMinutes){
	var objData = {};
	var objTime = {};
	if(15 == intervalInMinutes){
    	objTime = {"00:15":"00:15","00:30":"00:30","00:45":"00:45","01:00":"01:00","01:15":"01:15","01:30":"01:30","01:45":"01:45","02:00":"02:00","02:15":"02:15","02:30":"02:30","02:45":"02:45","03:00":"03:00","03:15":"03:15","03:30":"03:30","03:45":"03:45","04:00":"04:00","04:15":"04:15","04:30":"04:30","04:45":"04:45","05:00":"05:00","05:15":"05:15","05:30":"05:30","05:45":"05:45","06:00":"06:00","06:15":"06:15","06:30":"06:30","06:45":"06:45","07:00":"07:00","07:15":"07:15","07:30":"07:30","07:45":"07:45","08:00":"08:00","08:15":"08:15","08:30":"08:30","08:45":"08:45","09:00":"09:00","09:15":"09:15","09:30":"09:30","09:45":"09:45","10:00":"10:00","10:15":"10:15","10:30":"10:30","10:45":"10:45","11:00":"11:00","11:15":"11:15","11:30":"11:30","11:45":"11:45","12:00":"12:00","12:15":"12:15","12:30":"12:30","12:45":"12:45","13:00":"13:00","13:15":"13:15","13:30":"13:30","13:45":"13:45","14:00":"14:00","14:15":"14:15","14:30":"14:30","14:45":"14:45","15:00":"15:00","15:15":"15:15","15:30":"15:30","15:45":"15:45","16:00":"16:00","16:15":"16:15","16:30":"16:30","16:45":"16:45","17:00":"17:00","17:15":"17:15","17:30":"17:30","17:45":"17:45","18:00":"18:00","18:15":"18:15","18:30":"18:30","18:45":"18:45","19:00":"19:00","19:15":"19:15","19:30":"19:30","19:45":"19:45","20:00":"20:00","20:15":"20:15","20:30":"20:30","20:45":"20:45","21:00":"21:00","21:15":"21:15","21:30":"21:30","21:45":"21:45","22:00":"22:00","22:15":"22:15","22:30":"22:30","22:45":"22:45","23:00":"23:00","23:15":"23:15","23:30":"23:30","23:45":"23:45","00:00":"23:59"};
	}else if(60 == intervalInMinutes){
		objTime = {"01:00":"01:00","02:00":"02:00","03:00":"03:00","04:00":"04:00","05:00":"05:00","06:00":"06:00","07:00":"07:00","08:00":"08:00","09:00":"09:00","10:00":"10:00","11:00":"11:00","12:00":"12:00","13:00":"13:00","14:00":"14:00","15:00":"15:00","16:00":"16:00","17:00":"17:00","18:00":"18:00","19:00":"19:00","20:00":"20:00","21:00":"21:00","22:00":"22:00","23:00":"23:00","00:00":"23:59"};
    }
	var currentToDateTime = momentTimezone.utc(momentTimezone.tz(userTimezone).format('YYYY-MM-DD HH:mm:ss')+'+0000','YYYY-MM-DD HH:mm:ssZ');
	currentToDateTime = (toDateTime > currentToDateTime) ? currentToDateTime.subtract(intervalInMinutes, 'minutes') :  toDateTime;
	while(fromDateTime < currentToDateTime){
		var endTime = momentTimezone(fromDateTime).add(intervalInMinutes, 'minutes').format('HH:mm');
		var dateString = fromDateTime.format('HH:mm')+' - '+objTime[endTime];
		objData[fromDateTime.format('DD-MM-YYYY')+' '+dateString] = {timestamp:momentTimezone.utc(fromDateTime.format('YYYY-MM-DD')+' '+objTime[endTime]+':00+0000','YYYY-MM-DD HH:mm:ssZ').valueOf()};
		fromDateTime.add(intervalInMinutes, 'minutes');
	}
	return objData;
}

pad = function(n){
	return n<10 ? '0'+n : n
}

nodeTimeZoneSlotCalculation = function(fromDateTime,toDateTime){
  var startingTime = moment('2017-01-01 00:00:00','YYYY-MM-DD HH:mm:ss').valueOf();
  var fromSlot = Math.floor((((moment(fromDateTime.format('YYYY-MM-DD HH:mm:ss')).valueOf() - startingTime)/1000)/60)/15);
  var toSlot = Math.floor((((moment(toDateTime.format('YYYY-MM-DD HH:mm:ss')).valueOf() - startingTime)/1000)/60)/15);
  return {'fromDateTime':fromDateTime,'fromSlot':fromSlot,'toDateTime':toDateTime,'toSlot':toSlot};
}

getCurrentUserTimezone = function(request){
	if(request.session && true == request.session.passport.user.timezone_setting && '' != request.session.passport.user.timezone && '' != request.session.passport.user.timezone_offset){
		return {'timezone':request.session.passport.user.timezone,'timezoneOffset': request.session.passport.user.timezone_offset,'companyId':request.session.passport.user.company_id};	
	}else if('undefined' != typeof request.fromDifferentApi && true == request.body.timezone_setting && '' != request.body.timezone && '' != request.body.timezone_offset){
		return {'timezone':request.body.timezone,'timezoneOffset': request.body.timezone_offset,'companyId':request.body.company_id};	
	}
	return {'timezone':'Africa/Freetown','timezoneOffset': '+0000','companyId':''};
}

exports.getNodeFifteenMinDailyData = function(request,cb){
	var queryParameters = {};
	queryParameters.nodeId = request.body.nodeId;
	queryParameters.parameters = request.body.parameterId.map(String);
	var userTimezoneSettings = getCurrentUserTimezone(request);
	var fromDateTime = request.body.fromDate.split('+');//Split timezone and datetime
	var toDateTime = request.body.toDate.split('+');//Split timezone and datetime
	var fromDateTimeObject = momentTimezone.utc(fromDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	var toDateTimeObject = momentTimezone.utc(toDateTime[0]+'+0000','YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just consider datetime as UTC datetime
	queryParameters.fromDate = fromDateTimeObject.format('YYYY-MM-DD');
	queryParameters.toDate = toDateTimeObject.format('YYYY-MM-DD');
	report.findFifteenMinDailyReadingsByNode(queryParameters, function(err, data) {
		try{
			if(err || !data || 'undefined' == typeof data) { 
				responseObj = {};
				responseObj.error = true;
				responseObj.reason ="Error: Unable to get data. Please try again!";
				return cb(null,responseObj); 
			}
			return cb(null, data);
		}catch(exception){
			var responseObj = {};
			responseObj.error = true;
			responseObj.reason ="Error: Unable to get data. Please try again!";
			return cb(null,responseObj);
		}
	});
};