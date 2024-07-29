var express	               = require('express');
var router                = express.Router();
var passport              = require('passport');
var authenticationHelpers = require('../authentication-helpers');
var nodemake   =  require('./node-make');
var nodemodel   =  require('./node-model');
var partner   =  require('./partner');
var company   =  require('./company');
var parameter   =  require('./parameter');
var user = require('./user');
var profile = require('./profile');
var dbUser = require(__base + 'models').user;
var help = require('./help');
var commonfunction = require('./common-function');
var languageRoute = require('./language');
var nodeIdSearch = require('./nodeIdSearch');
var newfeature = require('./newfeature');
var mailBlock = require('./mailBlock');


/* GET logout page. */
router.get('/logout', authenticationHelpers.isEslAuth, function(req, res, next) {
  req.logout();
  res.json({"loggedOut": req.isAuthenticated()});
});

router.get('/authenticated', authenticationHelpers.isEslAuth, function(req, res, next) {
  res.json({"authenticated": true});
});

router.use('/nodemake', nodemake);
router.use('/nodemodel', nodemodel);
router.use('/partner', partner);
router.use('/company', company);
router.use('/parameter', parameter);
router.use('/user', user);
router.use('/profile', profile);
router.use('/help', help);
router.use('/commonfunction', commonfunction);
router.use('/language', languageRoute);
router.use('/nodeIdSearch', nodeIdSearch)
router.use('/newfeature',newfeature);
router.use('/mailBlock', mailBlock);
 
router.post('/login', function(req, response) {
  passport.authenticate('esllogin', function (error, user, info) {
    if (error) {
      response.json({ "is_authenticated": false, "reason": "Error: Something went wrong. Please try again!" });
      return response;
    }
    if (!user) {
      response.json({ "is_authenticated": false, "reason": "Invalid Credentials. Please try again." });
      return response;
    }
    req.logIn(user, function (error) {
      if (error) {
        response.json({ "is_authenticated": false, "reason": "Invalid Credentials. Please try again." });
        return;
      }
      response.json({ "is_authenticated": true, "reason": "Valid Credentials.", "current_user": user });
      response.end();
      return response;
    });
  })(req, response);
});

router.post('/switchToUser', function(req, response, next) {
  dbUser.findUserByCompanyId(req.body,function(err, result){
    
		if (err) { 
			response.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
			return response;
		}
		if (!result) { 
			response.json({"error": true,"reason": "Error: User(s) is not yet added having company admin as role in this company!"}); 
			return response;
    }
    req.logout();
    req.body.email = result.email_address;
    req.body.password = result.password;
    req.body.firstname = result.firstname;
 

    var companyObj = {};
    companyObj[req.body.companyId] = {company_id:req.body.companyId,company_name:req.body.companyName,role_name:result.companies[req.body.companyId]['role'],logo:req.body.companyLogo,email_address:req.body.email_address,password:req.body.password,firstname:req.body.firstname,menu:req.body.menu};
    req.body.companyObj = companyObj;
    req.body.switchToUser = true;
    req.body.switchFrom = 'esl';
    passport.authenticate('local', function (error, user, info) {
      if (error) {
        response.json({ "is_authenticated": false, "reason": "Error: Something went wrong. Please try again!" });
        return response;
      }
      if (!user) {
        response.json({ "is_authenticated": false, "reason": "Invalid Credentials. Please try again." });
        return response;
      }
      req.logIn(user, function (error) {
        if (error) {
          response.json({ "is_authenticated": false, "reason": "Invalid Credentials. Please try again." });
          return;
        }
        response.json({ "is_authenticated": true, "reason": "Valid Credentials.", "current_user": user });
        response.end();
        return response;
      });
    })(req, response);
	});
});

module.exports = router;

 
 
