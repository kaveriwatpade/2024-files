var express = require('express');
var router  = express.Router();
var authenticationHelpers = require('../authentication-helpers');
var fs = require('fs');

router.post('/submit',authenticationHelpers.isEslAuth, function(req, res){
        fs.open(__base+'uploads/localization/locale-'+req.body.language+'.json', 'w', function(err, data) {
                if (err) {
                        res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
                        return res;
                } else {
                        fs.write(data, JSON.stringify(req.body.jsonLanguageFields), 0,  null, function(err) {
                                if (err){
                                        res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
                                        return res; 
                                }

                                fs.close(data, function() {
                                        res.json({"error": false,"reason": "Saved language fields successfully."});
                                        res.end();
                                return res;
                                })
                        });
                }
        });
});
module.exports = router;