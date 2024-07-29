var express		= require('express');
var router      = express.Router();
var passport    = require('passport');
var authenticationHelpers = require('../authentication-helpers');
var dbUser = require(__base + 'models').user;
var ejs = require('ejs');
var bcrypt = require('bcrypt-nodejs');

router.get('/logout', authenticationHelpers.isClientAuth, function(req, res, next) {
  req.logout();
  res.json({"loggedOut": req.isAuthenticated()});
});

router.get('/authenticated', authenticationHelpers.isClientAuth, function(req, res, next) {
  res.json({"authenticated": true});
});

router.post('/authenticateUser', function (req, response) {
	req.checkBody("email", "Email is required.").notEmpty();
	req.checkBody("password", "Password is required.").notEmpty();
	var errorMsg = '';
	req.getValidationResult().then(function(err){
		if(!err.isEmpty()){
			err.array().map(function(elem){
				errorMsg += elem.msg+"\n";
			});
			errorMsg = errorMsg.trim("\n");
			response.json({"error" : true,"reason": errorMsg});
			return response;
		}
		dbUser.authenticateUser(req.body, function (err,result) {
			if (err) {
				response.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return response;
			}
			if(result == 1){
				response.json({ "error": true, "reason": "Error: Invalid email. Please try again!" });
				return response;
			}
			if(result == 2){
				response.json({ "error": true, "reason": "Error: Invalid email or password." });
				return response;
			}
			if(result == 3){
				response.json({ "error": true, "reason": "Error: Invalid password. Please try again!" });
				return response;
			}
			dbUser.userCompanyList(result['companies'], function (err, companyResult) {
				if (err) {
					response.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
					return response;
				}
				if (!result) {
					response.json({ "error": true, "reason": "No company is assigned to user." });
					return response;
				}
				response.json({ "error": false, "result": companyResult });
				response.end();
				return response;
			});
		});
	});
});

router.post('/login', function(req, response) {
  passport.authenticate('solarlogin', function(error, user, info) {
		if(error) {
			response.json({"is_authenticated" : false,"reason": "Error: Something went wrong. Please try again!"});
			return response;
		}
		if(!user) {
			response.json({"is_authenticated" : false,"reason": "Invalid Credentials. Please try again."});
			return response;
		}
		req.logIn(user, function(error) {
			if (error) {
				response.json({"is_authenticated" : false,"reason": "Invalid Credentials. Please try again."});
				return response;
			}
			response.json({"is_authenticated" : true,"reason": "Valid Credentials.","current_user":user});
			response.end();
			return response;
		});
  })(req, response);
});

router.post('/forgotPassword', function(req, response) {
 	dbUser.emailExists(req.body, function(err, result) {
		if (err) {
			response.json({"error" : true,"reason": "Invalid Credentials. Please try again."});
			return response;
		}
		if(0 == result.usercnt || 'ESL Admin' == result.role_name){
			response.json({"error" : true,"reason": "Invalid email address."});
			return response;
		} 
		var timestamp = new Date().getTime();
		dbUser.updateResetPasswordToken(timestamp,result.user_id, function(err, userResult) {
			if (err) {
				response.json({"error" : true,"reason": "Error: Something went wrong. Please try again!"});
				return response;
			}
			var baseLink = marcconfig.ANGULARBASEPATH+'/#/solar/resetPassword/';
			var htmlObj= {};
			htmlObj['user'] = result.firstname +' '+ result.lastname;
			htmlObj['body'] = '<p>You recently requested to reset your password for your MARC account. <a href="'+baseLink+result.user_id+'">Click Here</a> to reset it.</p>';
			htmlObj['imagePath'] = marcconfig.ANGULARBASEPATH+'/assets/images';
			htmlObj['basePath'] = marcconfig.ANGULARBASEPATH;
			ejs.renderFile(__base+marcconfig.EMAILTEMPLATEPATH+'/email.ejs', htmlObj,function (err, html) {
				var mailOptions = {
					from: marcconfig.SMTPFROMNAME,
					to: req.body.email,
					subject: 'MARC reset password link',
					html: html
				};
				mailSettingDetails.sendMail(mailOptions, function(error, info){
					if(error){
						response.json({"error": true,"reason": "Error: Something went wrong. Please try again!"});
						return response;
					}
					else{
						response.json({"error" : false,"reason": "Password reset link has been send to your email address."});
						return response;
					}
				});
			});
		});
	});
});

router.post('/resetPassword', function(req, response) {
	req.checkBody("data.password", "Password is required.").notEmpty();
	req.checkBody("data.confirmPassword", "Passwords do not match.").equals(req.body.data.password);
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
				response.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return response;
			}
			var passwordHistoryAry = [],pwdExists = 0;
			if(null != result['password_history'] && '' != result['password_history']){
				result['password_history'].forEach(password => {
					if(true == bcrypt.compareSync(req.body.data.password, password)) {
						pwdExists = 1;
					}
					passwordHistoryAry.push(password);
				});
			}
			if(pwdExists){
				response.json({ "error": true, "reason": "Error: New password must be different from your last 5 passwords!" });
				return response;
			}
			passwordHistoryAry.push(bcrypt.hashSync(req.body.data.password));
			if(passwordHistoryAry.length > 5) passwordHistoryAry.shift();
			dbUser.changePwdWithResetPassword(req.body,passwordHistoryAry,function(err){
				if (err) { 
					response.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
					return response;
				}
				response.json({"error": false,"reason": "User password changed successfully."});
				response.end();
				return response;
			});
		});
	});
});

router.post('/getResetPasswordToken', function(req, response) {
	dbUser.userData(req.body,function(err, result){
		if (err || !result) { 
			response.json({"error" : true}); 
			return res;
		}
		var reset_password_token = new Date(result.reset_password_token); 
		reset_password_token.setDate(reset_password_token.getDate()+1);
		result.reset_password_token = reset_password_token.getTime();
		response.json({'result':result});
		response.end();
		return response;
	});
});

router.post('/switchToCompany', function (req, response, next) {
	dbUser.getEmailPasswordOnCompanySwitch(req.body.email, function (err, result) {
		if (err) {
			response.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return response;
		}
		req.logout();
		req.body.email = result.email_address;
		req.body.password = result.password;
		req.body.switchToCompany = true;
		passport.authenticate('solarlogin', function(error, user, info) {
			if(!user) {
				response.json({"is_authenticated" : false,"reason": "Invalid Credentials. Please try again."});
				return response;
			}
			req.logIn(user, function(error) {
				if (error) {
					response.json({"is_authenticated" : false,"reason": "Invalid Credentials. Please try again."});
					return response;
				}
				response.json({"is_authenticated" : true,"reason": "Valid Credentials.","current_user":user});
				response.end();
				return response;
			});
		})(req, response);
	});
});

module.exports = router;