var express = require('express');
var router = express.Router();
var authenticationHelpers = require('../authentication-helpers');
var newfeature = require(__base + 'models').newfeature;

router.post('/insertUpdateDetails', authenticationHelpers.isEslAuth, function (req, res) {
    newfeature.insertUpdateDetails(req, function (err, result) {
        if (err) {
            res.json({ "error": true, "reason": "record not added." });
            return res;
        }
        res.json({ "result": result, "reason": "record added" });
        res.end();
        return res;
    })
})

router.get('/getUpdateDetails', authenticationHelpers.isEslAuth, function (req, res) {
    newfeature.getUpdateDetails(req, function (err, result) {
        if (err) {
            res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
            return res;
        }
        res.json({ "result": result });
        res.end();
        return res;
    })
})

router.post('/editUpdateDetalis', authenticationHelpers.isEslAuth, function (req, res) {
    newfeature.editUpdateDetalis(req, function (err, result) {
        if (err) {
            res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
            return res;
        }
        res.json({ "result": result, "reason": "Record Edited Added." });
        res.end();
        return res;
    })
})


router.post('/deleteUpdatedetails', authenticationHelpers.isEslAuth, function (req, res) {
    newfeature.deleteUpdatedetails(req.body.data.id, function (err, result) {
        if (err) {
            res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
            res.end();
            return res;
        }
        else {
            res.json({ "error": false, "reason": "Deleted successfully" });
            res.end();
            return res;
        }
    });
});
module.exports = router;