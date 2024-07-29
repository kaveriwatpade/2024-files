var express = require('express');
var router  = express.Router();
var commonfunction = require(__base + 'models').commonfunction;
var authenticationHelpers = require('../authentication-helpers');

router.post('/countryList', authenticationHelpers.isAdminAuth, function(req, res){
	commonfunction.countryList(function(err, result){
		if (err) { 
			res.json({"error" : true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
		if (!result) {  
			res.json({"error" : true,"reason": "No records found."}); 
			return res; 
		}
    	res.json({"error" : false,"result": result});
		res.end();
		return res;
	});
});

router.post('/stateList', authenticationHelpers.isAdminAuth, function(req, res){
	commonfunction.stateList(req.body,function(err, result){
		if (err) { 
			res.json({"error" : true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
		if (!result) {  
			res.json({"error" : true,"reason": "No records found."}); 
			return res; 
		}
    	res.json({"error" : false,"result": result});
		res.end();
		return res;
	});
});

router.post('/cityList', authenticationHelpers.isAdminAuth, function(req, res){
	commonfunction.cityList(req.body,function(err, result){
		if (err) { 
			res.json({"error" : true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
        if (!result) {  
			res.json({"error" : true,"reason": "No records found."}); 
			return res; 
		}
		res.json({"error" : false,"result": result});
		res.end();
		return res;
	});
});

router.post('/uniqueEmail', authenticationHelpers.isAdminAuth, function(req, res){
	commonfunction.uniqueEmail(req.body,function(err, result){
		if (err) { 
			res.json({"error" : true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
    res.json({"error" : false,"result": result});
		res.end();
		return res;
	});
});

router.post('/uniqueMobile', authenticationHelpers.isAdminAuth, function(req, res){
	commonfunction.uniqueMobile(req.body,function(err, result){
		if (err) { 
			res.json({"error" : true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
    res.json({"error" : false,"result": result});
		res.end();
		return res;
	});
});

router.post('/submitAppSettings', authenticationHelpers.isAdminAuth, function (req, res) {
	if (req.body.action == 'add') {
		commonfunction.addPartnerApp(req.body, req.session.passport.user, function (err) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			res.json({ "error": false, "reason": "APP added successfully." });
			res.end();
			return res;
		});
	}
	if (req.body.action == 'edit') {
		commonfunction.updatePartnerApp(req.body, req.session.passport.user, function (err) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			res.json({ "error": false, "reason": "APP details updated successfully." });
			res.end();
			return res;
		});
	}
});

router.post('/checkPartnerAppExists', authenticationHelpers.isAdminAuth, function(req, res){
	commonfunction.checkPartnerAppExists(req.session.passport.user.partner_id,function(err, result){
		if (err) { 
			res.json({"error" : true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
		if(result){
			res.json({"error" : true,"reason": "Error: This APP is already added!"}); 
			return res;
		}
    res.json({"error" : false,"result": result});
		res.end();
		return res;
	});
});

router.post('/resendEmail', authenticationHelpers.isAdminAuth, function (req, res) {
  var postData = {email:req.body.email_address,firstName:req.body.firstname,lastName:req.body.lastname};
  commonfunction.resendEmail(postData,req.body.user_id,function(err,result){
		if (err) {
      res.json({ "error": true, "reason": "Error: Confirmation email not sent to user!" });
      return res;
		}
		res.json({ "error":false, "reason": "Confirmation email sent to the user."});
		res.end();
		return res;
	});
});

module.exports = router;