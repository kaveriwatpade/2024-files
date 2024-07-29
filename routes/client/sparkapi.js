const request = require("request");
var momentTimezone = require('moment-timezone');
const sparkAPIUrl = 'http://'+marcconfig.SPARKIP+':'+marcconfig.SPARKPORT;

function SparkAPIHelper(){
	if(!(this instanceof SparkAPIHelper)){
		return new SparkAPIHelper();
	}
}

function sendResponse(err, data, field, cb){
	var sparkDataAry = [];
  if(err){
    return cb(null, sparkDataAry);
	}
	if(!data.body){
		return cb(null, sparkDataAry);
	}
	//data.body = `30015|37|LocalDate:2019-6-24|{"45":"15.84,15.79,0.05,0.0,0.0,136,5","51":"16.26,16.21,0.05,0.0,0.0,191,3","40":"15.49,15.42,0.07,0.0,0.0,85,9","44":"15.78,15.73,0.05,0.0,0.0,117,5","56":"16.64,16.57,0.07,0.0,0.0,144,6","55":"16.56,16.51,0.05,0.0,0.0,101,7","50":"16.19,16.14,0.05,0.0,0.0,132,5","46":"15.92,15.88,0.04,0.0,0.0,121,4","48":"16.05,16.0,0.05,0.0,0.0,86,9","54":"16.5,16.42,0.08,0.0,0.0,94,9","43":"15.71,15.64,0.07,0.0,0.0,95,8","49":"16.08,16.06,0.02,0.0,0.0,70,4","39":"15.42,15.4,0.02,0.0,0.0,65,3","47":"15.99,15.93,0.06,0.0,0.0,85,10","53":"16.42,16.35,0.07,0.0,0.0,96,8","42":"15.63,15.57,0.06,0.0,0.0,131,6","41":"15.56,15.49,0.07,0.0,0.0,89,9","52":"16.33,16.27,0.06,0.0,0.0,127,6"}`;
	var dataAry = data.body.split('=');
	for(var dataIndex = 0;dataIndex < dataAry.length;dataIndex++){
		var readingDataAry = dataAry[dataIndex].split('|');
		var readingObj = {};
		readingObj['fnode_id'] = readingDataAry[0];
		readingObj['fparameters'] = readingDataAry[1];
		readingObj['ftime_stamp'] = readingDataAry[2];
		readingObj['reading_date'] = readingDataAry[2];
		readingObj[field] = readingDataAry[3];
		sparkDataAry.push(readingObj);
	}
	return cb(null, sparkDataAry);
}

SparkAPIHelper.prototype.getFifteenMinutesSparkData = function(queryParameters, currentDate, cb) {
	var date =  momentTimezone.utc(currentDate,'YYYY-MM-DD').format('YYYY-M-DD');
	var nodeUniqueId = queryParameters['nodeId'].join('-');
   	var parameterId = queryParameters['parameters'].join('-');
	request.get(sparkAPIUrl+'/spark/fifresult?arg='+nodeUniqueId+',,'+parameterId+',,'+date+',,',(err, data)=>{
		sendResponse(err, data, 'fvalues', cb);
	});
};

SparkAPIHelper.prototype.getHourlySparkData = function(queryParameters, currentDate, cb) {
	var date =  momentTimezone.utc(currentDate,'YYYY-MM-DD').format('YYYY-M-DD');
	var nodeUniqueId = queryParameters['nodeId'].join('-');
	var parameterId = queryParameters['parameters'].join('-');
	request.get(sparkAPIUrl+'/spark/hourresult?arg='+nodeUniqueId+',,'+parameterId+',,'+date+',,',(err, data)=>{
		sendResponse(err, data, 'hvalues', cb);
	});
};

SparkAPIHelper.prototype.startMachineStateSparkJob = function(queryParameters,appId, cb) {
	request.get(sparkAPIUrl+'/machinestate/addEntry?arg='+queryParameters['nodeUniqueId'][0]+','+queryParameters['parameter'][0]+','+queryParameters['setPoint']+','+appId,(err, data)=>{
    if(err) return cb(err, null);
    return cb(null, data);
  });
};

SparkAPIHelper.prototype.stopMachineStateSparkJob = function(queryParameters,appId, cb) {
	request.get(sparkAPIUrl+'/machinestate/deleteEntry?arg='+queryParameters['nodeUniqueId'][0]+','+queryParameters['parameter']+','+queryParameters['setPoint']+','+appId,(err, data)=>{
    if(err) return cb(err, null);
    return cb(null, data);
  });
};

module.exports = SparkAPIHelper;