var express	              = require('express');
var router                = express.Router();
var nodemake    		  = require(__base + 'models').nodemake;
var authenticationHelpers = require('../authentication-helpers');

router.post('/list', authenticationHelpers.isEslAuth, function(req, res){
	nodemake.list(function(err, result){
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
	req.checkBody("data.nodeMake", "Node Make is required.").notEmpty();
	req.checkBody("data.nodeMake", "Node Make name must be atleast 3 characters.").isLength(3);
	var errorMsg = '';
	req.getValidationResult().then(function (errors) {
		if (!errors.isEmpty()) {
			errors.array().map(function (elem) {
				errorMsg += elem.msg + "\n";
			});
			errorMsg = errorMsg.trim("\n");
			res.json({ "error": true, "reason": errorMsg });
			return res;
		}
		if(req.body.action == 'add'){
			nodemake.add(req.body.data,req.session.passport.user.user_id,function(err){
				if (err) { 
					res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
					return res;
				}
				res.json({"error": false,"reason": "Node-make added successfully."});
				res.end();
				return res;
			});
		}
		if(req.body.action == 'edit'){
			nodemake.edit(req.body,req.session.passport.user.user_id,function(err){
				if (err) { 
					res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
					return res;
				}
				res.json({"error": false,"reason": "Node-make updated successfully."});
				res.end();
				return res;
			});
		}
	});
});

router.post('/find', authenticationHelpers.isEslAuth, function(req, res){
	nodemake.findById(req.body.id,function(err, result){
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

router.post('/delete', authenticationHelpers.isEslAuth, function(req, res){
	nodemake.delete(req.body.id,req.session.passport.user.user_id,function(err,result){
		if (err) { 
			res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
		if(result == 1){
			res.json({"error": false,"reason": "Node models are assigned to this node make. Cannot delete node-make."});
			return res;
		}
		res.json({"error": false,"reason": "Node-make deleted successfully."});
		res.end();
		return res;
	});
});

router.post('/uniqueMeterMake', authenticationHelpers.isEslAuth, function(req, res){
	nodemake.uniqueMeterMake(req.body,function(err, result){
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