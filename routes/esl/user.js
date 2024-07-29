var express = require('express');
var router = express.Router();
var user = require(__base + 'models').user;
var authenticationHelpers = require('../authentication-helpers');
var ejs = require('ejs');
var bcrypt = require('bcrypt-nodejs');

router.post('/list', authenticationHelpers.isEslAuth, function (req, res) {
	user.list(req.body, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result || result.length == 0) {
			res.json({ "error": true, "reason": "No records found.", "result": result });
			return res;
		}
		result.forEach(function (user, k) {
			if (user.user_id == req.session.passport.user.user_id) {
				result.splice(k, 1);
			}
		});
		res.json({ "error": false, "result": result });
		res.end();
		return res;
	});
});

router.post('/companyList', authenticationHelpers.isEslAuth, function (req, res) {
	user.companyList(function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": true, "reason": "No records found." });
			return res;
		}
		res.json({ "error": false, "result": result });
		res.end();
		return res;
	});
});

router.post('/partnerList', authenticationHelpers.isEslAuth, function (req, res) {
	user.partnerList(function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": true, "reason": "No records found." });
			return res;
		}
		res.json({ "error": false, "result": result });
		res.end();
		return res;
	});
});

router.post('/userUpdate', authenticationHelpers.isEslAuth, function (req, res) {
	console.log(req.body,'request!!!!!!!!!!!!!!!!!')
	req.checkBody("data.firstName", "First Name is required.").notEmpty();
	req.checkBody("data.lastName", "Last Name is required.").notEmpty();
	req.checkBody("data.email", "Email address is not valid.").isEmail();
	req.checkBody("data.mobile", "Mobile number must be digit.").isNumeric();

	var errorMsg = '';
	req.getValidationResult().then(function (err) {

		if (!err.isEmpty()) {
			err.array().map(function (elem) {
				errorMsg += elem.msg + "\n";
			});
			errorMsg = errorMsg.trim("\n");
			res.json({ "error": true, "reason": errorMsg });
			return res;
		}
		if (req.body.action == 'edit') {
	console.log(req.body,'request!!!!!!!!!!!!!!!!!81')

			user.userUpdate(req.body, req.session.passport.user.user_id, function (err) {

				if (err) {
					res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
					return res;
				}
				res.json({ "error": false, "reason": "User updated successfully." });
				res.end();
				return res;
			});
		}
	});
});

router.post('/find', authenticationHelpers.isEslAuth, function (req, res) {
	user.userData(req.body, function (err, result) {
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

router.post('/deleteUser', authenticationHelpers.isEslAuth, function (req, res) {
	user.deleteUser(req.body.id, req.session.passport.user.user_id, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		res.json({ "error": false, "reason": "User deleted successfully." });
		res.end();
		return res;
	});
});

router.post('/changePwd', authenticationHelpers.isEslAuth, function (req, res) {
	req.checkBody("data.password", "Password is required.").notEmpty();
	req.checkBody("data.confirmPassword", "Passwords do not match.").equals(req.body.data.password);
	var errorMsg = '';
	req.getValidationResult().then(function (err) {
		if (!err.isEmpty()) {
			err.array().map(function (elem) {
				errorMsg += elem.msg + "\n";
			});
			errorMsg = errorMsg.trim("\n");
			res.json({ "error": true, "reason": errorMsg });
			return res;
		}
		commonfunctionmodel.getPasswordHistory(req.body.id, function (err, result) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			var passwordHistoryAry = [], pwdExists = 0;
			if (null != result['password_history'] && '' != result['password_history']) {
				result['password_history'].forEach(password => {
					if (true == bcrypt.compareSync(req.body.data.password, password)) {
						pwdExists = 1;
					}
					passwordHistoryAry.push(password);
				});
			}
			if (pwdExists) {
				res.json({ "error": true, "reason": "Error: New password must be different from your last 5 passwords!" });
				return res;
			}
			passwordHistoryAry.push(bcrypt.hashSync(req.body.data.password));
			if (passwordHistoryAry.length > 5) passwordHistoryAry.shift();
			user.changePwd(req.body, passwordHistoryAry, function (err) {
				if (err) {
					res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
					return res;
				}
				res.json({ "error": false, "reason": "User password updated successfully." });
				res.end();
				return res;
			});
		});
	});
});

router.post('/companyNamesFromIds', authenticationHelpers.isEslAuth, function (req, res) {
	user.companyNamesFromIds(req.body, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": true, "reason": "No records found." });
			return res;
		}
		res.json({ "error": false, "result": result });
		res.end();
		return res;
	});
});

router.post('/userAlreadyExists', authenticationHelpers.isEslAuth, function (req, res) {
	user.emailOrMobileAlreadyExists(req.body.email, 'email_address', function (err, emailResult) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (emailResult && 'undefined' != typeof emailResult) {
			if (!emailResult['is_active']) {
				res.json({ "error": true, "reason": "This email is currently inactive. Please activate it through confirmation email!" });
				return res;
			}
			if ('contact' == emailResult['user_type']) {
				res.json({ "error": true, "reason": "This email is already associated with other directory user." });
				return res;
			}
			if (emailResult['companies'] != null && emailResult['companies'].hasOwnProperty(req.body.companyId)) {
				res.json({ "error": true, "reason": "User with this email is already added in selected company." });
				return res;
			}
			if (emailResult['partners'] && req.body.userSide == 'partner') {
				res.json({ "error": true, "reason": "User with this email is already added partner." });
				return res;
			}
			res.json({ "error": true, "reason": "This email is already associated with other user!", result: emailResult });
			res.end();
			return res;
		}
		if (!emailResult || 'undefined' == typeof emailResult) {
			user.emailOrMobileAlreadyExists(req.body.mobile, 'mobile_number', function (err, mobileResult) {
				if (mobileResult && 'undefined' != typeof mobileResult) {
					if (!mobileResult['is_active']) {
						res.json({ "error": true, "reason": "This mobile is currently inactive. Please activate it through confirmation email!" });
						res.end();
						return res;
					}
					if ('contact' == mobileResult['user_type']) {
						res.json({ "error": true, "reason": "This mobile is already associated with other directory user." });
						return res;
					}
					if (mobileResult['companies'].hasOwnProperty(req.body.companyId)) {
						res.json({ "error": true, "reason": "User with this mobile is already added in selected company." });
						return res;
					}
					if (mobileResult['partners'] && req.body.userSide == 'partner') {
						res.json({ "error": true, "reason": "User with this email is already added partner." });
						return res;
					}
					res.json({ "error": true, "reason": "This mobile is already associated with other user!", result: mobileResult });
					res.end();
					return res;
				}
				if ('undefined' == typeof emailResult && 'undefined' == typeof mobileResult) {
					res.json({ "error": false, "reason": "No record found!" });
					res.end();
					return res;
				}
			});
		}
	});
});

router.post('/updateCompanyIdForExistingUser', authenticationHelpers.isEslAuth, function (req, res) {
	user.updateCompanyIdForExistingUser(req.body, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		try {
			var htmlObj = {};
			htmlObj['user'] = req.body['firstname'] + ' ' + req.body['lastname'];
			htmlObj['body'] = (req.body['companyName'] && req.body['companyId']) ? '<p>You are receiving this email because you have been added as MARC user in ' + req.body['companyName'] + ' company by ' + req.session.passport.user.firstname + ' ' + req.session.passport.user.lastname + '.</p>' : '<p>You are receiving this email because you have been added as MARC user in ' + req.body['partnerName'] + ' partner by ' + req.session.passport.user.firstname + ' ' + req.session.passport.user.lastname + '.</p>';
			htmlObj['imagePath'] = marcconfig.ANGULARBASEPATH + '/assets/images';
			htmlObj['basePath'] = marcconfig.ANGULARBASEPATH;
			ejs.renderFile(__base + marcconfig.EMAILTEMPLATEPATH + '/email.ejs', htmlObj, function (err, html) {
				var mailOptions = {
					from: marcconfig.SMTPFROMNAME,
					to: req.body['email_address'],
					subject: 'MARC Alert',
					html: html
				};
				mailSettingDetails.sendMail(mailOptions, function (error, info) {
					if (error) {
						res.json({ "error": false, "reason": "Error: User Added email not sent to user!" });
						res.end();
						return res;
					}
					res.json({ "error": false, "reason": "User added successfully." });
					res.end();
					return res;
				});
			});
		} catch (exception) {
			res.json({ "error": false, "reason": "Error: User Added email not sent to user!" });
			res.end();
			return res;
		}
	});
});

router.post('/addUser', authenticationHelpers.isEslAuth, function (req, res) {
	req.checkBody("data.firstName", "First Name is required.").notEmpty();
	req.checkBody("data.lastName", "Last Name is required.").notEmpty();
	req.checkBody("data.email", "Email address is not valid.").isEmail();
	req.checkBody("data.mobile", "Mobile number must be digit.").isNumeric();

	var errorMsg = '';
	req.getValidationResult().then(function (err) {
		if (!err.isEmpty()) {
			err.array().map(function (elem) {
				errorMsg += elem.msg + "\n";
			});
			errorMsg = errorMsg.trim("\n");
			res.json({ "error": true, "reason": errorMsg });
			return res;
		}
		var fieldObj = {};
		var companyFieldsObj = {};
		var partnerFieldsObj = {};
		var mailLink = '';
		if ('Company Admin' == req.body.data.role || 'Company User' == req.body.data.role) {
			companyFieldsObj[req.body.data.companyId] = { 'sequence': req.body.data.sequence, 'role': req.body.data.role };
			mailLink = '/#/confirm/';
		}
		if ('Partner Admin' == req.body.data.role || 'Partner User' == req.body.data.role) {
			partnerFieldsObj[req.body.data.partnerId] = { 'sequence': '0', 'role': req.body.data.role };
			mailLink = '/#/admin/confirm/';
		}
		fieldObj = { "companies": companyFieldsObj, "partners": partnerFieldsObj };
		user.userAdd(req.body.data, fieldObj, req.session.passport.user.user_id, function (err, result) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			if (!result) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			Promise.all([sendEmailToUser(req.body.data, result.toString(), mailLink)]).then(function (result) {
				if (result[0] != 'done') {
					res.json({ "error": false, "reason": "Error: Confirmation email not sent to user!" });
					return res;
				}
				res.json({ "error": false, "reason": "User added successfully and confirmation email sent to user." });
				res.end();
				return res;
			}).catch(error => {
				res.json({ "error": false, "reason": "Error: Confirmation email not sent to user!" });
				return res;
			});
		});
	});
});

function sendEmailToUser(userDetail, userId, mailLink) {
	return new Promise((resolve, reject) => {
		try {
			var baseLink = marcconfig.ANGULARBASEPATH + mailLink;
			var htmlObj = {};
			htmlObj['user'] = userDetail.firstName + ' ' + userDetail.lastName;
			htmlObj['body'] = '<p>You are receiving this email because you have been added as MARC user.<br> Please <a href="' + baseLink + userId + '">click here</a> to confirm your email address and activate account.</p>';
			htmlObj['imagePath'] = marcconfig.ANGULARBASEPATH + '/assets/images';
			htmlObj['basePath'] = marcconfig.ANGULARBASEPATH;
			ejs.renderFile(__base + marcconfig.EMAILTEMPLATEPATH + '/email.ejs', htmlObj, function (err, html) {
				var mailOptions = {
					from: marcconfig.SMTPFROMNAME,
					to: userDetail.email,
					subject: 'MARC email confirmation',
					html: html
				};
				mailSettingDetails.sendMail(mailOptions, function (error, info) {
					if (error) {
						return reject(error);
					}
					return resolve('done');
				});
			});
		} catch (exception) {
			return reject(exception);
		}
	});
}

router.post('/updateUserAuthority', authenticationHelpers.isEslAuth, function (req, res) {
	user.updateUserAuthority(req.body, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		res.json({ "error": false, "reason": "User authority set successfully." });
		res.end();
		return res;
	});
});

module.exports = router;