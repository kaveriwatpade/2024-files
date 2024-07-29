var express = require('express');
var router = express.Router();
var authenticationHelpers = require('../authentication-helpers');
var Promise = require('promise');
var general = require(__base + 'models').general;


router.get('/getUpdateDetails', authenticationHelpers.isClientAuth,function (req, res) {
    params = { query: "select * from updateHistory" };
    general.dbSelect(params, function (err, result) {
        if (err) {
            res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
            return res;
        }
        if (result.length == 0) {
            res.json({ "error": true, "reason": "No records found." });
            return res;
        }
        res.json({ "result": result });
        res.end();
        return res;
    })
})
module.exports = router;
