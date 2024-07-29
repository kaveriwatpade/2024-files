var express = require('express');
var router  = express.Router();
var gateway    	  = require(__base + 'models').gateway;
var authenticationHelpers = require('../authentication-helpers');
var Uuid = require('cassandra-driver').types.Uuid;

router.post('/list', authenticationHelpers.isClientAuth, function(req, res){
	commonfunctionmodel.checkIfPermissionExists(req.session.passport.user,16,function(data){
		if(false == data){
			res.json({"error" : true,"reason": "Error: Permission Denied!"}); 
			return res;
		}
		gateway.list(req.session.passport.user.company_id,function(err, result){
			if (err) { 
				res.json({"error" : true,"reason": "Error: Something went wrong. Please try again!"}); 
				return res;
			}
			if (!result) {  
				res.json({"error" : true,"reason": "No records found."}); 
				return res; 
			}
			res.json({"result" : result});
			res.end();
			return res;
		});
	});
});

router.post('/gatewayData', authenticationHelpers.isClientAuth, function(req, res){
	commonfunctionmodel.checkIfPermissionExists(req.session.passport.user,18,function(data){
		if(false == data){
			res.json({"error" : true,"reason": "Error: Permission Denied!"}); 
			return res;
		}
		gateway.gatewayData(req.body,function(err, result){
			if (err) { 
				res.json({"error" : true,"reason": "Error: Something went wrong. Please try again!"}); 
				return res;
			}
			if (!result) {  
				res.json({"error" : true,"reason": "No records found."}); 
				return res; 
			}
			res.json({"result" : result});
			res.end();
			return res;
		});
	});
});

router.post('/submitGateway', authenticationHelpers.isClientAuth, function(req, res, next) {
	var permissionId = ('add' == req.body.action)? 17:18;
	commonfunctionmodel.checkIfPermissionExists(req.session.passport.user,permissionId,function(data){
		if(false == data){
			res.json({"error" : true,"reason": "Error: Permission Denied!"}); 
			return res;
		}
		req.checkBody("data.gatewayName", "Gateway name must be atleast 3 characters.").isLength(3);
		req.checkBody("data.gatewayId", "Configure gateway id must be alphanumeric.").isAlphanumeric();
		req.checkBody("data.gatewayType", "Gateway type is required.").notEmpty();
		var errorMsg = '';
		req.getValidationResult().then(function(err){
			if(!err.isEmpty()){
				err.array().map(function(elem){
					errorMsg += elem.msg+"\n";
				});
				errorMsg = errorMsg.trim("\n");
				res.json({"error" : true,"reason": errorMsg});
				return res;
			}
			if(req.body.action == 'add'){
				gateway.uniqueGatewayId(req.body.data,function(err, result){
					if (err) { 
						res.json({"error" : true,"reason": "Error: Something went wrong. Please try again!"}); 
						return res;
					}
					if (0 < result) { 
						res.json({"error" : true,"reason": "Error: Please generate gateway id again!",alreadyexists:true}); 
						return res;
					}
					gateway.addGateway(req.body.data,req.session.passport.user, function(err){
						if (err) { 
							res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
							return res;
						}
						res.json({"error" : false,"reason":'Gateway added successfully.'}); 
						return res;
					});
				});
			}
			if(req.body.action == 'edit'){
				gateway.updateGateway(req.body,req.session.passport.user.user_id,function(err,result){
					if (err) { 
						res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
						return res;
					}
					var text = 'You had updated "'+req.body.data.gatewayName+'" gateway';
					commonfunctionmodel.addInLogs(req.session.passport.user,text,'log',JSON.stringify({'of_gateway_id':req.body.id}),function(){});
					res.json({"error" : false,"reason":'Gateway updated successfully.'}); 
					return res;
				});
			}
		});
	});
});

router.post('/gatewayNodes', authenticationHelpers.isClientAuth, function(req, res){
	commonfunctionmodel.checkIfPermissionExists(req.session.passport.user,19,function(data){
		if(false == data){
			res.json({"error" : true,"reason": "Error: Permission Denied!"}); 
			return res;
		}
		if('undefined' === typeof req.body.gatewayId ||'' === typeof req.body.gatewayId){
			res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
		gateway.gatewayNodes(req.body.gatewayId,function(err,count){
			if (err) { 
				res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
				return res;
			}
			if(0 < count){
				res.json({"error": true,"reason": "Error: You cannot delete this gateway as it is associated to node(s)!"}); 
				return res;
			}
			res.json({"error": false,"reason": "No nodes associated!"}); 
			return res;
		});
	});
});

router.post('/delete', authenticationHelpers.isClientAuth, function(req, res){
	commonfunctionmodel.checkIfPermissionExists(req.session.passport.user,19,function(data){
		if(false == data){
			res.json({"error" : true,"reason": "Error: Permission Denied!"}); 
			return res;
		}
		if('undefined' == typeof req.body.id || '' === typeof req.body.id){
			res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
		gateway.delete(req.body.id,req.session.passport.user.user_id,function(err){
			if (err) { 
				res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
				return res;
			}
			var text = 'You had deleted "'+req.body.gatewayName+'" gateway';
			commonfunctionmodel.addInLogs(req.session.passport.user,text,'log',JSON.stringify({'of_gateway_id':req.body.id}),function(){});
			res.json({"error": false,"reason": "Gateway deleted successfully."});
			res.end();
			return res;
		});
	});
});

router.post('/uniqueGatewayName', authenticationHelpers.isClientAuth, function(req, res){
	gateway.uniqueGatewayName(req.body,req.session.passport.user.company_id,function(err, result){
		if (err) { 
			res.json({"error" : true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
        res.json({"result" : result});
		res.end();
		return res;
	});
});

router.post('/uniqueGatewayId', authenticationHelpers.isClientAuth, function(req, res){
	gateway.uniqueGatewayId(req.body,function(err, result){
		if (err) { 
			res.json({"error" : true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
    res.json({"result" : result});
		res.end();
		return res;
	});
});

module.exports = router;