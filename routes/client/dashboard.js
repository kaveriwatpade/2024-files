var express = require('express');
var router = express.Router();
var dashboard = require(__base + 'models').dashboard;
var authenticationHelpers = require('../authentication-helpers');
var commonfunction = require(__base + 'models').commonfunction;


router.post('/dashboardList', authenticationHelpers.isClientAuth, function (req, res) {
	dashboard.dashboardList(req.session.passport.user, function (err, dashboardResult) {
		// console.log(dashboardResult,'dashboardResult');
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		commonfunction.AllappList(req.session.passport.user, dashboardResult, 'dashboard', function (err, data) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			if (!data) {
				res.json({ "error": true, "reason": "No records found." });
				return res;
			}

			var dashboardAry = [];
			var dashboardObj = {};
			dashboardObj = data.dashboardObj
			dashboardAry = data.appdataAry
			var slideShowdashboardAry = []
			var slideShowdashboardObj = {}
			for (var i = 0; i < dashboardResult.length; i++) {
				var editable = (req.session.passport.user.company_id == dashboardResult[i].company_id && req.session.passport.user.user_id == dashboardResult[i].user_id) ? true : false;
				slideShowdashboardAry.push({ 'companyId': dashboardResult[i].company_id, 'userId': dashboardResult[i].user_id, 'dashboardId': dashboardResult[i].dashboard_id, 'dashboardName': dashboardResult[i].dashboard_name, 'dashboardType': dashboardResult[i].type, 'dashboardAddedDateTime': dashboardResult[i].added_datetime, 'editable': editable });
				slideShowdashboardObj[dashboardResult[i].dashboard_id] = { 'companyId': dashboardResult[i].company_id, 'userId': dashboardResult[i].user_id, 'dashboardName': dashboardResult[i].dashboard_name, 'dashboardType': dashboardResult[i].type, 'dashboardAddedDateTime': dashboardResult[i].added_datetime, 'editable': editable };
			}
			res.json({ "dashboardAry": dashboardAry, "dashboardObj": dashboardObj, "slideShowdashboardAry": slideShowdashboardAry, "slideShowdashboardObj": slideShowdashboardObj });
			res.end();
			return res;
		});
	});
});

router.post('/submit', authenticationHelpers.isClientAuth, function (req, res) {
	if (req.body.action == 'add' || req.body.action == 'edit') {
		req.checkBody("formData.dashboardName", "Dashboard name must be atleast 3 characters.").isLength(3);
		req.checkBody("formData.dashboardType", "Dashboard type is required.").notEmpty();
		var errorMsg = '';
		req.getValidationResult().then(function (errors) {
			if (!errors.isEmpty()) {
				errors.array().map(function (elem) {
					errorMsg += elem.msg + "\n";
				});
				errorMsg = errorMsg.trim("\n");
				res.json({ "error": true, "reason": errorMsg });
				res.end();
				return res;
			}
			if (req.body.action == 'add') {
				dashboard.add(req.body, req.session.passport.user, function (err) {

					if (err) {

						res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
						return res;
					}
					res.json({ "error": false, "reason": "Dashboard added successfully." });
					res.end();
					return res;
				});
			}
			if (req.body.action == 'edit') {
				dashboard.edit(req.body, function (err) {
					if (err) {
						res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
						return res;
					}
					res.json({ "error": false, "reason": "Dashboard settings updated successfully." });
					res.end();
					return res;
				});
			}
		});
	}
	if (req.body.action == 'transfer') {
		dashboard.transfer_dashboard(req.body, req.session.passport.user, function (err) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			dashboard.transfer_widget(req.body, req.session.passport.user, function (err) {
				if (err) {
					res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
					return res;
				}
			});
			res.json({ "error": false, "reason": "Dashboard ownership transfered successfully!" });
			res.end();
			return res;

			// res.json({ "error": false, "reason": "Dashboard ownership transfered successfully!" });
			// res.end();
			// return res;
		});
	}
});

router.post('/uniqueName', authenticationHelpers.isClientAuth, function (req, res) {
	dashboard.uniqueName(req.body, req.session.passport.user, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		res.json({ "result": result });
		res.end();
		return res;
	});
});

router.post('/delete', authenticationHelpers.isClientAuth, function (req, res) {
	dashboard.delete(req.body.id, function (err) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (req.body.widgetIdAry.length == 0) {
			res.json({ "error": false, "reason": "Dashboard deleted successfully." });
			res.end();
			return res;
		}
		if (req.body.widgetIdAry.length > 0) {
			dashboard.deleteWidget(req.body.widgetIdAry, function (error) {
				if (error) {
					res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
					return res;
				}
				res.json({ "error": false, "reason": "Dashboard deleted successfully." });
				res.end();
				return res;
			});
		}
	});
});

router.post('/dashboardWidgetList', authenticationHelpers.isClientAuth, function (req, res) {
	dashboard.dashboardWidgetList(req.body.id, req.session.passport.user, function (err, result) {
		console.log(result,'result');
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (result.length == 0) {
			res.json({ "error": true, "reason": "No records found." });
			return res;
		}
		res.json({ "error": false, "reason": "Dashboard widget list.", "result": result });
		res.end();
		return res;
	});
});

router.post('/addWidget', authenticationHelpers.isClientAuth, function (req, res) {
	dashboard.addWidget(req.body, req.session.passport.user, function (err, widgetId) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		res.json({ "error": false, "reason": "Widget added successfully.", "result": widgetId });
		res.end();
		return res;
	});
});

router.post('/updateWidget', authenticationHelpers.isClientAuth, function (req, res) {
	dashboard.updateWidget(req.body, function (err) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		res.json({ "error": false, "reason": "Widget updated successfully." });
		res.end();
		return res;
	});
});

router.post('/saveWidgetState', authenticationHelpers.isClientAuth, function (req, res) {
	dashboard.saveWidgetState(req.body, function (err) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		res.json({ "error": false, "reason": "Widgets state saved successfully." });
		res.end();
		return res;
	});
});

router.post('/deleteWidget', authenticationHelpers.isClientAuth, function (req, res) {
	dashboard.deleteWidget(req.body, function (err) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		res.json({ "error": false, "reason": "Widget deleted successfully." });
		res.end();
		return res;
	});
});

module.exports = router;