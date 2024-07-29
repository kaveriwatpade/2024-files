var express	              = require('express');
var router                = express.Router();
var company    		  = require(__base + 'models').company;
var authenticationHelpers = require('../authentication-helpers');
var multer = require('multer');
var companyLogoStorage = __base+'/uploads/images/company-logo/';
var storage = multer.diskStorage({
	destination: function(req, file, callback) {
		callback(null, companyLogoStorage)
	},
	filename: function(req, file, callback) {
		callback(null,file.originalname)
	}
});

router.post('/list', authenticationHelpers.isEslAuth, function(req, res){
	company.list(function(err, result){
		if (err) { 
			res.json({"error" : true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
    if (!result['companyList']) {  
			res.json({"error" : true,"reason": "No records found."}); 
			return res; 
		}
        res.json({"result" : result});
		res.end();
		return res;
	});
});

router.post('/moduleList', authenticationHelpers.isEslAuth, function(req, res){
	company.moduleList(function(err, result){
		if (err) { 
			res.json({"error" : true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
        if (!result) {
			res.json({"error" : true,"reason": "No records found."}); 
			return res; 
		}
        res.json(result);
		res.end();
		return res; 
	});
});

router.post('/find', authenticationHelpers.isEslAuth, function(req, res){
	company.findById(req.body,function(err, result){
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
	company.uniqueName(req.body.companyName,req.body.id, function(err,result){
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
	req.checkBody("data.companyName", "Company name must be atleast 3 characters.").isLength(3);
	req.checkBody("data.partnerName", "Partner name is required.").notEmpty();
	req.checkBody("data.companyType", "Company type is required.").notEmpty();
	req.checkBody("data.industryType", "Industry type is required.").notEmpty();
	req.checkBody("data.email", "Email address is not valid.").isEmail();
	req.checkBody("data.mobile", "Mobile number must be digits.").isNumeric();
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
	req.checkBody("data.billingCntNo", "Billing contact number is not valid.").isLength(10),15;
	req.checkBody("data.billingAddrLine1", "Address Line 1 is required.").notEmpty();
	req.checkBody("data.billingAddrLine2", "Address Line 2 is required.").notEmpty();
	// req.checkBody("data.billingPincode", "Billing pincode must be digits.").isNumeric();
	req.checkBody("data.billingPincode", "Billing pincode must be between 5 to 10 digits.").isLength(5,10);
	req.checkBody("data.paymentMode", "Payment mode is required.").notEmpty();
	req.checkBody("data.currency", "Currency is required.").notEmpty();
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
			company.add(req.body.data,req.session.passport.user.user_id,req.body.menu,function(err,result){
				if (err) { 
					res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
					return res;
				}
				res.json({"error": false,"reason": "Company added successfully.","result":result});
				res.end();
				return res;
			});
		}

		if(req.body.action == 'edit'){
			company.edit(req.body,req.session.passport.user.user_id,function(err,result){
				if (err) { 
					res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
					return res;
				}
				res.json({"error": false,"reason": "Company updated successfully.","result":result});
				res.end();
				return res;
			});
		}
	});
});

router.post('/uploadCompanyLogo',authenticationHelpers.isEslAuth, function(req, res){
	var upload = multer({
		storage:storage
	}).single('svg')
	upload(req, res, function(err) {
    if(err){
      res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
      return res;
		}
		var filenameAry = req.file.filename.split('.');
		company.updateCompanyLogo(filenameAry[0],req.file.filename,function(err,result){
			if (err) { 
				res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
				return res;
			}
			res.json({"error": false,"reason": "Company logo uploaded successfully."});
			res.end();
			return res;
		});
	})
});

router.post('/submitLicense', authenticationHelpers.isEslAuth, function(req, res){
	req.checkBody("data.validity", "Validity is required.").notEmpty();
	req.checkBody("data.noOfUsers", "Number of users must be digits.").isNumeric();
	req.checkBody("data.noOfNodes", "Number of nodes must be digits.").isNumeric();
	req.checkBody("data.graceDays", "Grace days must be digits.").isNumeric();
	req.checkBody("data.dunningDays", "Dunning days must be digits.").isNumeric();
	req.checkBody("data.noOfNodes", "Number of nodes must be digits.").isNumeric();
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
		company.editLicense(req.body,function(err){
			if (err) { 
				res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
				return res;
			}
			res.json({"error": false,"reason": "Company license updated successfully."});
			res.end();
			return res;
		});
	});
});

router.post('/delete', authenticationHelpers.isEslAuth, function(req, res){
	company.delete(req.body.id,req.session.passport.user.user_id,function(err,result){
		if (err) { 
			res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
		if(!result){
			res.json({"error": true,"reason": "This company can't be deleted as it has associated users."});
			res.end();
			return res;
		}
		res.json({"error": false,"reason": "Company deleted successfully."});
		res.end();
		return res;
	});
});

router.post('/findSmsHistory', authenticationHelpers.isEslAuth, function(req, res){
	company.findSmsHistoryByCompanyId(req.body,function(err, result){
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

router.post('/recharge', authenticationHelpers.isEslAuth, function(req, res){
	req.checkBody("smsCount", "Validity is required.").notEmpty();
	req.checkBody("smsCount", "SMS count should be numeric.").isNumeric();
	req.checkBody("companyId", "Company not found").notEmpty();
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
		/* Edit company license data */
		company.recharge(req.body,function(err){
			if (err) { 
				res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
				return res;
			}
			res.json({"error": false,"reason": "Recharge done successfully."});
			res.end();
			return res;
		});
	});
});

router.post('/getUserList',authenticationHelpers.isEslAuth, function (req, res) { 
	company.getUserList(req.body,function(err,result){
		if (err) { 
			res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;			
		}
		for(var i = 0;i<result.length;i++) { 
			result[i]['role_name']=result[i].companies[req.body.id].role
		 }
		res.json({"error": false,result:result});
		res.end();
		return res;
	});
   
})
router.post('/submitMenuList', authenticationHelpers.isEslAuth, function (req, res) {
	company.submitMenu(req.body.id,req.body.data,function (err, result) {
		if (err) {
			console.log(err,'err');
			res.json({ "error": true, "rseason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		
		res.json({ "error": false, "reason": "menulist added successfully" });
		res.end();
		return res;
	});
//});
 
});
module.exports = router;
