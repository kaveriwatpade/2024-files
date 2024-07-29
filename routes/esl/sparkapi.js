const request = require("request");
const sparkAPIUrl = 'http://'+marcconfig.SPARKIP+':'+marcconfig.SPARKPORT;

function SparkAPIHelper(){
	if(!(this instanceof SparkAPIHelper)){
		return new SparkAPIHelper();
	}
}
SparkAPIHelper.prototype.addParameterInSpark = function(paramId,paramType, cb) {
  var URL = sparkAPIUrl + ((1 == paramType) ? '/spark/iparamadd?iparam=' : '/spark/cparamadd?cparam=') + paramId;
	request.get(URL,(err, data)=>{
    if(err) return cb(true, null);
    var bodyData = JSON.parse(data.body);
    if('error' == bodyData['status']) return cb(true, null);// as spark side through's error in data only, not in err.
    return cb(null, bodyData['status']);
  });
};

SparkAPIHelper.prototype.deleteParameterInSpark = function(paramId,paramType, cb) {
  var URL = sparkAPIUrl + ((1 == paramType) ? '/spark/iparamdelete?iparam=' : '/spark/cparamdelete?cparam=') + paramId;
	request.get(URL,(err, data)=>{
    if(err) return cb(true, null);
    var bodyData = JSON.parse(data.body);
    if('error' == bodyData['status']) return cb(true, null);// as spark side through's error in data only, not in err.
    return cb(null, bodyData['status']);
  });
};

module.exports = SparkAPIHelper;