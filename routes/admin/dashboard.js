var express	              = require('express');
var router                = express.Router();
var dashboard    		      = require(__base + 'models').dashboard;
var user    		      = require(__base + 'models').user;
var authenticationHelpers = require('../authentication-helpers');

router.post('/partnerCompanyUserCount', authenticationHelpers.isAdminAuth, function(req, res){
	dashboard.partnerCompanyUserCount(req.session.passport.user.partner_id,function(err, result){
		if (err) { 
			res.json({"error" : true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
		res.json({"error" : false,"result": result});
		res.end();
		return res;
	});
});

router.post('/partnerCompanyRenewalCount', authenticationHelpers.isAdminAuth, function(req, res){
	dashboard.partnerCompanyRenewalCount(req.session.passport.user.partner_id,function(err, result){
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