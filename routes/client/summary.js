var express	= require('express');
var router = express.Router();
var summary = require(__base + 'models').summary;
var authenticationHelpers = require('../authentication-helpers');

router.post('/dataBridgeCount', function(req, res){
	summary.dataBridgeCount(req.session.passport.user.company_id,function(err, result){
		if (err) { 
			res.json({"error" : true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
   		 res.json({"error" : false,"result": result});
		res.end();
		return res;
	});
});

router.post('/usersCount', authenticationHelpers.isClientAuth, function(req, res){
	summary.usersCount(req.session.passport.user.company_id,function(err, result){
		if (err) { 
			res.json({"error" : true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
    	res.json({"error" : false,"result": result.length});
		res.end();
		return res;
	});
});

router.post('/locationCount', authenticationHelpers.isClientAuth, function(req, res){
	summary.locationCount(req.session.passport.user.company_id,function(err, result){
		if (err) { 
			res.json({"error" : true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
   		 res.json({"error" : false,"result": result});
		res.end();
		return res;
	});
});

router.post('/nodeList', authenticationHelpers.isClientAuth, function(req, res){
	summary.nodeList(req.session.passport.user,function(err, result){
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

// function by deepa

router.post('/nodeCount', authenticationHelpers.isClientAuth, function(req, res){
	summary.nodeCount(req.session.passport.user.company_id,function(err, result){
		if (err) { 
			res.json({"error" : true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
    res.json({"error" : false,"result": result});
		res.end();
		return res;
	});
});

module.exports = router;