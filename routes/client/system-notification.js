var express = require('express');
var router  = express.Router();
var systemNotification = require(__base + 'models').systemNotification;
var authenticationHelpers = require('../authentication-helpers');
var bcrypt = require('bcrypt-nodejs');
var commonfunction = require(__base + 'models').commonfunction;
var momentTimezone = require('moment-timezone');

router.post('/getSystemNotificationsFromDB', authenticationHelpers.isClientAuth, function(req, res){
	var data = {};
	data.companyId = req.session.passport.user.company_id;
	data.userId = req.session.passport.user.user_id;
	data.limit = req.body.limit;
	data.flagAry = req.body.flagAry;
	commonfunction.getSystemNotificationFromPushEvents(data,function(err, result){
		systemNotification.getLogsCount(req.session.passport.user,req.body.flagAry,function(error, countResult){
			if (error || !countResult) {  
				res.json({}); 
				return res; 
			}else{
				var sysNotificationObj = {};
				sysNotificationObj['systemNotification'] = result;
				sysNotificationObj['count'] = countResult.count;
				res.json(sysNotificationObj);
				res.end();
				return res;
			}
		});
	});
});

router.post('/updateIsSeenStaus', authenticationHelpers.isClientAuth, function(req, res) {
	systemNotification.updateIsSeenStaus(req.body.data, function(err){
		if (err) { 
			res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
		if (!result) {  
			res.json({"error" : true,"reason": "No records found."}); 
			return res; 
		}
		res.json({"error": false,"reason": "Notifications has been marked as read."});
		res.end();
		return res;
	});
});

router.post('/getNotificationsList', authenticationHelpers.isClientAuth, function(req, res){
	systemNotification.getNotificationsList(req.session.passport.user,req.body.flagAry,req.body.dateTime,req.body.limit,function(err, result){
		if (err) { 
			res.json({"error" : true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
        if (!result) {  
			res.json({"error" : true,"reason": "No records found."}); 
			return res; 
		}
		res.json({result:result});
		res.end();
		return res;
	});
});

router.post('/markAllNotificationsAsSeen', authenticationHelpers.isClientAuth, function(req, res) {
	systemNotification.markAllNotificationsAsSeen(req.session.passport.user,req.body,function(err,result){
		if (err) { 
			res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
		res.json({"error": false,"reason": "All notifications has been marked as read.","result":result});
		res.end();
		return res;
	});
});

module.exports = router;