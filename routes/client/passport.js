var db = require(__base + 'models');
var passport = require('passport');
var bcrypt = require('bcrypt-nodejs');
var LocalStrategy = require('passport-local').Strategy;

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (obj, done) {
  done(null, obj);
});


// Configure the local strategy for use by Passport.
//
// The local strategy require a `verify` function which receives the credentials
// (`username` and `password`) submitted by the user.  The function must verify
// that the password is correct and then invoke `cb` with a user object, which
// will be set at `req.user` in route handlers after authentication.
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    session: false,
    passReqToCallback: true
  },
  function (req, email, password, done) {
    db.user.findByEmailAddressDb(email, req.body.companyId, req.body.companyObj,req.body.fcm_key, function (err, user) {
      if (err) { return done(err); }
      if (!user) { return done(null, false); }
      if (!isValidClientRole(user)) { return done(null, false); }
      if (!req.body.switchToUser && !req.body.switchToCompany) if (!isValidPassword(user, password)) { return done(null, false); }
      delete user['password']; // Removes json.password from user.
      user.loginFrom = 'client';
      user.parameters = [];
      user.nodeObj = {};
      user.name = user.firstname + ' ' + user.lastname;
      user.switchToUser = req.body.switchToUser ? req.body.switchToUser : false;
      user.switchFrom = req.body.switchFrom ? req.body.switchFrom : '';
      user.switchToCompany = req.body.switchToCompany ? req.body.switchToCompany : false;
      user.favorite_node_ids = ('' == user.favorite_node_ids || null == user.favorite_node_ids) ? [] : user.favorite_node_ids;
      user.mod_permission = ('' == user.mod_permission || null == user.mod_permission) ? '' : user.mod_permission;
      user.languageName = getUserLanguage(user.language);
      user.currencyName = getUserCurrency(user.currency);
      Promise.all([
        new Promise((resolve, reject) => {
          // Add node parameters details in session
          db.user.nodeParameters(function (err, result) {
            if (!err && result) {
              arrParameter = {};
              result.forEach(function (parameter, k) {
                arrParameter[parameter.secondary_parameter_id] = parameter;
              });
              user.parameters = arrParameter;
              return resolve(arrParameter);
            }
            return reject(null);
          })
        }),
        new Promise((resolve, reject) => {
          // Add node parameters details in session
          db.node.getMultiplyingFactorSetting(req.body.companyId, function (err, nodeResult) {
            if (!err && nodeResult) {
              var nodeObj = {};
              for(var nodeIndex in nodeResult){
               nodeObj[nodeResult[nodeIndex]['node_unique_id']] = nodeResult[nodeIndex]['data_settings'];
              }
              return resolve(nodeObj);
            }
            return reject(null);
          })
        })
      ]).then(function (result) {
        user.parameters = result[0];
        user.nodeObj = result[1];
        return done(null, user);
      }).catch(error => {});
    });
  }
));

passport.use('solarlogin', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    session: false,
    passReqToCallback: true
  },
  function (req, email, password, done) {
    db.user.findByEmailAddressDb(email, req.body.companyId, req.body.companyObj,'', function (err, user) {
      if (err) { return done(err); }
      if (!user) { return done(null, false); }
      if (!isValidClientRole(user)) { return done(null, false); }
      if (!req.body.switchToCompany) if (!isValidPassword(user, password)) { return done(null, false); }
      delete user['password']; // Removes json.password from user.
      user.loginFrom = 'solar';
      user.name = user.firstname + ' ' + user.lastname;
      user.switchToCompany = req.body.switchToCompany ? req.body.switchToCompany : false;
      user.languageName = getUserLanguage(user.language);
      user.currencyName = getUserCurrency(user.currency);
      // Add node parameters details in session
      db.user.nodeParameters(function (err, result) {
        if (!err && result) {
          arrParameter = {};
          result.forEach(function (parameter, k) {
            arrParameter[parameter.secondary_parameter_id] = parameter;
          });
          user.parameters = arrParameter;
        }
        return done(null, user);
      });
    });
  }
));

passport.use('partnerclientlogin', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    session: false,
    passReqToCallback: true
  },
  function (req, email, password, done) {
    db.user.findByEmailAddressDb(email, req.body.companyId, req.body.companyObj,'', function (err, user) {
      if (err) { return done(err); }
      if (!user) { return done(null, false); }
      if (!isValidClientRole(user)) { return done(null, false); }
      if (!req.body.switchToCompany) if (!isValidPassword(user, password)) { return done(null, false); }
      delete user['password']; // Removes json.password from user.
      user.loginFrom = 'rochem';
      user.name = user.firstname + ' ' + user.lastname;
      user.switchToCompany = req.body.switchToCompany ? req.body.switchToCompany : false;
      user.languageName = getUserLanguage(user.language);
      user.currencyName = getUserCurrency(user.currency);
      // Add node parameters details in session
      Promise.all([
        new Promise((resolve, reject) => {
          // Add node parameters details in session
          db.user.nodeParameters(function (err, result) {
            if (!err && result) {
              arrParameter = {};
              result.forEach(function (parameter, k) {
                arrParameter[parameter.secondary_parameter_id] = parameter;
              });
              user.parameters = arrParameter;
              return resolve(arrParameter);
            }
            return reject(null);
          })
        })
      ]).then(function (result) {
        user.parameters = result[0];
        return done(null, user);
      }).catch(error => { });
    });
  }
));

passport.use('esllogin', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    session: false,
    passReqToCallback: true
  },
  function (req, email, password, done) {
    db.user.findESLAdminByEmailAddressDb(email, function (err, user) {
      if (err) { return done(err); }
      if (!user) { return done(null, false); }
      if (!isValidEslAdminRole(user)) { return done(null, false); }
      if (!req.body.switchToAdmin) if (!isValidPassword(user, password)) { return done(null, false); }
      delete user['password']; // Removes json.password from user.
      user.loginFrom = 'esl';
      user.name = user.firstname + ' ' + user.lastname;
      user.languageName = getUserLanguage(user.language);
      user.currencyName = getUserCurrency(user.currency);
      return done(null, user);
    });
  }
));

passport.use('adminlogin', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    session: false,
    passReqToCallback: true
  },
  function (req, email, password, done) {
    db.user.findPartnerByEmailAddressDb(email, function (err, user) {
      if (err) { return done(err); }
      if (!user) { return done(null, false); }
      if (!isValidPartnerRole(user)) { return done(null, false); }
      if (!req.body.switchToAdmin) if (!isValidPassword(user, password)) { return done(null, false); }
      delete user['password']; // Removes json.password from user.
      user.loginFrom = 'admin';
      user.name = user.firstname + ' ' + user.lastname;
      user.languageName = getUserLanguage(user.language);
      user.currencyName = getUserCurrency(user.currency);
      return done(null, user);
    });
  }
));

var isValidPassword = function (user, password) {
  return bcrypt.compareSync(password, user.password);
}

var isValidClientRole = function (user) {
  return ('' != user.role_name && 'ESL Admin' != user.role_name) ? true : false;
}

var isValidEslAdminRole = function (user) {
  return ('ESL Admin' == user.role_name) ? true : false;
}

var isValidPartnerRole = function(user){
  return ('Partner Admin' == user.role_name) ? true : false;
}

var getUserLanguage = function (language) {
  var languageObj = { 'en': 'English', 'de': 'German', 'pl': 'Polish', 'ru': 'Russian', 'fr': 'French', 'es': 'Spanish', 'ar': 'Arabic', 'hi': 'Hindi', 'ja': 'Japanese', 'num': 'Number' };
  return languageObj[language];
}

var getUserCurrency = function (currency){
  var currencyObj = {'rupees':'INR','dollar':'USD','euro':'EUR','gbp':'GBP','pln':'PLN'};
  return (currency) ? currencyObj[currency] : 'INR';
}