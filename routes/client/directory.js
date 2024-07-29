
var express	              = require('express');
var router                = express.Router();
var directory    		      = require(__base + 'models').directory;
var authenticationHelpers = require('../authentication-helpers');
var commonfun = require('./common-function');

router.post('/directoryList', authenticationHelpers.isClientAuth, function(req, res){
	commonfunctionmodel.checkIfPermissionExists(req.session.passport.user,26,function(data){
		if(false == data){
			res.json({"error" : true,"reason": "Error: Permission Denied!"}); 
			return res;
		}
		var fieldsAry = [];
		if(req.session.passport.user.company_id){
			fieldsAry[0] = 'companies';
			fieldsAry[1] = req.session.passport.user.company_id;
		}
		if(req.session.passport.user.partner_id){
			fieldsAry[0] = 'partners';
			fieldsAry[1] = req.session.passport.user.partner_id;
		}
		directory.directoryList(fieldsAry,req.session.passport.user.role_name,function(err, result){
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

router.post('/submitDirectory', authenticationHelpers.isClientAuth, function(req, res){
	var permissionId = ('add' || 'edit' == req.body.action) ? 27:28;
	commonfunctionmodel.checkIfPermissionExists(req.session.passport.user,permissionId,function(data){
		if(false == data){
			res.json({"error":true,"reason": "Error: Permission Denied!"});
			return res;
		}
	});

	req.checkBody("data.firstName","First Name is Required.").notEmpty();
	req.checkBody("data.lastName","Last Name is Required.").notEmpty();
	req.checkBody("data.email","Email address is not valid.").isEmail();
	req.checkBody("data.mobile","Mobile Number Must Be  10 Digit.").isNumeric();

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
		req.body.data.company_id = req.session.passport.user.company_id;
		if(req.body.action == 'add'){
			directory.addDirectory(req.body.data,req.session.passport.user.user_id,function(err){
				if (err) { 
					res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
					return res;
				}
				res.json({"error": false,"reason": "Directory user added successfully."});
				res.end();
				return res;
			});
		}
		if(req.body.action == 'edit'){
			directory.updateDirectory(req.body.data,req.session.passport.user.user_id,function(err){
				if (err) { 
					res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
					return res;
				}
				res.json({"error": false,"reason": "Directory user updated successfully."});
				res.end();
				return res;
			});
		}
	});
});

router.post('/deleteDirectory',authenticationHelpers.isClientAuth,function(req,res){
	commonfunctionmodel.checkIfPermissionExists(req.session.passport.user,29,function(data) {
		if(false == data){
			res.json({"error" : true,"reason": "Error: Permission Denied!"});
			return res;
		}
		directory.deleteDirectory(req.body.id,req.session.passport.user.user_id,function(err,result){
			if (err) { 
				res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
				return res;
			}
			res.json({"error": false,"reason": "Directory user deleted successfully."});
			res.end();
			return res;
		});
	});
});

router.post('/directoryData',authenticationHelpers.isClientAuth, function(req,res){	
	directory.directoryData(req.body,function(err, result){
		if(err){
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

module.exports = router;