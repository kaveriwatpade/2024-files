/**
 * Import modules
 */
var express = require('express');
var router = express.Router();

// Import all other route modules
var clientRoutes = require('./client/client-routes.js');
var eslRoutes = require('./esl/esl-routes.js');
var adminRoutes = require('./admin/admin-routes.js');
var solarRoutes = require('./solar/solar-routes.js');
var rochemRoutes = require('./rochem/rochem-routes.js');

router.use(function (request, response, next) {
  var origin = request.headers.origin;
  if (marcconfig.ALLOWORIGINS.indexOf(origin) > -1) {
    response.setHeader('Access-Control-Allow-Origin', origin);
  }
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Requested-With');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,HEAD,DELETE,OPTIONS');
  response.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

/**
 * Make sure the "use" of any other route modules comes before
 * any index route definitions, aka route definitions from root '/'
 */
router.use('/esl', eslRoutes);
router.use('/admin', adminRoutes);
router.use('/solar', solarRoutes);
router.use('/rochem', rochemRoutes);
router.use('/', clientRoutes);

/* GET home page. */
/* Purest route */

// router.get('/', function(req, res, next) {
//   res.json({"apiRoot": true});
// });

router.get(marcconfig.NODEJSPORTNAME, function (req, res, next) {
  res.json({ "apiRoot": true });
});

module.exports = router;