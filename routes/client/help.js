var express	              = require('express');
var router                = express.Router();
var help    		      = require(__base + 'models').help;
var authenticationHelpers = require('../authentication-helpers');

router.post('/getHelpIconText', authenticationHelpers.isClientAuth, function(req, res){
	help.getHelpIconText(req.body.moduleName,function(err, result){
		if (err) { 
			res.json({"error" : true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
        if (!result) {  
			res.json({"error" : true,"reason": "No records found."}); 
			return res; 
		}
		var helpTextObj = {};
		result.forEach(function (v,k) {
		helpTextObj[v.field_name] = v.help_text+"\n\n"+v.help_text_id;
		});
		res.json({"error" : false,"result": helpTextObj});
		res.end();
		return res;
	});
});

module.exports = router;