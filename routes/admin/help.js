var express	              = require('express');
var router                = express.Router();
var help    		      = require(__base + 'models').help;
var authenticationHelpers = require('../authentication-helpers');

router.post('/list', authenticationHelpers.isEslAuth, function(req, res){
	help.list(function(err, result){
		if (err) { 
			res.json({"error" : true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
        if (!result) {  
			res.json({"error" : true,"reason": "No records found."}); 
			return res; 
		}
		result.forEach(function (user,k) {
			if(user.user_id == req.session.passport.user.user_id){
				result.splice(k,1);
			}
		});
        res.json({"result" : result});
		res.end();
		return res;
	});
});

router.post('/find', authenticationHelpers.isEslAuth, function(req, res){
	help.findById(req.body.id,function(err, result){
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

router.post('/submit', authenticationHelpers.isEslAuth, function(req, res){
	req.checkBody("helpText", "Help text is required.").notEmpty();
	req.checkBody("helpText", "Help text must be atleast 3 characters.").isLength(3);
	var errorMsg = '';
	req.getValidationResult().then(function(errors){
		if(!errors.isEmpty()){
			errors.array().map(function(elem) {
				errorMsg += elem.msg+"\n";
			})
			errorMsg = errorMsg.trim("\n");
			res.json({"error" : true,"reason": errorMsg});
		}
		help.edit(req.body,function(err){
			if (err) { 
				res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
				return res;
			}
			res.json({"error": false,"reason": "Help-text updated successfully."});
			res.end();
			return res;
		});
	});
});

module.exports = router;