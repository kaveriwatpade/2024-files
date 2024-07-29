var express = require('express');
var router = express.Router();
var authenticationHelpers = require('../authentication-helpers');
var common = require(__base + 'routes/rochemCommon');


router.post('/rochemNodedata', authenticationHelpers.isClientAuth, function (req, res, next) {
  try {
    var isInstantaneous = parseInt(req.body.isinstantaneous);
    var interval = ('proccessdata' == req.body.interval || 'all' == req.body.interval || 'realtime' == req.body.interval) ? req.body.interval : ((1 === isInstantaneous) ? 'instantaneous' + req.body.interval : 'cummulative' + req.body.interval);
    switch (interval) {
      case 'cummulativefifteen': common.getCummulativeFifteenMinutesData(req, function (error, data) {
        res.json(data);
        res.end();
        return res;
      });
        break;
      case 'cummulativehourly': common.getCummulativeHourlyData(req, function (error, data) {
        res.json(data);
        res.end();
        return res;
      });
        break;
      case 'cummulativedaily': common.getCummulativeDailyData(req, function (error, data) {
        res.json(data);
        res.end();
        return res;
      });
        break;
      case 'cummulativeweekly': common.getCummulativeWeeklyData(req, function (error, data) {
        res.json(data);
        res.end();
        return res;
      });
        break;
      case 'cummulativemonthly': common.getCummulativeMonthlyData(req, function (error, data) {
        res.json(data);
        res.end();
        return res;
      });
        break;
      case 'cummulativeyearly': common.getCummulativeYearlyData(req, function (error, data) {
        res.json(data);
        res.end();
        return res;
      });
        break;
      case 'instantaneousfifteen': common.getInstantaneousFifteenMinutesData(req, function (error, data) {
        res.json(data);
        res.end();
        return res;
      });
        break;
      case 'instantaneoushourly': common.getInstantaneousHourlyData(req, function (error, data) {
        res.json(data);
        res.end();
        return res;
      });
        break;
      case 'instantaneousdaily': common.getInstantaneousDailyData(req, function (error, data) {
        res.json(data);
        res.end();
        return res;
      });
        break;
      case 'instantaneousweekly': common.getInstantaneousWeeklyData(req, function (error, data) {
        res.json(data);
        res.end();
        return res;
      });
        break;
      case 'instantaneousmonthly': common.getInstantaneousMonthlyData(req, function (error, data) {
        res.json(data);
        res.end();
        return res;
      });
        break;
      case 'instantaneousyearly': common.getInstantaneousYearlyData(req, function (error, data) {
        res.json(data);
        res.end();
        return res;
      });
        break;
      case 'all': common.getRawData(req, function (error, data) {
        res.json(data);
        res.end();
        return res;
      });
        break;
      case 'realtime': common.getRealtimeData(req, function (error, data) {
        res.json(data);
        res.end();
        return res;
      });
        break;
      case 'proccessdata': common.getProcessedRawData(req, function (error, result) {
        res.json(result);
        res.end();
        return res;
      });
        break;
      case 'default':
        res.json({ data: {} });
        res.end();
        return res;
    }
  } catch (exception) {
    console.log('exception1 here',exception)
    res.json({ error: true, reason: "Error: Unable to get data. Please try again!" });
    res.end();
    return res;
  }
});


module.exports = router;