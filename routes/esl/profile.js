var express = require('express');
var router = express.Router();
var profile = require(__base + 'models').profile;
var authenticationHelpers = require('../authentication-helpers');
var bcrypt = require('bcrypt-nodejs');

router.post('/find', authenticationHelpers.isEslAuth, function (req, res) {
  profile.findUserBySessionId(req.body, req.session.passport.user, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    if (!result) {
      res.json({ "error": true, "reason": "No records found." });
      return res;
    }
    res.json({ "result": result });
    res.end();
    return res;
  });
});

router.post('/submitBasic', authenticationHelpers.isEslAuth, function (req, res) {
  req.checkBody("data.firstName", "First Name is required.").notEmpty();
  req.checkBody("data.lastName", "Last Name is required.").notEmpty();
  req.checkBody("data.email", "Email address is not valid.").isEmail();
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

    profile.submitBasic(req.body, function (err) {
      if (err) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      res.json({ "error": false, "reason": "Profile updated successfully." });
      res.end();
      return res;
    });
  });
});

router.post('/submitSecurity', authenticationHelpers.isEslAuth, function (req, res) {
  req.checkBody("data.oldPwd", "Old Password is required.").notEmpty();
  req.checkBody("data.newPwd", "Password is required.").notEmpty();
  req.checkBody("data.confirmPwd", "Passwords do not match.").equals(req.body.data.newPwd);
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
    commonfunctionmodel.getPasswordHistory(req.body.id, function (err, result) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			var validOldPwd = true;
			validOldPwd = bcrypt.compareSync(req.body.data.oldPwd, result.password);
			if(validOldPwd == false){
				res.json({ "error": true, "reason": "Error: Old password is incorrect." });
				return res;
			}
			var passwordHistoryAry = [],pwdExists = 0;
			if(null != result['password_history'] && '' != result['password_history']){
				result['password_history'].forEach(password => {
					if(true == bcrypt.compareSync(req.body.data.newPwd, password)) {
						pwdExists = 1;
					}
					passwordHistoryAry.push(password);
				});
			}
			if(pwdExists){
				res.json({ "error": true, "reason": "Error: New password must be different from your last 5 passwords!" });
				return res;
			}
			passwordHistoryAry.push(bcrypt.hashSync(req.body.data.newPwd));
      if(passwordHistoryAry.length > 5) passwordHistoryAry.shift();
      profile.submitSecurity(req.body, passwordHistoryAry, function (err) {
        if (err) {
          res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
          return res;
        }
        res.json({ "error": false, "reason": "Password updated successfully." });
        res.end();
        return res;
      });
    });
  });
});

router.post('/submitRegional', authenticationHelpers.isEslAuth, function (req, res) {
  req.checkBody("data.timezone", "Timezone is required.").notEmpty();
  req.checkBody("data.language", "Language is required.").notEmpty();
  req.checkBody("data.currency", "Currency is required.").notEmpty();
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
    profile.submitRegional(req.body, function (err) {
      if (err) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      req.session.passport.user.language = req.body.data.language;
      res.json({ "error": false, "reason": "Profile updated successfully." });
      res.end();
      return res;
    });
  });
});
router.post('/timezone', authenticationHelpers.isEslAuth, function (req, res) {
	profile.timezone(function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": true, "reason": "No records found." });
			return res;
		}
		res.json({ "result": result });
		res.end();
		return res;
	});
});
module.exports = router;