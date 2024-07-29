var express	              = require('express');
var router                = express.Router();
var partner    		  = require(__base + 'models').partner;
var authenticationHelpers = require('../authentication-helpers');

router.post('/find', authenticationHelpers.isAdminAuth, function(req, res){
	partner.findById(req.session.passport.user.partner_id,function(err, result){
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

module.exports = router;