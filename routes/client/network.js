var express	              = require('express');
var router                = express.Router();
var network    		      = require(__base + 'models').network;
var authenticationHelpers = require('../authentication-helpers');

router.post('/nodes', authenticationHelpers.isClientAuth, function(req, res){
	network.nodes(req.session.passport.user.company_id,function(err, result){
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