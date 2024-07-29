var express	              = require('express');
var router                = express.Router();
var partner    		  = require(__base + 'models').partner;
var authenticationHelpers = require('../authentication-helpers');

router.post('/list', authenticationHelpers.isEslAuth, function(req, res){
	partner.list(function(err, result){
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

router.post('/find', authenticationHelpers.isEslAuth, function(req, res){
	partner.findById(req.body.id,function(err, result){
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

router.post('/column', authenticationHelpers.isEslAuth, function(req, res){
	partner.column(function(err, result){
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

router.post('/uniqueName', authenticationHelpers.isEslAuth, function(req, res){
	partner.uniqueName(req.body.partnerName,req.body.id, function(err,result){
		if (err) { 
			res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
		res.json({"result" : result});
		res.end();
		return res;
	});
});

router.post('/submit', authenticationHelpers.isEslAuth, function(req, res){
	/*nodejs validation */
	req.checkBody("data.partnerName", "Partner name must be atleast 3 characters.").isLength(3);
	req.checkBody("data.partnerType", "Partner type is required.").notEmpty();
	req.checkBody("data.email", "Email address is not valid.").isEmail();
	req.checkBody("data.mobile", "Mobile number must be digit.").isNumeric();
	if(null != req.body.website){
		req.checkBody("data.website", "Website  is not valid.").isURL();
	}
	if(null != req.body.landline){
		req.checkBody("data.landline", "landline  is not valid.").isLength(11);
	}
	req.checkBody("data.addrLine1", "Address Line 1 is required.").notEmpty();
	req.checkBody("data.addrLine2", "Address Line 2 is required.").notEmpty();
	// req.checkBody("data.pincode", "Pincode must be digits.").isNumeric();
	req.checkBody("data.pincode", "Pincode must be between 5 to 10 digits.").isLength(5,10);
	req.checkBody("data.country", "Country is required.").notEmpty();
	req.checkBody("data.state", "State is required.").notEmpty();
	req.checkBody("data.city", "City is required.").notEmpty();
	req.checkBody("data.billingCntName", "Billing contact name must be atleast 3 characters.").isLength(3);
	req.checkBody("data.billingCntNo", "Billing contact number is not valid.").isLength(10,15);
	req.checkBody("data.billingAddrLine1", "Address Line 1 is required.").notEmpty();
	req.checkBody("data.billingAddrLine2", "Address Line 2 is required.").notEmpty();
	req.checkBody("data.billingPincode", "Billing pincode must be digit.").notEmpty();
	req.checkBody("data.billingPincode", "Billing pincode must be between 5 to 10 digits.").isLength(5,10);
	// req.checkBody("data.billingPincode", "Billing pincode must be digit.").isNumeric();
	var errorMsg = '';
	req.getValidationResult().then(function(errors) {
		if (!errors.isEmpty()) {
			errors.array().map(function (elem) {
					errorMsg += elem.msg+"\n";
			});
			errorMsg = errorMsg.trim("\n");
			res.json({"error" : true,"reason": errorMsg}); 
			return res;
		}

		if(req.body.action == 'add'){
			partner.add(req.body.data,req.session.passport.user.user_id,function(err){
				if (err) { 
					res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
					return res;
				}
				res.json({"error": false,"reason": "Partner added successfully."});
				res.end();
				return res;
			});
		}

		if(req.body.action == 'edit'){
			partner.edit(req.body,req.session.passport.user.user_id,function(err){
				if (err) { 
					res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
					return res;
				}
				res.json({"error": false,"reason": "Partner updated successfully."});
				res.end();
				return res;
			});
		}
	});
});

router.post('/delete', authenticationHelpers.isEslAuth, function(req, res){
	partner.delete(req.body.id,req.session.passport.user.user_id,function(err,result){
		if (err) { 
			res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
		if(!result){
			res.json({"error": true,"reason": "This partner can't be deleted as it has associated company."});
			res.end();
			return res;
		}
		res.json({"error": false,"reason": "Partner deleted successfully."});
		res.end();
		return res;
	});
});

module.exports = router;
