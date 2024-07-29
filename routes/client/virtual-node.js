var express = require('express');
var router = express.Router();
var dbVirtualNode = require(__base + 'models').dbVirtualNode;
var authenticationHelpers = require('../authentication-helpers');
var Promise = require('promise');


router.post('/submitEquation', authenticationHelpers.isClientAuth, function (req, res) {
    if (req.body.action == 'add') {
        dbVirtualNode.submitEquation(req.body,req.session.passport.user.user_id,req.session.passport.user.company_id, function (err, result) {
            if(err) { 
                res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
                return res;
            }
            res.json({"error" : false,"reason":"Equation added successfully."}); 
            res.end();
            return res;
        })
    }
});

//API call for equation listing new equation builder like alarms and notifications
router.post('/equationList', authenticationHelpers.isClientAuth, function (req, res) {
	dbVirtualNode.equationList(req.session.passport.user, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": true, "reason": "No records found.","result": [] });
			return res;
		}
		res.json({ "error": false, "result": result });
		res.end();
		return res;
	});
});

//API call to submit data of equation like new equation builder like alarms and notifications
router.post('/submitEquationData', authenticationHelpers.isClientAuth, function (req, res) {
	if (req.body.action == 'add') {
		dbVirtualNode.addEquation(req.body, req.session.passport.user, function (err) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
            }
            res.json({"error" : false,"reason":"Equation added successfully."}); 
            res.end();
            return res;
		});
	}

	if (req.body.action == 'edit') {
		dbVirtualNode.updateEquation(req.body, req.session.passport.user, function (err) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
            }
            res.json({"error" : false,"reason":"Equation updated successfully."}); 
            res.end();
            return res;
		});
	}

	if (req.body.action == 'delete') {
		dbVirtualNode.deleteEquation(req.body, req.session.passport.user, function (err) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
            }
            res.json({"error" : false,"reason":"Equation deleted successfully."}); 
            res.end();
            return res;
		});
	}
});

router.post('/equationsList', authenticationHelpers.isClientAuth, function(req,res) {
    dbVirtualNode.equationsList(function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
        }
        if (result.length == 0) {
			res.json({ "error": true, "reason": "No records found!" });
			return res;
		}
		res.json({ "error": false, "result": result });
		res.end();
		return res;
	});
})

router.post('/deleteEquation', authenticationHelpers.isClientAuth,function(req,res){
    dbVirtualNode.deleteEquation(req.body,function (err, result) {
        if (err) {
            res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
            return res;
        }
        res.json({ "error": false, "reason": "Equation deleted successfully." });
        res.end();
        return res;
    })
});

router.post('/getEquationsList', authenticationHelpers.isClientAuth,function(req,res){
    dbVirtualNode.getEquationsList(req.session.passport.user.company_id,function(err,result){
        if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
        }
        if (result.length == 0) {
			res.json({ "error": true, "reason": "No records found!" });
			return res;
		}
		res.json({ "error": false, "result": result });
		res.end();
		return res;
    })
})

module.exports = router;