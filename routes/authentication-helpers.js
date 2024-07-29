/**
 * Authentication helpers to determine if a user is logged in or not
 * before a route returns information to the response
 */
function isAuth(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.json({"authenticated": false});
}

function isEslAuth(req, res, next) {
  if (req.isAuthenticated()) { 
    if('ESL Admin' == req.session.passport.user.role_name){
      return next(); 
    }
  }
  res.json({"authenticated": false});
}

function isClientAuth(req, res, next) {
  if (req.isAuthenticated()) { 
    if('Company Admin' == req.session.passport.user.role_name || 'Company User' == req.session.passport.user.role_name){
      return next(); 
    }
  }
  res.json({"authenticated": false});
}

function isAdminAuth(req, res, next) {
  if (req.isAuthenticated()) { 
    if('Partner Admin' == req.session.passport.user.role_name){
      return next(); 
    }
  }
  res.json({"authenticated": false});
}

function isNotAuth(req, res, next) {
  if (!req.isAuthenticated()) { return next(); }
  res.json({"authenticated": true});
}

module.exports = {
  isAuth              : isAuth,
  isNotAuth           : isNotAuth,
  isClientAuth        : isClientAuth,
  isEslAuth           : isEslAuth,
  isAdminAuth         : isAdminAuth
}