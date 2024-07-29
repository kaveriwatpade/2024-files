var express = require('express');
var router = express.Router();
var commonfunction = require(__base + 'models').commonfunction;
var authenticationHelpers = require('../authentication-helpers');

router.post('/countryList', authenticationHelpers.isClientAuth, function (req, res) {
	commonfunction.countryList(function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": true, "reason": "No records found." });
			return res;
		}
		res.json(result);
		res.end();
		return res;
	});
});

router.post('/stateList', authenticationHelpers.isClientAuth, function (req, res) {
	commonfunction.stateList(req.body, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": true, "reason": "No records found." });
			return res;
		}
		res.json(result);
		res.end();
		return res;
	});
});

router.post('/cityList', authenticationHelpers.isClientAuth, function (req, res) {
	commonfunction.cityList(req.body, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": true, "reason": "No records found." });
			return res;
		}
		res.json(result);
		res.end();
		return res;
	});
});

router.post('/getDirectoryUsers', authenticationHelpers.isClientAuth, function (req, res) {
	commonfunction.getDirectoryUsers(req.session.passport.user.company_id, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": true, "reason": "No records found." });
			return res;
		}
		res.json(result);
		res.end();
		return res;
	});
});

router.post('/submitAppSettings', authenticationHelpers.isClientAuth, function (req, res) {
	if (req.body.action == 'add') {
		commonfunction.addApp(req.body, req.session.passport.user, function (err) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			res.json({ "error": false, "reason": "APP added successfully." });
			res.end();
			return res;
		});
	}
	if (req.body.action == 'edit') {
		commonfunction.updateApp(req.body, req.session.passport.user, function (err) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			res.json({ "error": false, "reason": "APP details updated successfully." });
			res.end();
			return res;
		});
	}
	/* * added by piyush for ownership of app transfer to other user  */
	if (req.body.action == 'transfer') {
		commonfunction.updateUserAuthority(req.body, req.session.passport.user, function (err) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			res.json({ "error": false, "reason": "APP details updated successfully." });
			res.end();
			return res;
		});
	}
});

/* * added by piyush for ownership of app transfer to other user  start*/
router.post('/OwnershipOfApp', authenticationHelpers.isClientAuth, function (req, res) {
	commonfunction.OwnershipOfApp(req.body.userId, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		res.json({ "result": result });
		res.end();
		return res;
	});
});
/* * added by piyush for ownership of app transfer to other user  end*/

router.post('/uniqueEmail', authenticationHelpers.isClientAuth, function (req, res) {
	commonfunction.uniqueEmail(req.body, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		res.json({ "result": result });
		res.end();
		return res;
	});
});

router.post('/uniqueMobile', authenticationHelpers.isClientAuth, function (req, res) {
	commonfunction.uniqueMobile(req.body, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		res.json({ "result": result });
		res.end();
		return res;
	});
});

router.post('/getModuleRecipe', authenticationHelpers.isClientAuth, function (req, res, next) {
	commonfunction.getModuleRecipe(req, function (err, result) {
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

router.post('/saveRecipe', authenticationHelpers.isClientAuth, function (req, res, next) {
	commonfunction.saveRecipe(req, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		res.json({ "error": false, "reason": "Recipe saved succesfully." });
		res.end();
		return res;
	});
});

router.post('/resendEmail', authenticationHelpers.isClientAuth, function (req, res) {
	var postData = { email: req.body.email_address, firstName: req.body.firstname, lastName: req.body.lastname };
	commonfunction.resendEmail(postData, req.body.user_id, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Confirmation email not sent to user!" });
			return res;
		}
		res.json({ "error": false, "reason": "Confirmation email sent to the user." });
		res.end();
		return res;
	});
});

module.exports = router;