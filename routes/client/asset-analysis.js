var express = require('express');
var router = express.Router();
var assetanalysis = require('../../models').assetanalysis;
var authenticationHelpers = require('../authentication-helpers');
var Promise = require('promise');
var momentTimezone = require('moment-timezone');
var lodash = require('lodash');
var common = require(__base + 'routes/common');
var rochemCommon = require(__base + 'routes/rochemCommon');
var general = require(__base + 'models').general;
var kafka = require('kafka-node');
var OpenWeatherMapHelper = require('./openweathermap');
var commonfunction = require('../../models').commonfunction;
var _ = require('underscore');
var moment = require('moment');


///  Added by Arjun

const tempfile = require('tempfile');

var fs = require('fs');

var fonts = {
  Roboto: {
    normal: './assets/fonts/Roboto-Regular.ttf',
    bold: './assets/fonts/Roboto-Medium.ttf',
    italics: './assets/fonts/Roboto-Italic.ttf',
    bolditalics: './assets/fonts/Roboto-MediumItalic.ttf'
  }
};

var PdfPrinter = require('pdfmake/src/printer');

var printer = new PdfPrinter(fonts);

//////////////


const weather = new OpenWeatherMapHelper(
  {
    APPID: marcconfig.OPENWEATHERAPPID,
    units: marcconfig.OPENWEATHERUNITS
  }
);
const request = require("request");
var SparkAPIHelper = require('./sparkapi');
const { type } = require('os');
const sparkAPI = new SparkAPIHelper();
router.post('/list', authenticationHelpers.isClientAuth, function (req, res) {
  //console.log(req.session.passport.user.company_id, '26!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!1111111111111111111111');
  assetanalysis.list(req.session.passport.user.company_id, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    if (!result || result.length == 0) {
      res.json({ "error": true, "reason": "No records found." });
      return res;
    }
    var solarPlantAry = [];
    var resultIndex = 0;

    commonfunction.AllappList(req.session.passport.user, result, 'solar', function (err, data) {
      if (err) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      if (!data) {
        res.json({ "error": true, "reason": "No records found." });
        return res;
      }
      solarPlantAry = data;
      solarPlantAry.forEach(function (plantData, index) {
        solarPlantAry[index]['noOfInverters'] = 0;
        solarPlantAry[index]['weather'] = {};
        solarPlantAry[index]['inverterImg'] = '/assets/images/apps/inverter.png';
        solarPlantAry[index]['defaultRealtimeParameters'] = { DCParameterAry: [75, 76, 77], ACParameterAry: [1, 2, 3, 4, 5, 6, 32, 84] };
        solarPlantAry[index]['defaultAnalyticsParameters'] = [{ name: 'Wind Speed', value: '107' }, { name: 'Irradiation', value: '106' }, { name: 'Panel Temperature', value: '105' }, { name: 'Ambient Temperature', value: '104' }, { name: 'Energy Generated', value: '37' }, { name: 'Power', value: '27' }];
        solarPlantAry[index]['defaultAnalyticsSetting'] = { interval: 'fifteen', parameter: ['37'], chartType: 'bar', duration: 'Today', dateRange: '' };
        solarPlantAry[index]['totalStrings'] = 0;
        solarPlantAry[index]['activeArea'] = 0;
        solarPlantAry[index]['activeMppt'] = 0;
        solarPlantAry[index]['activePVModule'] = 0;
        solarPlantAry[index]['gridCode'] = '';
        solarPlantAry[index]['todayConsumption'] = (0).toFixed(2);
        solarPlantAry[index]['yesterdayConsumption'] = (0).toFixed(2);
        solarPlantAry[index]['co2Avoided'] = (0).toFixed(2);
        solarPlantAry[index]['totalINRSaved'] = (0).toFixed(2);
        // solarPlantAry[index]['totalKWh'] = 0;
        solarPlantAry[index]['language'] = req.session.passport.user.language;
        var inverterPanelSettingObj = plantData['inverter_panel_setting'] ? JSON.parse(plantData['inverter_panel_setting']) : {};
        if (null == plantData.inverter_panel_setting || Object.keys(inverterPanelSettingObj).length == 0) {
          if (plantData.latitude && plantData.longitude) {
            Promise.all([getCurrentWeatherData(plantData.latitude, plantData.longitude)]).then(function (promiseResult) {
              solarPlantAry[index]['weather'] = promiseResult[0];
              resultIndex++;

              if (solarPlantAry.length == resultIndex) {
                res.json({ "result": solarPlantAry });
                res.end();
                return res;
              }
            });
          }
          else {
            resultIndex++;
            if (solarPlantAry.length == resultIndex) {
              res.json({ "result": solarPlantAry });
              res.end();
              // return res;
            }
          }
        }
        if (null != plantData.inverter_panel_setting && Object.keys(inverterPanelSettingObj).length > 0) {
          var otherSettingObj = JSON.parse(plantData['other_setting']);
          var promiseAry = [];
          var dataPromiseAry = [];
          var totalStrings = 0, activeArea = 0, activeMppt = 0, activePVModule = 0, gridCode;
          var nodeIds = [];
          solarPlantAry[index]['noOfInverters'] = Object.keys(inverterPanelSettingObj).length;
          for (var settingIndex in inverterPanelSettingObj) {

            inverterPanelSettingObj[settingIndex]['numberMPPT'] = (!inverterPanelSettingObj[settingIndex]['numberMPPT'] || inverterPanelSettingObj[settingIndex]['numberMPPT'] == '') ? 0 : inverterPanelSettingObj[settingIndex]['numberMPPT'];
            inverterPanelSettingObj[settingIndex]['pvModules'] = (!inverterPanelSettingObj[settingIndex]['pvModules'] || inverterPanelSettingObj[settingIndex]['pvModules'] == '') ? 0 : inverterPanelSettingObj[settingIndex]['pvModules'];
            inverterPanelSettingObj[settingIndex]['activeSurfaceArea'] = (!inverterPanelSettingObj[settingIndex]['activeSurfaceArea'] || inverterPanelSettingObj[settingIndex]['activeSurfaceArea'] == '') ? 0 : inverterPanelSettingObj[settingIndex]['activeSurfaceArea'];


            nodeIds.push(inverterPanelSettingObj[settingIndex]['node']);
            totalStrings += parseFloat(inverterPanelSettingObj[settingIndex]['numberPerMPPT']);
            activeArea += parseFloat(inverterPanelSettingObj[settingIndex]['activeSurfaceArea']);
            //  activeMppt += parseFloat(inverterPanelSettingObj[settingIndex]['numberMPPT']);
            activeMppt += parseInt(inverterPanelSettingObj[settingIndex]['numberMPPT']);

            // activeMppt += parseFloat(inverterPanelSettingObj[settingIndex]['numberMPPT']);
            //  activePVModule += parseFloat(inverterPanelSettingObj[settingIndex]['pvModules']);
            activePVModule += parseInt(inverterPanelSettingObj[settingIndex]['pvModules']);

            gridCode = inverterPanelSettingObj[settingIndex]['gridCode'];
          }
          solarPlantAry[index]['totalStrings'] = totalStrings;
          solarPlantAry[index]['activeArea'] = activeArea.toFixed(3);
          // solarPlantAry[index]['activeMppt'] = activeMppt.toFixed(3);
          solarPlantAry[index]['activeMppt'] = activeMppt;
          solarPlantAry[index]['activePVModule'] = activePVModule;

          // solarPlantAry[index]['activePVModule'] = activePVModule.toFixed(3);
          solarPlantAry[index]['gridCode'] = gridCode;
          promiseAry.push(getNodes(nodeIds, plantData['app_id']));
          promiseAry.push(getCurrentWeatherData(plantData.latitude, plantData.longitude));
          Promise.all(promiseAry).then(function (promiseResult) {
            solarPlantAry[index]['weather'] = promiseResult[1];
            var currentDate = momentTimezone.tz(req.session.passport.user.timezone);
            var postData1 = {};
            var postData2 = {};
            var postData3 = {};
            postData1['nodeId'] = promiseResult[0][plantData['app_id']];
            postData1['parameterId'] = [37];
            postData1['interval'] = 'hourly';
            postData1['fromDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
            postData1['toDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
            postData1['isinstantaneous'] = 0;
            postData1['readingGap'] = otherSettingObj ? (('undefined' != typeof otherSettingObj['addIntervalGaps'] && null !== otherSettingObj['addIntervalGaps']) ? otherSettingObj['addIntervalGaps'] : false) : true;
            dataPromiseAry.push(getTodayConsumption(req, postData1));


            postData2['nodeId'] = promiseResult[0][plantData['app_id']];
            postData2['parameterId'] = [37];
            postData2['interval'] = 'daily';
            postData2['fromDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).subtract(1, 'd').format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
            postData2['toDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).subtract(1, 'd').format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
            postData2['isinstantaneous'] = 0;
            postData2['readingGap'] = otherSettingObj ? (('undefined' != typeof otherSettingObj['addIntervalGaps'] && null !== otherSettingObj['addIntervalGaps']) ? otherSettingObj['addIntervalGaps'] : false) : true;
            dataPromiseAry.push(getYesterdayConsumption(req, postData2));

            postData3['nodeId'] = promiseResult[0][plantData['app_id']];
            postData3['parameterId'] = [37];
            postData3['interval'] = 'monthly';
            postData3['fromDate'] = momentTimezone.tz(plantData['installation_date'], 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).subtract(1, 'd').format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
            postData3['toDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
            postData3['isinstantaneous'] = 0;
            // postData3['readingGap'] = otherSettingObj ? (('undefined' != typeof otherSettingObj['addIntervalGaps'] && null !== otherSettingObj['addIntervalGaps']) ? otherSettingObj['addIntervalGaps'] : false) : true;
            postData3['readingGap'] = true; //comment by ekta
            dataPromiseAry.push(getMonthlyConsumption(req, postData3, otherSettingObj));
            /* var postData = {};
            postData['nodeId'] = promiseResult[0][plantData['app_id']];
            postData['parameterId'] = [37];
            postData['interval'] = 'hourly';
            postData['fromDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
            postData['toDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
            postData['isinstantaneous'] = 0;
            postData['readingGap'] = otherSettingObj ? (('undefined' != typeof otherSettingObj['addIntervalGaps'] && null !== otherSettingObj['addIntervalGaps']) ? otherSettingObj['addIntervalGaps'] : false) : true;
            dataPromiseAry.push(getTodayConsumption(req, postData));

            postData['interval'] = 'daily';
            postData['fromDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).subtract(1, 'd').format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
            postData['toDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).subtract(1, 'd').format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
            dataPromiseAry.push(getYesterdayConsumption(req, postData));

            postData['interval'] = 'monthly';
            postData['fromDate'] = momentTimezone.tz(plantData['installation_date'], 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).subtract(1, 'd').format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
            postData['toDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
            dataPromiseAry.push(getMonthlyConsumption(req, postData, otherSettingObj)); */
            Promise.all(dataPromiseAry).then(function (promiseResults) {
              solarPlantAry[index]['todayConsumption'] = promiseResults[0];
              solarPlantAry[index]['yesterdayConsumption'] = promiseResults[1];
              solarPlantAry[index]['co2Avoided'] = promiseResults[2]['co2Avoided'];
              solarPlantAry[index]['totalKWh'] = promiseResults[2]['totalKWh'];
              // //console.log(solarPlantAry[index]['totalKWh'], 'solarPlantAry[index][totalKWh] ###############');
              solarPlantAry[index]['totalINRSaved'] = promiseResults[2]['totalINRSaved'];
              resultIndex++;
              if (solarPlantAry.length == resultIndex) {
                res.json({ "result": solarPlantAry });
                res.end();
                return res;
              }
            }).catch(err => {
              res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
              res.end();
              return res;
            });
          }).catch(err => {
            res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
            res.end();
            return res;
          });
        }
      });
    });
  });
});
// router.post('/list', authenticationHelpers.isClientAuth, function (req, res) {
//   assetanalysis.list(req.session.passport.user.company_id, function (err, result) {
//     if (err) {
//       res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
//       return res;
//     }
//     if (!result || result.length == 0) {
//       res.json({ "error": true, "reason": "No records found." });
//       return res;
//     }
//     var solarPlantAry = [];
//     var resultIndex = 0;

//     commonfunction.AllappList(req.session.passport.user, result, 'solar', function (err, data) {
//       if (err) {
//         res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
//         return res;
//       }
//       if (!data) {
//         res.json({ "error": true, "reason": "No records found." });
//         return res;
//       }
//       solarPlantAry = data;
//       solarPlantAry.forEach(function (plantData, index) {
//         solarPlantAry[index]['noOfInverters'] = 0;
//         solarPlantAry[index]['weather'] = {};
//         solarPlantAry[index]['inverterImg'] = '/assets/images/apps/inverter.png';
//         solarPlantAry[index]['defaultRealtimeParameters'] = { DCParameterAry: [75, 76, 77], ACParameterAry: [1, 2, 3, 4, 5, 6, 32, 84] };
//         solarPlantAry[index]['defaultAnalyticsParameters'] = [{ name: 'Wind Speed', value: '107' }, { name: 'Irradiation', value: '106' }, { name: 'Panel Temperature', value: '105' }, { name: 'Ambient Temperature', value: '104' }, { name: 'Energy Generated', value: '37' }, { name: 'Power', value: '27' }];
//         solarPlantAry[index]['defaultAnalyticsSetting'] = { interval: 'fifteen', parameter: ['37'], chartType: 'bar', duration: 'Today', dateRange: '' };
//         solarPlantAry[index]['totalStrings'] = 0;
//         solarPlantAry[index]['activeArea'] = 0;
//         solarPlantAry[index]['activeMppt'] = 0;
//         solarPlantAry[index]['activePVModule'] = 0;
//         solarPlantAry[index]['gridCode'] = '';
//         solarPlantAry[index]['todayConsumption'] = (0).toFixed(2);
//         solarPlantAry[index]['yesterdayConsumption'] = (0).toFixed(2);
//         solarPlantAry[index]['co2Avoided'] = (0).toFixed(2);
//         solarPlantAry[index]['totalINRSaved'] = (0).toFixed(2);
//         // solarPlantAry[index]['totalKWh'] = 0;
//         solarPlantAry[index]['language'] = req.session.passport.user.language;
//         var inverterPanelSettingObj = plantData['inverter_panel_setting'] ? JSON.parse(plantData['inverter_panel_setting']) : {};
//         if (null == plantData.inverter_panel_setting || Object.keys(inverterPanelSettingObj).length == 0) {
//           if (plantData.latitude && plantData.longitude) {
//             Promise.all([getCurrentWeatherData(plantData.latitude, plantData.longitude)]).then(function (promiseResult) {
//               solarPlantAry[index]['weather'] = promiseResult[0];
//               resultIndex++;

//               if (solarPlantAry.length == resultIndex) {
//                 res.json({ "result": solarPlantAry });
//                 res.end();
//                 return res;
//               }
//             });
//           }
//           else {
//             resultIndex++;
//             if (solarPlantAry.length == resultIndex) {
//               res.json({ "result": solarPlantAry });
//               res.end();
//               // return res;
//             }
//           }
//         }
//         if (null != plantData.inverter_panel_setting && Object.keys(inverterPanelSettingObj).length > 0) {
//           var otherSettingObj = JSON.parse(plantData['other_setting']);
//           var promiseAry = [];
//           var dataPromiseAry = [];
//           var totalStrings = 0, activeArea = 0, activeMppt = 0, activePVModule = 0, gridCode;
//           var nodeIds = [];
//           solarPlantAry[index]['noOfInverters'] = Object.keys(inverterPanelSettingObj).length;
//           for (var settingIndex in inverterPanelSettingObj) {

//             inverterPanelSettingObj[settingIndex]['numberMPPT'] = (!inverterPanelSettingObj[settingIndex]['numberMPPT'] || inverterPanelSettingObj[settingIndex]['numberMPPT'] == '') ? 0 : inverterPanelSettingObj[settingIndex]['numberMPPT'];
//             inverterPanelSettingObj[settingIndex]['pvModules'] = (!inverterPanelSettingObj[settingIndex]['pvModules'] || inverterPanelSettingObj[settingIndex]['pvModules'] == '') ? 0 : inverterPanelSettingObj[settingIndex]['pvModules'];
//             inverterPanelSettingObj[settingIndex]['activeSurfaceArea'] = (!inverterPanelSettingObj[settingIndex]['activeSurfaceArea'] || inverterPanelSettingObj[settingIndex]['activeSurfaceArea'] == '') ? 0 : inverterPanelSettingObj[settingIndex]['activeSurfaceArea'];


//             nodeIds.push(inverterPanelSettingObj[settingIndex]['node']);
//             totalStrings += parseFloat(inverterPanelSettingObj[settingIndex]['numberPerMPPT']);
//             activeArea += parseFloat(inverterPanelSettingObj[settingIndex]['activeSurfaceArea']);
//             activeMppt += parseFloat(inverterPanelSettingObj[settingIndex]['numberMPPT']);
//             // activeMppt += parseFloat(inverterPanelSettingObj[settingIndex]['numberMPPT']);
//             activePVModule += parseFloat(inverterPanelSettingObj[settingIndex]['pvModules']);
//             gridCode = inverterPanelSettingObj[settingIndex]['gridCode'];
//           }
//           solarPlantAry[index]['totalStrings'] = totalStrings;
//           solarPlantAry[index]['activeArea'] = activeArea.toFixed(3);
//           solarPlantAry[index]['activeMppt'] = activeMppt.toFixed(3);
//           solarPlantAry[index]['activePVModule'] = activePVModule.toFixed(3);
//           solarPlantAry[index]['gridCode'] = gridCode;
//           promiseAry.push(getNodes(nodeIds, plantData['app_id']));
//           promiseAry.push(getCurrentWeatherData(plantData.latitude, plantData.longitude));
//           Promise.all(promiseAry).then(function (promiseResult) {
//             solarPlantAry[index]['weather'] = promiseResult[1];
//             var currentDate = momentTimezone.tz(req.session.passport.user.timezone);
//             var postData1 = {};
//             var postData2 = {};
//             var postData3 = {};
//             postData1['nodeId'] = promiseResult[0][plantData['app_id']];
//             postData1['parameterId'] = [37];
//             postData1['interval'] = 'hourly';
//             postData1['fromDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
//             postData1['toDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
//             postData1['isinstantaneous'] = 0;
//             postData1['readingGap'] = otherSettingObj ? (('undefined' != typeof otherSettingObj['addIntervalGaps'] && null !== otherSettingObj['addIntervalGaps']) ? otherSettingObj['addIntervalGaps'] : false) : true;
//             dataPromiseAry.push(getTodayConsumption(req, postData1));


//             postData2['nodeId'] = promiseResult[0][plantData['app_id']];
//             postData2['parameterId'] = [37];
//             postData2['interval'] = 'daily';
//             postData2['fromDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).subtract(1, 'd').format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
//             postData2['toDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).subtract(1, 'd').format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
//             postData2['isinstantaneous'] = 0;
//             postData2['readingGap'] = otherSettingObj ? (('undefined' != typeof otherSettingObj['addIntervalGaps'] && null !== otherSettingObj['addIntervalGaps']) ? otherSettingObj['addIntervalGaps'] : false) : true;
//             dataPromiseAry.push(getYesterdayConsumption(req, postData2));

//             postData3['nodeId'] = promiseResult[0][plantData['app_id']];
//             postData3['parameterId'] = [37];
//             postData3['interval'] = 'monthly';
//             postData3['fromDate'] = momentTimezone.tz(plantData['installation_date'], 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).subtract(1, 'd').format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
//             postData3['toDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
//             postData3['isinstantaneous'] = 0;
//             postData3['readingGap'] = otherSettingObj ? (('undefined' != typeof otherSettingObj['addIntervalGaps'] && null !== otherSettingObj['addIntervalGaps']) ? otherSettingObj['addIntervalGaps'] : false) : true;
//             dataPromiseAry.push(getMonthlyConsumption(req, postData3, otherSettingObj));
//             /* var postData = {};
//             postData['nodeId'] = promiseResult[0][plantData['app_id']];
//             postData['parameterId'] = [37];
//             postData['interval'] = 'hourly';
//             postData['fromDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
//             postData['toDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
//             postData['isinstantaneous'] = 0;
//             postData['readingGap'] = otherSettingObj ? (('undefined' != typeof otherSettingObj['addIntervalGaps'] && null !== otherSettingObj['addIntervalGaps']) ? otherSettingObj['addIntervalGaps'] : false) : true;
//             dataPromiseAry.push(getTodayConsumption(req, postData));

//             postData['interval'] = 'daily';
//             postData['fromDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).subtract(1, 'd').format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
//             postData['toDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).subtract(1, 'd').format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
//             dataPromiseAry.push(getYesterdayConsumption(req, postData));

//             postData['interval'] = 'monthly';
//             postData['fromDate'] = momentTimezone.tz(plantData['installation_date'], 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).subtract(1, 'd').format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
//             postData['toDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
//             dataPromiseAry.push(getMonthlyConsumption(req, postData, otherSettingObj)); */
//             Promise.all(dataPromiseAry).then(function (promiseResults) {
//               solarPlantAry[index]['todayConsumption'] = promiseResults[0];
//               solarPlantAry[index]['yesterdayConsumption'] = promiseResults[1];
//               solarPlantAry[index]['co2Avoided'] = promiseResults[2]['co2Avoided'];
//               solarPlantAry[index]['totalKWh'] = promiseResults[2]['totalKWh'];
//               solarPlantAry[index]['totalINRSaved'] = promiseResults[2]['totalINRSaved'];
//               resultIndex++;
//               if (solarPlantAry.length == resultIndex) {
//                 res.json({ "result": solarPlantAry });	
//                 res.end();
//                 return res;
//               }
//             }).catch(err => {
//               res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
//               res.end();
//               return res;
//             });
//           }).catch(err => {
//             res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
//             res.end();
//             return res;
//           });
//         }
//       });
//     });
//   });
// });

// router.post('/list', authenticationHelpers.isClientAuth, function (req, res) {
//   assetanalysis.list(req.session.passport.user.company_id, function (err, result) {
//     if (err) {
//       res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
//       return res;
//     }
//     if (!result || result.length == 0) {
//       res.json({ "error": true, "reason": "No records found." });
//       return res;
//     }
//     var solarPlantAry = [];
//     var resultIndex = 0;

//     commonfunction.AllappList(req.session.passport.user, result, 'solar', function (err, data) {
//       if (err) {
//         res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
//         return res;
//       }
//       if (!data) {
//         res.json({ "error": true, "reason": "No records found." });
//         return res;
//       }
//       solarPlantAry = data;
//       solarPlantAry.forEach(function (plantData, index) {
//         solarPlantAry[index]['noOfInverters'] = 0;
//         solarPlantAry[index]['weather'] = {};
//         solarPlantAry[index]['inverterImg'] = '/assets/images/apps/inverter.png';
//         solarPlantAry[index]['defaultRealtimeParameters'] = { DCParameterAry: [75, 76, 77], ACParameterAry: [1, 2, 3, 4, 5, 6, 32, 84] };
//         solarPlantAry[index]['defaultAnalyticsParameters'] = [{ name: 'Wind Speed', value: '107' }, { name: 'Irradiation', value: '106' }, { name: 'Panel Temperature', value: '105' }, { name: 'Ambient Temperature', value: '104' }, { name: 'Energy Generated', value: '37' }, { name: 'Power', value: '27' }];
//         solarPlantAry[index]['defaultAnalyticsSetting'] = { interval: 'fifteen', parameter: ['37'], chartType: 'bar', duration: 'Today', dateRange: '' };
//         solarPlantAry[index]['totalStrings'] = 0;
//         solarPlantAry[index]['activeArea'] = 0;
//         solarPlantAry[index]['activeMppt'] = 0;
//         solarPlantAry[index]['activePVModule'] = 0;
//         solarPlantAry[index]['gridCode'] = '';
//         solarPlantAry[index]['todayConsumption'] = (0).toFixed(2);
//         solarPlantAry[index]['yesterdayConsumption'] = (0).toFixed(2);
//         solarPlantAry[index]['co2Avoided'] = (0).toFixed(2);
//         solarPlantAry[index]['totalINRSaved'] = (0).toFixed(2);
//         // solarPlantAry[index]['totalKWh'] = 0;
//         solarPlantAry[index]['language'] = req.session.passport.user.language;
//         var inverterPanelSettingObj = plantData['inverter_panel_setting'] ? JSON.parse(plantData['inverter_panel_setting']) : {};
//         if (null == plantData.inverter_panel_setting || Object.keys(inverterPanelSettingObj).length == 0) {
//           if (plantData.latitude && plantData.longitude) {
//             Promise.all([getCurrentWeatherData(plantData.latitude, plantData.longitude)]).then(function (promiseResult) {
//               solarPlantAry[index]['weather'] = promiseResult[0];
//               resultIndex++;

//               if (solarPlantAry.length == resultIndex) {
//                 res.json({ "result": solarPlantAry });
//                 res.end();
//                 return res;
//               }
//             });
//           }
//           else {
//             resultIndex++;
//             if (solarPlantAry.length == resultIndex) {
//               res.json({ "result": solarPlantAry });
//               res.end();
//               // return res;
//             }
//           }
//         }
//         if (null != plantData.inverter_panel_setting && Object.keys(inverterPanelSettingObj).length > 0) {
//           var otherSettingObj = JSON.parse(plantData['other_setting']);
//           var promiseAry = [];
//           var dataPromiseAry = [];
//           var totalStrings = 0, activeArea = 0, activeMppt = 0, activePVModule = 0, gridCode;
//           var nodeIds = [];
//           solarPlantAry[index]['noOfInverters'] = Object.keys(inverterPanelSettingObj).length;
//           for (var settingIndex in inverterPanelSettingObj) {

//             inverterPanelSettingObj[settingIndex]['numberMPPT'] = (!inverterPanelSettingObj[settingIndex]['numberMPPT'] || inverterPanelSettingObj[settingIndex]['numberMPPT'] == '') ? 0 : inverterPanelSettingObj[settingIndex]['numberMPPT'];
//             inverterPanelSettingObj[settingIndex]['pvModules'] = (!inverterPanelSettingObj[settingIndex]['pvModules'] || inverterPanelSettingObj[settingIndex]['pvModules'] == '') ? 0 : inverterPanelSettingObj[settingIndex]['pvModules'];
//             inverterPanelSettingObj[settingIndex]['activeSurfaceArea'] = (!inverterPanelSettingObj[settingIndex]['activeSurfaceArea'] || inverterPanelSettingObj[settingIndex]['activeSurfaceArea'] == '') ? 0 : inverterPanelSettingObj[settingIndex]['activeSurfaceArea'];


//             nodeIds.push(inverterPanelSettingObj[settingIndex]['node']);
//             totalStrings += parseFloat(inverterPanelSettingObj[settingIndex]['numberPerMPPT']);
//             activeArea += parseFloat(inverterPanelSettingObj[settingIndex]['activeSurfaceArea']);
//             activeMppt += parseFloat(inverterPanelSettingObj[settingIndex]['numberMPPT']);
//             // activeMppt += parseFloat(inverterPanelSettingObj[settingIndex]['numberMPPT']);
//             activePVModule += parseFloat(inverterPanelSettingObj[settingIndex]['pvModules']);
//             gridCode = inverterPanelSettingObj[settingIndex]['gridCode'];
//           }
//           solarPlantAry[index]['totalStrings'] = totalStrings;
//           solarPlantAry[index]['activeArea'] = activeArea.toFixed(3);
//           solarPlantAry[index]['activeMppt'] = activeMppt.toFixed(3);
//           solarPlantAry[index]['activePVModule'] = activePVModule.toFixed(3);
//           solarPlantAry[index]['gridCode'] = gridCode;
//           promiseAry.push(getNodes(nodeIds, plantData['app_id']));
//           promiseAry.push(getCurrentWeatherData(plantData.latitude, plantData.longitude));
//           Promise.all(promiseAry).then(function (promiseResult) {
//             solarPlantAry[index]['weather'] = promiseResult[1];
//             var currentDate = momentTimezone.tz(req.session.passport.user.timezone);
//             var postData = {};
//             postData['nodeId'] = promiseResult[0][plantData['app_id']];
//             postData['parameterId'] = [37];
//             postData['interval'] = 'hourly';
//             postData['fromDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
//             postData['toDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
//             postData['isinstantaneous'] = 0;
//             postData['readingGap'] = otherSettingObj ? (('undefined' != typeof otherSettingObj['addIntervalGaps'] && null !== otherSettingObj['addIntervalGaps']) ? otherSettingObj['addIntervalGaps'] : false) : true;
//             dataPromiseAry.push(getTodayConsumption(req, postData));

//             postData['interval'] = 'daily';
//             postData['fromDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).subtract(1, 'd').format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
//             postData['toDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).subtract(1, 'd').format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
//             dataPromiseAry.push(getYesterdayConsumption(req, postData));

//             postData['interval'] = 'monthly';
//             postData['fromDate'] = momentTimezone.tz(plantData['installation_date'], 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).subtract(1, 'd').format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
//             postData['toDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
//             dataPromiseAry.push(getMonthlyConsumption(req, postData, otherSettingObj));
//             Promise.all(dataPromiseAry).then(function (promiseResults) {
//               solarPlantAry[index]['todayConsumption'] = promiseResults[0];
//               solarPlantAry[index]['yesterdayConsumption'] = promiseResults[1];
//               solarPlantAry[index]['co2Avoided'] = promiseResults[2]['co2Avoided'];
//               solarPlantAry[index]['totalKWh'] = promiseResults[2]['totalKWh'];
//               solarPlantAry[index]['totalINRSaved'] = promiseResults[2]['totalINRSaved'];
//               resultIndex++;
//               if (solarPlantAry.length == resultIndex) {
//                 res.json({ "result": solarPlantAry });
//                 res.end();
//                 return res;
//               }
//             }).catch(err => {
//               //console.log('result2', err)
//               res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
//               res.end();
//               return res;
//             });
//           }).catch(err => {
//             //console.log('result3', err)
//             res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
//             res.end();
//             return res;
//           });
//         }
//       });
//     });
//   });
// });


function getNodes(nodeIds, appId) {
  return new Promise((resolve, reject) => {
    assetanalysis.getNodes(nodeIds, function (err, result) {
      if (err) {
        return reject(err);
      }
      var uniqueNodeIdObj = {};
      for (var i = 0; i < result.length; i++) {
        if ('undefined' == typeof uniqueNodeIdObj[appId]) {
          uniqueNodeIdObj[appId] = [];
        }
        uniqueNodeIdObj[appId].push(result[i]['node_unique_id']);
      }
      return resolve(uniqueNodeIdObj);
    });
  });
}

function getCurrentWeatherData(latitude, longitude) {
  return new Promise((resolve, reject) => {
    weather.getDailyForecastByGeoCoordinates(latitude, longitude, (err, currentWeather) => {
      if (err) {
        return resolve({});
      }
      return resolve(currentWeather);
    });
  });
}

function getTodayConsumption(req, postData) {
  return new Promise((resolve, reject) => {
    req.body = postData;
    common.getCummulativeHourlyData(req, function (error, data) {
      var todayConsumption = 0;
      if (!data['error'] && 'undefined' != typeof data['data'] && Object.keys(data['data']).length > 0) {
        var readingDataObj = {}, length;
        for (var key in data['data']) {
          for (var nodeIdDeviceAddr in data['data'][key]) {
            if ('timestamp' == nodeIdDeviceAddr) {
              continue;
            }
            if (null !== data['data'][key][nodeIdDeviceAddr]['difference']['reading']) {
              if ('undefined' == typeof readingDataObj[nodeIdDeviceAddr]) {
                readingDataObj[nodeIdDeviceAddr] = {}
              }
              length = Object.keys(readingDataObj[nodeIdDeviceAddr]).length;
              readingDataObj[nodeIdDeviceAddr][length] = data['data'][key][nodeIdDeviceAddr];
            }
          }
        }
        for (var nodeIdDeviceAddr in readingDataObj) {
          if ('undefined' == typeof readingDataObj[nodeIdDeviceAddr]) { continue; }
          var lastKey = Object.keys(readingDataObj[nodeIdDeviceAddr]).length - 1;
          var difference = readingDataObj[nodeIdDeviceAddr][lastKey]['endReading']['reading'] - readingDataObj[nodeIdDeviceAddr][0]['startReading']['reading'];
          todayConsumption += (null !== difference) ? difference : 0;
        }
      }
      return resolve(todayConsumption);
    });
  });
}

function getYesterdayConsumption(req, postData) {
  return new Promise((resolve, reject) => {
    req.body = postData;
    common.getCummulativeDailyData(req, function (error, data) {
      var yesterdayConsumption = 0;
      if (!data['error'] && 'undefined' != typeof data['data'] && Object.keys(data['data']).length > 0) {
        for (var key in data['data']) {
          for (var deviceId in data['data'][key]) {
            if ('timestamp' == deviceId) {
              continue;
            }
            if (data['data'][key][deviceId]['difference']['reading'] != null) {
              yesterdayConsumption += data['data'][key][deviceId]['difference']['reading'];
            }
          }
        }
      }
      return resolve(yesterdayConsumption);
    });
  });
}

function getMonthlyConsumption(req, postData, otherSettingObj) {
  return new Promise((resolve, reject) => {
    req.body = postData;
    common.getCummulativeMonthlyData(req, function (error, data) {
      var obj = { co2Avoided: 0, totalINRSaved: 0, totalKWh: 0 };
      if (!data['error'] && 'undefined' != typeof data['data'] && Object.keys(data['data']).length > 0) {
        var totalKWh = 0, co2Avoided = 0, totalINRSaved = 0;
        var array = [];
        for (var key in data['data']) {
          // //console.log(data['data'] ,'key!!!!!!!!!!!')
          for (var deviceId in data['data'][key]) {
            // //console.log(Json.stringify(data['data'][key]) ,'key!!!!!!!!!!!')
            if ('timestamp' == deviceId) {
              continue;
            }

            if (data['data'][key][deviceId]['difference']['reading'] != null) {
              array.push({
                date: new Date(01 + key),
                deviceId: deviceId,
                startReading: data['data'][key][deviceId]['startReading']['reading'],
                endReading: data['data'][key][deviceId]['endReading']['reading'],
                difference: data['data'][key][deviceId]['difference']['reading']
              })

            }
          }
        }
        let dumyArray = array.sort((a, b) => {
          var startReadingA = a.date;
          var startReadingB = b.date;
          var deviceIdA = a.deviceId;
          var deviceIdB = b.deviceId;

          if (deviceIdA == deviceIdB) {
            return (startReadingA > startReadingB) ? 1 : ((startReadingB > startReadingA) ? -1 : 0)
          }
          else {
            return (deviceIdA < deviceIdB) ? -1 : 1;
          }

        })
        ////console.log(JSON.stringify(dumyArray),'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');

        var deviceName = '';
        var check = false;
        dumyArray.map(item => {
          if (deviceName == '') {
            deviceName = item.deviceId;
          }

          if (deviceName == item.deviceId) {
            if (!check) {
              totalKWh += item.startReading + item.difference;
              check = true;
            }
            else {
              totalKWh += item.difference;
            }
          }
          else {
            deviceName = item.deviceId;
            check = false;
            if (!check) {
              totalKWh += item.startReading + item.difference;
              check = true;
            }
            else {
              totalKWh += item.difference;
            }
          }

        })
        //console.log(otherSettingObj.carbonFootprintFactor, " //console.log(totalKWh1);", otherSettingObj.carbonFootprintFactor);

        otherSettingObj.carbonFootprintFactor = otherSettingObj.carbonFootprintFactor ? otherSettingObj.carbonFootprintFactor : 0.85;
        otherSettingObj.ratePerKwh = otherSettingObj.ratePerKwh ? otherSettingObj.ratePerKwh : 10

        co2Avoided = totalKWh * otherSettingObj.carbonFootprintFactor;
        //console.log(totalKWh, " 689;");
        //console.log(co2Avoided, " 690;");
        //console.log(totalINRSaved, " 691;");

        totalINRSaved = totalKWh * otherSettingObj.ratePerKwh;
        obj = { co2Avoided: co2Avoided, totalKWh: totalKWh, totalINRSaved: totalINRSaved };

      }
      return resolve(obj);
    });
  });
}

// function getMonthlyConsumption(req, postData, otherSettingObj) {
//   return new Promise((resolve, reject) => {
//     req.body = postData;
//     common.getCummulativeMonthlyData(req, function (error, data) {
//       var obj = { co2Avoided: 0, totalINRSaved: 0, totalKWh: 0 };
//       if (!data['error'] && 'undefined' != typeof data['data'] && Object.keys(data['data']).length > 0) {
//         var totalKWh = 0, co2Avoided = 0, totalINRSaved = 0;
//         for (var key in data['data']) {
//           for (var deviceId in data['data'][key]) {
//             if ('timestamp' == deviceId) {
//               continue;
//             }
//             if (data['data'][key][deviceId]['difference']['reading'] != null) {
//               totalKWh += data['data'][key][deviceId]['difference']['reading'];
//             }
//           }
//         }
//         otherSettingObj.carbonFootprintFactor = otherSettingObj.carbonFootprintFactor ? otherSettingObj.carbonFootprintFactor : 0.85;
//         otherSettingObj.ratePerKwh = otherSettingObj.ratePerKwh ? otherSettingObj.ratePerKwh : 10

//         co2Avoided = totalKWh * otherSettingObj.carbonFootprintFactor;
//         totalINRSaved = totalKWh * otherSettingObj.ratePerKwh;
//         obj = { co2Avoided: co2Avoided, totalKWh: totalKWh, totalINRSaved: totalINRSaved };
//       }
//       return resolve(obj);
//     });
//   });
// }

router.post('/nodeMakeList', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.nodeMakeList(function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    if (!result) {
      res.json({ "error": true, "reason": "No records found." });
      return res;
    }

    res.json({ "result": result });
    res.end();
    return res;
  });
});

router.post('/nodeModelList', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.nodeModelList(req.body.id, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    if (!result) {
      res.json({ "error": true, "reason": "No records found." });
      return res;
    }

    res.json({ "error": false, "result": result });
    res.end();
    return res;
  });
});

router.post('/submitSolarPlant', authenticationHelpers.isClientAuth, function (req, res) {
  req.checkBody("data.location", "Location is required.").notEmpty();
  // req.checkBody("data.ratedCapacity", "Rated Capacity must be digit.").isNumeric();
  // req.checkBody("data.initialInvestment", "Initial Investment must be digit.").isNumeric();
  // req.checkBody("data.annualInterest", "Annual Interest must be digit.").isNumeric();
  req.checkBody("data.projectType", "Project Type is required.").notEmpty();
  // req.checkBody("data.installationType", "Installation Type is required.").notEmpty();
  req.checkBody("data.installationDate", "Installation Date is required.").notEmpty();

  var errorMsg = '';
  req.getValidationResult().then(function (err) {
    if (!err.isEmpty()) {
      err.array().map(function (elem) {
        errorMsg += elem.msg + "\n";
      });
      errorMsg = errorMsg.trim("\n");
      res.json({ "error": true, "reason": errorMsg });
      return res;
    }
    assetanalysis.updateSolarPlant(req.body, function (err) {
      if (err) {

        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      res.json({ "error": false, "reason": "Solar performance monitoring updated successfully." });
      res.end();
      return res;
    });
  });
});

router.post('/inverterPanelSettings', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.inverterPanelSettings(req.body, function (err) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Settings saved successfully." });
    res.end();
    return res;
  });
});

router.post('/sensorSettings', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.sensorSettings(req.body, function (err) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Settings saved successfully." });
    res.end();
    return res;
  });
});

router.post('/otherSettings', authenticationHelpers.isClientAuth, function (req, res) {
  req.checkBody("data.carbonFootprintFactor", "Carbon Footprint Factor is required.").notEmpty();
  req.checkBody("data.ratePerKwh", "Rate Per KWh must be digit.").notEmpty();
  var errorMsg = '';
  req.getValidationResult().then(function (err) {
    if (!err.isEmpty()) {
      err.array().map(function (elem) {
        errorMsg += elem.msg + "\n";
      });
      errorMsg = errorMsg.trim("\n");
      res.json({ "error": true, "reason": errorMsg });
      return res;
    }
    assetanalysis.otherSettings(req.body, function (err) {
      if (err) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      res.json({ "error": false, "reason": "Settings saved successfully." });
      res.end();
      return res;
    });
  });
});

router.post('/alarmParameterData', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.alarmParameterData(function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    if (!result) {
      res.json({ "error": true, "reason": "No records found." });
      return res;
    }
    var alarmParameterAry = req.body.data, alarmParameterObj = {};
    for (var index in result) {
      if ('undefined' != typeof result[index]['secondary_parameter_id'] && alarmParameterAry.indexOf(result[index]['secondary_parameter_id'].toString()) != -1) {
        alarmParameterObj[result[index]['secondary_parameter_id']] = result[index];
      }
    }
    res.json({ "error": false, "result": alarmParameterObj });
    res.end();
    return res;
  });
});

router.post('/delete', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.delete(req.body.id, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Solar performance monitoring deleted successfully." });
    res.end();
    return res;
  });
});

router.post('/analyticsSettings', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.analyticsSettings(req.body, function (err) {

    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Settings saved successfully." });
    res.end();
    return res;
  });
});

router.post('/oeeList', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.oeeList(req.session.passport.user.company_id, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    if (!result) {
      res.json({ "error": true, "reason": "No records found." });
      return res;
    }
    commonfunction.AllappList(req.session.passport.user, result, 'oee', function (err, data) {
      if (err) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      if (!data) {
        res.json({ "error": true, "reason": "No records found." });
        return res;
      }
      res.json({ "data": data });
      res.end();
      return res;
    });
  });
});

router.post('/deleteOEE', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.deleteOEE(req.body.id, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "OEE deleted successfully." });
    res.end();
    return res;
  });
});

router.post('/OEESettings', authenticationHelpers.isClientAuth, function (req, res) {
  req.checkBody("data.location", "Location is required.").notEmpty();
  req.checkBody("data.subLocation", "Sub-Location is required.").notEmpty();
  req.checkBody("data.breakTime", "Break Time is required.").notEmpty();
  if (req.body.data.addEquipment) {
    req.checkBody("data.equipment", "Equipment is required.").notEmpty();
    req.checkBody("data.componentCode", "Component Code is required.").notEmpty();
    req.checkBody("data.componentDescription", "Component Description is required.").notEmpty();
    req.checkBody("data.stdCycleTime", "Standard Cycle time must be digit.").isNumeric();
    req.checkBody("data.toolCavity", "Tool Cavity must be digit.").isNumeric();
  }
  var errorMsg = '';
  req.getValidationResult().then(function (err) {
    if (!err.isEmpty()) {
      err.array().map(function (elem) {
        errorMsg += elem.msg + "\n";
      });
      errorMsg = errorMsg.trim("\n");
      res.json({ "error": true, "reason": errorMsg });
      return res;
    }
    var arrPromise = [];
    if (false == req.body.data.addEquipment) {
      arrPromise.push(OEEBasicSettings(req.body));
      Promise.all(arrPromise).then(function (results) {
        res.json({ "error": false, "reason": "Settings saved successfully." });
        res.end();
        return res;
      }).catch(err => {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        res.end();
        return res;
      });
    }
    else {
      req.body.data.companyId = req.session.passport.user.company_id;
      arrPromise.push(OEEBasicSettings(req.body));
      if (req.body.data.isNewEquipment) arrPromise.push(checkUnique('Equipment', req.body));
      else if (!req.body.data.isNewEquipment) arrPromise.push(checkUnique('Component', req.body));
      Promise.all(arrPromise).then(function (results) {
        if (results[1] != 'done') {
          res.json({ "error": true, "reason": results[1] });
          res.end();
          return res;
        }
        var arrPromises = [];
        if (req.body.data.isNewEquipment) arrPromises.push(addEquipment(req.body));
        else if (!req.body.data.isNewEquipment) arrPromises.push(addComponent(req.body));
        Promise.all(arrPromises).then(function (results) {
          if (req.body.data.isNewEquipment) {
            req.body.data.equipment = results[0].equipmentId;
            arrPromises = [];
            arrPromises.push(addComponent(req.body));
            Promise.all(arrPromises).then(function (results) {
              res.json({ "error": false, "reason": "Settings saved successfully." });
              res.end();
              return res;
            }).catch(err => {
              res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
              res.end();
              return res;
            });
          } else {
            res.json({ "error": false, "reason": "Settings saved successfully." });
            res.end();
            return res;
          }
        }).catch(err => {
          res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
          res.end();
          return res;
        });
      }).catch(err => {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        res.end();
        return res;
      });
    }
  });
});

router.post('/OEEEquipmentSettings', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.OEEEquipmentSettings(req.body, function (err) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Settings saved successfully." });
    res.end();
    return res;
  });
});

router.post('/equipmentList', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.equipmentList(req.session.passport.user, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    if (!result) {
      res.json({ "error": true, "reason": "No records found." });
      return res;
    }

    res.json({ "result": result });
    res.end();
    return res;
  });
});

router.post('/durationEquipmentData', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.durationEquipmentData(req.body, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    if (!result) {
      res.json({ "error": true, "reason": "No records found." });
      return res;
    }
    res.json({ "result": result });
    res.end();
    return res;
  });
});

function checkUnique(action, requestBody) {
  return new Promise((resolve, reject) => {
    assetanalysis.checkUniqueness(action, requestBody.data, function (error, result) {
      if (error) {
        return reject(error);
      }
      if (0 < result) {
        return resolve(action + ' already exists.');
      }
      return resolve('done');
    });
  });
}

function OEEBasicSettings(requestBody) {
  return new Promise((resolve, reject) => {
    assetanalysis.OEEBasicSettings(requestBody, function (err) {
      if (err) {
        return reject(err);
      }
      return resolve('done');
    });
  });
}

function addEquipment(requestBody) {
  return new Promise((resolve, reject) => {
    assetanalysis.addEquipment(requestBody.data, function (err, result) {
      if (err) {
        return reject(err);
      }
      return resolve(result);
    });
  });
}

function addComponent(requestBody) {
  return new Promise((resolve, reject) => {
    assetanalysis.addComponent(requestBody.data, function (err, result) {
      if (err) {
        return reject(err);
      }
      return resolve(result);
    });
  });
}

router.post('/equipmentDataForDay', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.equipmentDataForDay(req.body, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    if (!result) {
      res.json({ "error": true, "reason": "No records found." });
      return res;
    }
    res.json({ "result": result });
    res.end();
    return res;
  });
});

router.post('/transformerList', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.transformerList(req.session.passport.user, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    if (!result) {
      res.json({ "error": true, "reason": "No records found." });
      return res;
    }


    commonfunction.AllappList(req.session.passport.user, result, 'transformer', function (err, data) {
      if (err) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      if (!data) {
        res.json({ "error": true, "reason": "No records found." });
        return res;
      }
      res.json({ "data": data });
      res.end();
      return res;
    });
  });
});
router.post('/deleteTransformer', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.deleteTransformer(req.body.id, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Transformer deleted successfully." });
    res.end();
    return res;
  });
});

router.post('/transformerBasicSettings', authenticationHelpers.isClientAuth, function (req, res) {
  req.checkBody("data.location", "Location is required.").notEmpty();
  req.checkBody("data.primaryNodeType", "Primary Node Type is required.").notEmpty();
  if (req.body.data.primaryNodeType == 'automate') {
    req.checkBody("data.primaryNode", "Primary Node is required.").notEmpty();
  }
  req.checkBody("data.secondaryNode", "Secondary Node is required.").notEmpty();
  var errorMsg = '';
  req.getValidationResult().then(function (err) {
    if (!err.isEmpty()) {
      err.array().map(function (elem) {
        errorMsg += elem.msg + "\n";
      });
      errorMsg = errorMsg.trim("\n");
      res.json({ "error": true, "reason": errorMsg });
      return res;
    }
    assetanalysis.transformerBasicSettings(req.body, function (err) {
      if (err) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      res.json({ "error": false, "reason": "Settings saved successfully." });
      res.end();
      return res;
    });
  });
});

router.post('/transformerLogsSettings', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.transformerLogsSettings(req.body, function (err) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Transformer logs saved successfully." });
    res.end();
    return res;
  });
});

router.post('/transformerSettings', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.transformerSettings(req.body, function (err) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Transformer settings saved successfully." });
    res.end();
    return res;
  });
});

router.post('/transformerLogForMonth', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.transformerLogForMonth(req.body, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    if (!result) {
      res.json({ "error": true, "reason": "No records found." });
      return res;
    }
    res.json({ "result": result });
    res.end();
    return res;
  });
});

router.post('/realtimeSettings', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.realtimeSettings(req.body, function (err) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Settings saved successfully." });
    res.end();
    return res;
  });
});

router.post('/powerFactorList', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.powerFactorList(req.session.passport.user.company_id, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    if (!result) {
      res.json({ "error": true, "reason": "No records found." });
      return res;
    }
    commonfunction.AllappList(req.session.passport.user, result, 'powerFactor', function (err, data) {
      if (err) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      if (!data) {
        res.json({ "error": true, "reason": "No records found." });
        return res;
      }
      // res.json({ "data": data });
      // res.end();
      // return res;
      // });



      var powerFactorAry = [];
      powerFactorAry = data;
      var resultIndex = 0;
      // result.forEach(function (powerFactorData, index) {
      //   if ('public' == powerFactorData['app_type'] || ('private' == powerFactorData['app_type'] && req.session.passport.user.user_id == powerFactorData['user_id'])) {
      //     powerFactorAry.push(powerFactorData);
      //   }
      // });
      if (powerFactorAry.length == 0) {
        res.json({ "error": true, "reason": "No records found." });
        return res;
      }
      powerFactorAry.forEach(function (powerFactorData, index) {
        powerFactorAry[index]['readingDataObj'] = {};
        powerFactorAry[index]['powerFactorCycleDaysTillToday'] = 0;
        powerFactorAry[index]['powerFactorCycleDaysLastMonth'] = 0;
        powerFactorAry[index]['realtimePFTillYesterday'] = 0;
        if (null == powerFactorData['node']) {
          resultIndex++;
          if (powerFactorAry.length == resultIndex) {
            res.json({ "result": powerFactorAry });
            res.end();
            return res;
          }
        }
        if (null != powerFactorData['node']) {
          var dataPromiseAry = [];
          var instaPromiseAry = [];
          var instaProAry = [];
          var promiseAry = [];
          promiseAry.push(getNodes(powerFactorData.node, powerFactorData['app_id']));
          Promise.all(promiseAry).then(function (promiseResult) {
            var currentDate = momentTimezone.tz(req.session.passport.user.timezone);
            var currentDay = momentTimezone.tz().format('DD');
            var powerFactorCycleDaysTillToday = momentTimezone.tz(powerFactorData['day_of_month'], 'DD', req.session.passport.user.timezone).add(1, 'month').diff(momentTimezone.tz(powerFactorData['day_of_month'], 'DD', req.session.passport.user.timezone), 'd');
            powerFactorAry[index]['powerFactorCycleDaysTillToday'] = powerFactorCycleDaysTillToday;
            var parameterAry = [37, 173, 174];
            var nodeUniqueId = promiseResult[0][powerFactorData['app_id']][0];
            if (currentDay <= powerFactorData['day_of_month']) {
              var postDataObj = {};
              postDataObj['nodeId'] = promiseResult[0][powerFactorData['app_id']];
              postDataObj['parameterId'] = parameterAry;
              postDataObj['interval'] = 'daily';
              postDataObj['fromDate'] = momentTimezone.tz(powerFactorData['day_of_month'], 'DD', req.session.passport.user.timezone).subtract(30, 'd').format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
              postDataObj['toDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).subtract(1, 'd').format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
              postDataObj['isinstantaneous'] = 0;
              postDataObj['readingGap'] = ('undefined' != typeof powerFactorData['add_interval_gaps'] && null !== powerFactorData['add_interval_gaps']) ? powerFactorData['add_interval_gaps'] : true;
              dataPromiseAry.push(getPowerFactorDailyReadings(req, postDataObj));
              postDataObj['interval'] = 'fifteen';
              postDataObj['fromDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
              postDataObj['toDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
              dataPromiseAry.push(getPowerFactorFifteenMinutesReadings(req, postDataObj));
              postDataObj['interval'] = 'daily';
              postDataObj['fromDate'] = momentTimezone.tz(powerFactorData['day_of_month'], 'DD', req.session.passport.user.timezone).subtract(1, 'month').format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
              postDataObj['toDate'] = momentTimezone.tz(postDataObj['fromDate'], 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).add(1, 'month').subtract(1, 'd').format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
              dataPromiseAry.push(getPowerFactorDailyReadings(req, postDataObj));
              var powerFactorCycleDaysLastMonth = momentTimezone.tz(postDataObj['toDate'], 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).diff(momentTimezone.tz(postDataObj['fromDate'], 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone), 'd');
              powerFactorAry[index]['powerFactorCycleDaysLastMonth'] = powerFactorCycleDaysLastMonth + 1;
            } else {
              var postDataObj = {};
              postDataObj['nodeId'] = promiseResult[0][powerFactorData['app_id']];
              postDataObj['parameterId'] = parameterAry;
              postDataObj['interval'] = 'daily';
              postDataObj['fromDate'] = momentTimezone.tz(powerFactorData['day_of_month'], 'DD', req.session.passport.user.timezone).format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
              postDataObj['toDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).subtract(1, 'd').format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
              postDataObj['isinstantaneous'] = 0;
              postDataObj['readingGap'] = ('undefined' != typeof powerFactorData['add_interval_gaps'] && null !== powerFactorData['add_interval_gaps']) ? powerFactorData['add_interval_gaps'] : true;
              dataPromiseAry.push(getPowerFactorDailyReadings(req, postDataObj));
              postDataObj['interval'] = 'fifteen';
              postDataObj['fromDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
              postDataObj['toDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
              dataPromiseAry.push(getPowerFactorFifteenMinutesReadings(req, postDataObj));
              postDataObj['interval'] = 'daily';
              postDataObj['fromDate'] = momentTimezone.tz(powerFactorData['day_of_month'], 'DD', req.session.passport.user.timezone).subtract(1, 'month').format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
              postDataObj['toDate'] = momentTimezone.tz(postDataObj['fromDate'], 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).add(1, 'month').subtract(1, 'd').format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
              dataPromiseAry.push(getPowerFactorDailyReadings(req, postDataObj));
              var powerFactorCycleDaysLastMonth = momentTimezone.tz(postDataObj['toDate'], 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).diff(momentTimezone.tz(postDataObj['fromDate'], 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone), 'd');
              powerFactorAry[index]['powerFactorCycleDaysLastMonth'] = powerFactorCycleDaysLastMonth + 1;
            }
            Promise.all(dataPromiseAry).then(function (promiseResults) {
              var readingDataObj = { 0: {}, 1: {}, 2: {}, 3: {}, 4: {} };
              // parameterAry.forEach(parameterId => {
              //   readingDataObj[0][nodeUniqueId + '_' + parameterId] = { startReading: null, endReading: null};
              //   readingDataObj[1][nodeUniqueId + '_' + parameterId] = { startReading: null, endReading: null};
              //   readingDataObj[2][nodeUniqueId + '_' + parameterId] = { startReading: null, endReading: null};
              // });
              // readingDataObj[3][nodeUniqueId+'_'+32] = { average: null};
              // readingDataObj[4][nodeUniqueId+'_'+45] = { average:null};
              parameterAry.forEach(parameterId => {
                readingDataObj[0][nodeUniqueId + '_' + parameterId] = { startReading: { unitReading: null, lowestUnitReading: null, lowestReading: null, reading: null, unit: '' }, endReading: { unitReading: null, lowestUnitReading: null, lowestReading: null, reading: null, unit: '' } };
                readingDataObj[1][nodeUniqueId + '_' + parameterId] = { startReading: { unitReading: null, lowestUnitReading: null, lowestReading: null, reading: null, unit: '' }, endReading: { unitReading: null, lowestUnitReading: null, lowestReading: null, reading: null, unit: '' } };
                readingDataObj[2][nodeUniqueId + '_' + parameterId] = { startReading: { unitReading: null, lowestUnitReading: null, lowestReading: null, reading: null, unit: '' }, endReading: { unitReading: null, lowestUnitReading: null, lowestReading: null, reading: null, unit: '' } };
              });
              readingDataObj[3][nodeUniqueId + '_' + 32] = { average: { unitReading: null, lowestUnitReading: null, lowestReading: null, reading: null, unit: '' } };
              readingDataObj[4][nodeUniqueId + '_' + 45] = { average: { unitReading: null, lowestUnitReading: null, lowestReading: null, reading: null, unit: '' } };
              for (var date in promiseResults[0]) {
                for (var nodeUniqueIdParamId in promiseResults[0][date]) {
                  if ('timestamp' == nodeUniqueIdParamId) {
                    continue;
                  }
                  if (null !== promiseResults[0][date][nodeUniqueIdParamId]['difference']['reading']) {
                    if (readingDataObj[0][nodeUniqueIdParamId]['startReading']['reading'] == null) {
                      readingDataObj[0][nodeUniqueIdParamId]['startReading']['reading'] = promiseResults[0][date][nodeUniqueIdParamId]['startReading']['reading'];
                      readingDataObj[1][nodeUniqueIdParamId]['startReading']['reading'] = promiseResults[0][date][nodeUniqueIdParamId]['startReading']['reading'];
                    }
                    if (readingDataObj[0][nodeUniqueIdParamId]['endReading']['reading'] == null) {
                      readingDataObj[0][nodeUniqueIdParamId]['endReading']['reading'] = promiseResults[0][date][nodeUniqueIdParamId]['endReading']['reading'];
                      readingDataObj[1][nodeUniqueIdParamId]['endReading']['reading'] = promiseResults[0][date][nodeUniqueIdParamId]['endReading']['reading'];
                    }
                    else {
                      readingDataObj[0][nodeUniqueIdParamId]['endReading']['reading'] = promiseResults[0][date][nodeUniqueIdParamId]['endReading']['reading'];
                      readingDataObj[1][nodeUniqueIdParamId]['endReading']['reading'] = promiseResults[0][date][nodeUniqueIdParamId]['endReading']['reading'];
                    }
                  }
                }
              }
              if (Object.keys(readingDataObj[0]).length > 0 || Object.keys(readingDataObj[1]).length > 0) {
                for (var date in promiseResults[1]) {
                  for (var nodeUniqueIdParamId in promiseResults[1][date]) {
                    if ('timestamp' == nodeUniqueIdParamId) {
                      continue;
                    }
                    if (null !== promiseResults[1][date][nodeUniqueIdParamId]['difference']['reading']) {
                      var length = Object.keys(readingDataObj[1][nodeUniqueIdParamId]).length;
                      if (length > 0) readingDataObj[1][nodeUniqueIdParamId]['endReading']['reading'] = promiseResults[1][date][nodeUniqueIdParamId]['endReading']['reading'];
                    }
                  }
                }
              }
              for (var date in promiseResults[2]) {
                for (var nodeUniqueIdParamId in promiseResults[2][date]) {
                  if ('timestamp' == nodeUniqueIdParamId) {
                    continue;
                  }
                  if (null !== promiseResults[2][date][nodeUniqueIdParamId]['difference']['reading']) {
                    if (readingDataObj[2][nodeUniqueIdParamId]['startReading']['reading'] == null) {
                      readingDataObj[2][nodeUniqueIdParamId]['startReading']['reading'] = promiseResults[2][date][nodeUniqueIdParamId]['startReading']['reading'];
                    }
                    if (readingDataObj[2][nodeUniqueIdParamId]['endReading']['reading'] == null) {
                      readingDataObj[2][nodeUniqueIdParamId]['endReading']['reading'] = promiseResults[2][date][nodeUniqueIdParamId]['endReading']['reading'];
                    }
                    else {
                      readingDataObj[2][nodeUniqueIdParamId]['endReading']['reading'] = promiseResults[2][date][nodeUniqueIdParamId]['endReading']['reading'];
                    }
                  }
                }
              }
              var postDataInstaObj = {};
              postDataInstaObj['nodeId'] = promiseResult[0][powerFactorData['app_id']];
              postDataInstaObj['parameterId'] = [32];
              postDataInstaObj['interval'] = 'daily';
              postDataInstaObj['fromDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).subtract(1, 'd').format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
              postDataInstaObj['toDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).subtract(1, 'd').format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
              postDataInstaObj['isinstantaneous'] = 1;
              postDataInstaObj['readingGap'] = ('undefined' != typeof powerFactorData['add_interval_gaps'] && null !== powerFactorData['add_interval_gaps']) ? powerFactorData['add_interval_gaps'] : true;
              instaPromiseAry.push(getYesterdayRealtimePF(req, postDataInstaObj));
              Promise.all(instaPromiseAry).then(function (instaResults) {
                readingDataObj[3][nodeUniqueId + '_' + 32] = { average: { unitReading: null, lowestUnitReading: null, lowestReading: null, reading: null, unit: '' } };
                for (var date in instaResults[0]) {
                  for (var nodeUniqueIdd in instaResults[0][date]) {
                    if ('timestamp' == nodeUniqueIdd) {
                      continue;
                    }
                    if (nodeUniqueId + '_32' == nodeUniqueIdd && null != instaResults[0][date][nodeUniqueId + '_32']['average']['reading']) {
                      readingDataObj[3][nodeUniqueId + '_32']['average']['reading'] = instaResults[0][date][nodeUniqueId + '_32']['average']['reading'];
                    }
                  }
                }
                var postDataInstaObj1 = {};
                postDataInstaObj1['nodeId'] = promiseResult[0][powerFactorData['app_id']];
                postDataInstaObj1['parameterId'] = [45];
                postDataInstaObj1['interval'] = 'monthly';
                postDataInstaObj1['fromDate'] = momentTimezone.tz().startOf('month').subtract(1, 'month').format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
                postDataInstaObj1['toDate'] = momentTimezone.tz().endOf('month').subtract(1, 'month').format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
                postDataInstaObj1['isinstantaneous'] = 1;
                postDataInstaObj1['readingGap'] = ('undefined' != typeof powerFactorData['add_interval_gaps'] && null !== powerFactorData['add_interval_gaps']) ? powerFactorData['add_interval_gaps'] : true;
                instaProAry.push(getLastMonthDemand(req, postDataInstaObj1));
                Promise.all(instaProAry).then(function (demandResults) {
                  readingDataObj[4][nodeUniqueId + '_' + 45] = { average: { unitReading: null, lowestUnitReading: null, lowestReading: null, reading: null, unit: '' } };
                  for (var date in demandResults[0]) {
                    for (var nodeUniqueIdd in demandResults[0][date]) {
                      if ('timestamp' == nodeUniqueIdd) {
                        continue;
                      }
                      if (null != demandResults[0][date][nodeUniqueId + '_45']['average']['reading']) {
                        readingDataObj[4][nodeUniqueId + '_45']['average']['reading'] = demandResults[0][date][nodeUniqueId + '_45']['average']['reading'];
                      }
                    }
                  }
                  powerFactorAry[index]['readingDataObj'] = readingDataObj;
                  resultIndex++;
                  if (powerFactorAry.length == resultIndex) {
                    res.json({ "result": powerFactorAry });
                    res.end();
                    return res;
                  }
                }).catch(err => {
                  //console.log('in instaPromiseAry block1', err)
                  res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
                  res.end();
                  return res;
                });
              }).catch(err => {
                //console.log('in demandpro block1', err)
                res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
                res.end();
                return res;
              });
            }).catch(err => {
              //console.log('in catch block1', err)
              res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
              res.end();
              return res;
            });
          }).catch(err => {
            //console.log('in catch block2', err)
            res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
            res.end();
            return res;
          });
        }
      });
    });
  });
});

function getYesterdayRealtimePF(req, postDataObj) {
  return new Promise((resolve, reject) => {
    req.body = postDataObj;
    common.getInstantaneousDailyData(req, function (error, data) {
      var readingDataObj = {};
      if (!data['error'] && 'undefined' != typeof data['data'] && Object.keys(data['data']).length > 0) {
        readingDataObj = data['data'];
      }
      return resolve(readingDataObj);
    });
  });
}

function getLastMonthDemand(req, postDataObj) {
  return new Promise((resolve, reject) => {
    req.body = postDataObj;
    common.getInstantaneousMonthlyData(req, function (error, data) {
      var readingDataObj = {};
      if (!data['error'] && 'undefined' != typeof data['data'] && Object.keys(data['data']).length > 0) {
        readingDataObj = data['data'];
      }
      return resolve(readingDataObj);
    });
  });
}

function getPowerFactorDailyReadings(req, postDataObj) {
  return new Promise((resolve, reject) => {
    req.body = postDataObj;
    common.getCummulativeDailyData(req, function (error, data) {
      var readingDataObj = {};
      if (!data['error'] && 'undefined' != typeof data['data'] && Object.keys(data['data']).length > 0) {
        readingDataObj = data['data'];
      }
      return resolve(readingDataObj);
    });
  });
}

function getPowerFactorFifteenMinutesReadings(req, postDataObj) {
  return new Promise((resolve, reject) => {
    req.body = postDataObj;
    common.getCummulativeFifteenMinutesData(req, function (error, data) {
      var readingDataObj = {};
      if (!data['error'] && 'undefined' != typeof data['data'] && Object.keys(data['data']).length > 0) {
        readingDataObj = data['data'];
      }
      return resolve(readingDataObj);
    });
  });
}

router.post('/submitPowerFactor', authenticationHelpers.isClientAuth, function (req, res) {
  var index = req.body.parameterAry.indexOf('32');
  if (index > -1) {
    req.body.parameterAry.splice(index, 1);
  }
  req.body.data.node = [req.body.data.node];
  req.body.action = 'edit';
  var postDataObj = {};
  postDataObj['nodeId'] = [req.body.data.nodeUniqueId];
  postDataObj['parameterId'] = req.body.parameterAry;
  postDataObj['interval'] = 'fifteen';
  postDataObj['fromDate'] = momentTimezone.tz(req.body.data.dayOfMonth, 'DD', req.session.passport.user.timezone).format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
  postDataObj['toDate'] = momentTimezone.tz(req.body.data.dayOfMonth, 'DD', req.session.passport.user.timezone).format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
  postDataObj['isinstantaneous'] = 0;
  postDataObj['readingGap'] = req.body.data.endInterval;
  Promise.all([getPFFifteenMinutesData(req, postDataObj)]).then(function (promiseResult) {
    var readingDataObj = promiseResult[0];
    var nodeUniqueId = req.body.data.nodeUniqueId;
    var wso2Query = true;
    if (Object.keys(readingDataObj).length == 0 || 'undefined' == typeof readingDataObj[nodeUniqueId + '_37'] || 'undefined' == typeof readingDataObj[nodeUniqueId + '_173'] || 'undefined' == typeof readingDataObj[nodeUniqueId + '_174']) {
      wso2Query = false;
    }
    req.body.wso2Query = wso2Query;
    assetanalysis.submitPowerFactor(req.body, req.session.passport.user.user_id, function (err, result) {
      if (err) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      ssh2ConnectionPF(req, res, readingDataObj);
    });
  }).catch(err => {
    res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
    res.end();
    return res;
  });
})


function getPFFifteenMinutesData(req, postDataObj) {
  return new Promise((resolve, reject) => {
    req.body = lodash.assign(req.body, postDataObj);
    common.getCummulativeFifteenMinutesData(req, function (error, readingData) {
      var readingDataObj = {};
      if (!readingData['error'] && 'undefined' != typeof readingData['data'] && Object.keys(readingData['data']).length > 0) {
        for (var key in readingData['data']) {
          for (var nodeUniqueId in readingData['data'][key]) {
            if ('timestamp' == nodeUniqueId) {
              continue;
            }
            if (null !== readingData['data'][key][nodeUniqueId]['difference']['reading']) {
              if ('undefined' == typeof readingDataObj[nodeUniqueId]) {
                readingDataObj[nodeUniqueId] = {}
              }
              var length = Object.keys(readingDataObj[nodeUniqueId]).length;
              if (length == 0) readingDataObj[nodeUniqueId] = readingData['data'][key][nodeUniqueId];
            }
          }
        }
      }
      return resolve(readingDataObj)
    });
  });
}

router.post('/deletePowerFactor', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.deletePowerFactor(req.body.id, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    req.body.action = 'delete';
    ssh2ConnectionPF(req, res, {});
  });
});

var ssh2ConnectionPF = function (req, res, readingDataObj) {
  var eventResult = {};
  eventResult['appId'] = req.body.id;
  general.ssh2Connection(function (err, sftp) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" + err, "result": eventResult });
      return res;
    }
    /*As our tool doesn't support '-' in file name so, replacing '-' by '_' from companyid and user_id */
    var companyId = req.session.passport.user.company_id.replace(/[-]/g, '_');
    var userId = req.session.passport.user.user_id.replace(/[-]/g, '_');
    var parameterObj = { 37: 'wh', 173: 'lag', 174: 'lead', 32: 'act_pf' };
    /* proceed further only after successfull creation of input and output stream.*/
    if (req.body.action == 'edit') {
      req.body.data.email = (null != req.body.data.email && req.body.data.email.length > 0) ? req.body.data.email.join() : "null";
      req.body.data.mobile = (null != req.body.data.mobile && req.body.data.mobile.length > 0) ? req.body.data.mobile[0] : "null";
      Promise.all([
        generatePFRecieverFile(sftp, companyId, req.body.data.nodeUniqueId, req.body.parameterAry, parameterObj),
        generatePFInputStreamFile(sftp, companyId, req.body.parameterAry, parameterObj),
        generatePFOutputStreamFile(sftp, userId)
      ]).then(function (resultOfStream) {
        if (1 == resultOfStream[0] && 1 == resultOfStream[1] && 1 == resultOfStream[2]) {
          Promise.all([
            generatePFExecutionPlanFile(sftp, req, companyId, userId, parameterObj, readingDataObj),
            generatePFPublisherFile(sftp, req, userId)
          ]).then(function (result) {
            res.json({ "error": false, "reason": "Power factor submitted succesfully." });
            res.end();
            return res;
          }).catch(error => {
            res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" + error });
            return res;
          });
        }
      }).catch(errorOfStream => {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" + errorOfStrem, "result": eventResult });
        return res;
      });
    }
    if (req.body.action == 'delete') {
      Promise.all([
        generatePFExecutionPlanFile(sftp, req, companyId, userId, parameterObj, readingDataObj)
      ]).then(function (resultOfStream) {
        if (1 == resultOfStream[0]) {
          res.json({ "error": false, "reason": "Power factor deleted succesfully." });
          res.end();
          return res;
        }
      }).catch(errorOfStream => {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" + errorOfStrem, "result": eventResult });
        return res;
      });
    }
  });
}

function generatePFRecieverFile(sftp, companyId, nodeUniqueId, parameterAry, parameterObj) {
  return new Promise((resolve, reject) => {
    try {
      /* Creating and writing node unique id wise receiver file in receiver path specified in config file */
      var readStream = sftp.createReadStream(marcconfig.REMOTEPATHFORRECEIVER + nodeUniqueId + '.xml');
      /* if receiver file already exist then return , do not write file again */
      readStream.on('data', function (chunk) {
        return resolve(1);
      });

      /* if receiver file not found then create one */
      readStream.on('error', function (err) {
        var errToString = err.toString();
        if ('Error: No such file' == errToString) {
          var PFInputStreamFileName = 'pf_inp_' + companyId;
          var PFReceiverFileName = 'pf_' + nodeUniqueId;
          var PFReceiverXML = '<?xml version="1.0" encoding="UTF-8"?>' +
            '\n<eventReceiver name="pf_' + nodeUniqueId + '" statistics="disable" trace="disable" xmlns="http://wso2.org/carbon/eventreceiver">' +
            '\n<from eventAdapterType="kafka">' +
            '\n<property name="events.duplicated.in.cluster">false</property>' +
            '\n<property name="zookeeper.connect">' + marcconfig.WSOZOOKEEPERCONNECTIONIP + '</property>' +
            '\n<property name="group.id">' + marcconfig.WSOZOOKEEPERGROUPID + '</property>' +
            '\n<property name="threads">' + marcconfig.WSOZOOKEEPERTOTALTHREADS + '</property>' +
            '\n<property name="topic">' + nodeUniqueId + '</property>' +
            '\n</from>' +
            '\n<mapping customMapping="enable" type="json">' +
            '\n<property>' +
            '\n<from jsonPath="meter"/>' +
            '\n<to name="meter" type="string"/>' +
            '\n</property>' +
            '\n<property>' +
            '\n<from jsonPath="slot"/>' +
            '\n<to name="time" type="string"/>' +
            '\n</property>';
          for (var paramId in parameterAry) {
            PFReceiverXML += '\n<property>' +
              '\n<from jsonPath="' + parameterAry[paramId] + '"/>' +
              '\n<to name="' + parameterObj[parameterAry[paramId]] + '" type="double"/>' +
              '\n</property>';
          }
          PFReceiverXML += '\n<property>' +
            '\n<from jsonPath="' + 32 + '"/>' +
            '\n<to name="' + parameterObj[32] + '" type="double"/>' +
            '\n</property>';
          PFReceiverXML += '\n</mapping>' +
            '\n<to streamName="' + PFInputStreamFileName + '" version="1.0.0"/>' +
            '\n</eventReceiver>';
          sftp.writeFile(marcconfig.REMOTEPATHFORRECEIVER + PFReceiverFileName + '.xml', PFReceiverXML, function (error) {
            if (error) {
              return reject(error);
            }
            return resolve(1);
          });
        }
      });
    } catch (exception) {
      return reject(exception);
    }
  });
}

function generatePFInputStreamFile(sftp, companyId, parameterAry, parameterObj) {
  return new Promise((resolve, reject) => {
    try {
      /* Creating and writing in input stream file */
      /* Company id wise input stream file in publisher path specified above */
      var PFInputStreamFileName = 'pf_inp_' + companyId;
      var readStream = sftp.createReadStream(marcconfig.REMOTEPATHFORSTREAMS + PFInputStreamFileName + '.json');
      /* if input file already exist then return , do not write file again */
      readStream.on('data', function (chunk) {
        return resolve(1);
      });
      /* if input file not found then write file */
      readStream.on('error', function (err) {
        var errToString = err.toString();
        if ('Error: No such file' == errToString) {
          var PFInpStreamAry = [{ "name": "meter", "type": "STRING" }];
          PFInpStreamAry.push({ "name": "time", "type": "STRING" });
          for (var paramId in parameterAry) {
            PFInpStreamAry.push({ "name": parameterObj[parameterAry[paramId]], "type": "DOUBLE" });
          }
          PFInpStreamAry.push({ 'name': "act_pf", "type": "DOUBLE" });
          var PFInpStreamFileContent = {
            "name": PFInputStreamFileName,
            "version": "1.0.0",
            "nickName": "",
            "description": "",
            "payloadData": PFInpStreamAry
          };
          sftp.writeFile(marcconfig.REMOTEPATHFORSTREAMS + PFInputStreamFileName + '.json', JSON.stringify(PFInpStreamFileContent), function (error) {
            if (error) {
              return reject(error);
            }
            return resolve(1);
          });
        }
      });
    } catch (exception) {
      return reject(exception);
    }
  });
}

function generatePFOutputStreamFile(sftp, userId) {
  return new Promise((resolve, reject) => {
    try {
      /* Creating and writing in output stream file */
      /* User id wise output stream file in publisher path specified above */
      var PFOutputStreamFileName = 'pf_out_' + userId;
      var PFOutStreamFileContent = {
        "name": PFOutputStreamFileName,
        "version": "1.0.0",
        "nickName": "",
        "description": "",
        "payloadData": [
          { "name": "cmp_id", "type": "STRING" },
          { "name": "user_id", "type": "STRING" },
          { "name": "node", "type": "STRING" },
          { "name": "meter", "type": "STRING" },
          { "name": "time", "type": "STRING" },
          { "name": "lag", "type": "DOUBLE" },
          { "name": "lead", "type": "DOUBLE" },
          { "name": "id", "type": "STRING" },
          { "name": "message", "type": "STRING" },
          { "name": "data", "type": "STRING" },
          { "name": "flag", "type": "STRING" },
          { "name": "c_type", "type": "STRING" },
          { "name": "emails", "type": "STRING" },
          { "name": "mobile_no", "type": "STRING" },
          { "name": "s1", "type": "BOOL" },
          { "name": "s2", "type": "BOOL" },
          { "name": "s3", "type": "BOOL" },
          { "name": "s4", "type": "BOOL" },
          { "name": "cal_pf", "type": "DOUBLE" },
          { "name": "pf_percentage", "type": "STRING" },
          { "name": "cycle_date", "type": "STRING" }
        ]
      };
      sftp.writeFile(marcconfig.REMOTEPATHFORSTREAMS + PFOutputStreamFileName + '.json', JSON.stringify(PFOutStreamFileContent), function (err) {
        if (err) {
          return reject(err);
        }
        return resolve(1);
      });
    } catch (exception) {
      return reject(exception);
    }
  });
}

function generatePFExecutionPlanFile(sftp, req, companyId, userId, parameterObj, readingDataObj) {
  return new Promise((resolve, reject) => {
    try {
      /* Creating and writing in excecution plan file */
      /* Company id wise excecution plan file  */
      var PFExecutionFileName = 'pf_exec_' + companyId + '.siddhiql';
      var readStream = sftp.createReadStream(marcconfig.REMOTEPATHFOREXECUTIONPLANS + PFExecutionFileName);
      var PFOutputStream = "/*Output stream " + userId + " start*/\n@Export('pf_out_" + userId + ":1.0.0')\ndefine stream pf_out_" + userId +
        " (cmp_id string, user_id string, node string, meter string, time string, lag double, lead double, id string, message string, data string, flag string, c_type string, emails string, mobile_no string, s1 bool, s2 bool, s3 bool, s4 bool, cal_pf double, pf_percentage string, cycle_date string);\n/*Output stream " + userId + " end*/\n\n/*Output Stream*/";
      var PFQueryString = '';
      if (req.body.action == 'edit' && req.body.wso2Query == true) {
        var billingCycleDate = momentTimezone.tz(req.body.data.dayOfMonth, 'DD', req.session.passport.user.timezone).format('YYYY-MM-DD');
        var nodeUniqueId = req.body.data.nodeUniqueId;
        var select = '\nselect \'' + req.session.passport.user.company_id + '\' as cmp_id, \'' + req.session.passport.user.user_id + '\' as user_id, ' +
          '\'' + req.body.data.nodeName + '\' as node, meter as meter, time as time,(DoubleTwoDigit(lag - ' + readingDataObj[nodeUniqueId + '_173']['startReading']['reading'] + ')) as lag,(DoubleTwoDigit(lead - ' + readingDataObj[nodeUniqueId + '_174']['startReading']['reading'] + ')) as lead, ';
        var dataString = '', pfDataString = '';
        dataString += "'" + req.body.data.node[0] + "'," + "'pf'";
        pfDataString += "'" + req.body.data.node[0] + "'," + "'pf'";
        for (var paramId in req.body.parameterAry) {
          dataString += ",'" + req.body.parameterAry[paramId] + "'," + 'DoubleTwoDigit(' + parameterObj[req.body.parameterAry[paramId]] + ' - ' + readingDataObj[nodeUniqueId + '_' + req.body.parameterAry[paramId]]['startReading']['reading'] + ')';
          pfDataString += ",'" + req.body.parameterAry[paramId] + "'," + '(' + 1 + ')';
        }
        dataString = dataString.replace(/"| /g, '');
        pfDataString = pfDataString.replace(/"| /g, '');
        var powerFactorPercent = '';
        for (var index in req.body.powerFactorPercent) {
          powerFactorPercent += ",'" + index + "','" + req.body.powerFactorPercent[index] + "'";
        }
        powerFactorPercent = powerFactorPercent.replace(/^,/, '');
        powerFactorPercent = powerFactorPercent.replace(/"| /g, '');
        if (req.body.data.ncpf == true) {
          var PFQuery = '';
          var NCPFQuery = '';
          var query1 = 'from pf_inp_' + companyId + ' [meter==\'' + nodeUniqueId + '\']#window.cron("00 30 18 * * ?")' + select + '\'' + req.body.id + '\' as id, \'' +
            req.body.data.message + '\' as message, dataStringConcat(' + pfDataString + ') as data, \'' + req.body.data.category + '\' as flag, \'' + req.body.data.communicationType + '\' as c_type, \'' + req.body.data.email + '\' as emails, \'' + req.body.data.mobile + '\' as mobile_no, ' + '(DoubleTwoDigit(avg(act_pf)) <= ' + req.body.data.penalty + ') as s1, ((DoubleTwoDigit(avg(act_pf)) >= ' + req.body.data.noIncentiveFrom + ') and (DoubleTwoDigit(avg(act_pf)) <= ' + req.body.data.noIncentiveTo + ' )) as s2, (DoubleTwoDigit(avg(act_pf)) >=' + req.body.data.incentive + ') as s3, false as s4 ,DoubleTwoDigit(avg(act_pf)) as cal_pf,' + 'percentStringConcat(' + powerFactorPercent + ') as pf_percentage,' + '\'' + billingCycleDate + ',' + req.body.data.penalty + ',' + req.body.data.noIncentiveFrom + ',' + req.body.data.noIncentiveTo + ',' + req.body.data.incentive + '\' as cycle_date' + '\noutput last every 1 min' + '\ninsert into pf_out_' + userId + ';';
          PFQueryString = '\n\n' + '/*PF ' + req.body.id + ' start*/' + "\n" + query + "\n" + '/*PF ' + req.body.id + ' end*/';

          var query = 'from pf_inp_' + companyId + ' [meter==\'' + nodeUniqueId + '\']#window.cron("00 30 18 * * ?")' + select + '\'' + req.body.id + '\' as id, \'' +
            req.body.data.message + '\' as message, dataStringConcat(' + dataString + ') as data, \'' + 'NCPF' + '\' as flag, \'' + req.body.data.communicationType + '\' as c_type, \'' + req.body.data.email + '\' as emails, \'' + req.body.data.mobile + '\' as mobile_no, ' +
            'DoubleTwoDigit(wh - ' + readingDataObj[nodeUniqueId + '_37']['startReading']['reading'] + ') / math:sqrt((((wh - ' + readingDataObj[nodeUniqueId + '_37']['startReading']['reading'] + ') * (wh - ' + readingDataObj[nodeUniqueId + '_37']['startReading']['reading'] + ') + (((lag - ' + readingDataObj[nodeUniqueId + '_173']['startReading']['reading'] + ') + (lead - ' + readingDataObj[nodeUniqueId + '_174']['startReading']['reading'] + ')) * ((lag - ' + readingDataObj[nodeUniqueId + '_173']['startReading']['reading'] + ') + (lead - ' + readingDataObj[nodeUniqueId + '_174']['startReading']['reading'] + ')))))) < ' + req.body.data.penalty + ' as s1, ' +
            '(DoubleTwoDigit((wh - ' + readingDataObj[nodeUniqueId + '_37']['startReading']['reading'] + ') / math:sqrt((((wh - ' + readingDataObj[nodeUniqueId + '_37']['startReading']['reading'] + ') * (wh - ' + readingDataObj[nodeUniqueId + '_37']['startReading']['reading'] + ') + (((lag - ' + readingDataObj[nodeUniqueId + '_173']['startReading']['reading'] + ') + (lead - ' + readingDataObj[nodeUniqueId + '_174']['startReading']['reading'] + ')) * ((lag - ' + readingDataObj[nodeUniqueId + '_173']['startReading']['reading'] + ') + (lead - ' + readingDataObj[nodeUniqueId + '_174']['startReading']['reading'] + '))))))) >= ' + req.body.data.noIncentiveFrom + ' and (DoubleTwoDigit(wh - ' + readingDataObj[nodeUniqueId + '_37']['startReading']['reading'] + ') / math:sqrt((((wh - ' + readingDataObj[nodeUniqueId + '_37']['startReading']['reading'] + ') * (wh - ' + readingDataObj[nodeUniqueId + '_37']['startReading']['reading'] + ') + (((lag - ' + readingDataObj[nodeUniqueId + '_173']['startReading']['reading'] + ') + (lead - ' + readingDataObj[nodeUniqueId + '_174']['startReading']['reading'] + ')) * ((lag - ' + readingDataObj[nodeUniqueId + '_173']['startReading']['reading'] + ') + (lead - ' + readingDataObj[nodeUniqueId + '_174']['startReading']['reading'] + '))))))) <= ' + req.body.data.noIncentiveTo + ' ) as s2, '
            + '((DoubleTwoDigit((wh - ' + readingDataObj[nodeUniqueId + '_37']['startReading']['reading'] + ') / math:sqrt((((wh - ' + readingDataObj[nodeUniqueId + '_37']['startReading']['reading'] + ') * (wh - ' + readingDataObj[nodeUniqueId + '_37']['startReading']['reading'] + ') + (((lag - ' + readingDataObj[nodeUniqueId + '_173']['startReading']['reading'] + ') + (lead - ' + readingDataObj[nodeUniqueId + '_174']['startReading']['reading'] + ')) * ((lag - ' + readingDataObj[nodeUniqueId + '_173']['startReading']['reading'] + ') + (lead - ' + readingDataObj[nodeUniqueId + '_174']['startReading']['reading'] + '))))))) > ' + req.body.data.incentive + ') and ((lag - ' + readingDataObj[nodeUniqueId + '_173']['startReading']['reading'] + ') < (lead - ' + readingDataObj[nodeUniqueId + '_174']['startReading']['reading'] + '))) as s3, ' +
            '((DoubleTwoDigit((wh - ' + readingDataObj[nodeUniqueId + '_37']['startReading']['reading'] + ') / math:sqrt((((wh - ' + readingDataObj[nodeUniqueId + '_37']['startReading']['reading'] + ') * (wh - ' + readingDataObj[nodeUniqueId + '_37']['startReading']['reading'] + ') + (((lag - ' + readingDataObj[nodeUniqueId + '_173']['startReading']['reading'] + ') + (lead - ' + readingDataObj[nodeUniqueId + '_174']['startReading']['reading'] + ')) * ((lag - ' + readingDataObj[nodeUniqueId + '_173']['startReading']['reading'] + ') + (lead - ' + readingDataObj[nodeUniqueId + '_174']['startReading']['reading'] + '))))))) > ' + req.body.data.incentive + ') and ((lag - ' + readingDataObj[nodeUniqueId + '_173']['startReading']['reading'] + ') >= (lead - ' + readingDataObj[nodeUniqueId + '_174']['startReading']['reading'] + '))) as s4 , ' +
            'DoubleTwoDigit((wh - ' + readingDataObj[nodeUniqueId + '_37']['startReading']['reading'] + ') / math:sqrt((((wh - ' + readingDataObj[nodeUniqueId + '_37']['startReading']['reading'] + ') * (wh - ' + readingDataObj[nodeUniqueId + '_37']['startReading']['reading'] + ') + (((lag - ' + readingDataObj[nodeUniqueId + '_173']['startReading']['reading'] + ') + (lead - ' + readingDataObj[nodeUniqueId + '_174']['startReading']['reading'] + ')) * ((lag - ' + readingDataObj[nodeUniqueId + '_173']['startReading']['reading'] + ') + (lead - ' + readingDataObj[nodeUniqueId + '_174']['startReading']['reading'] + '))))))) as cal_pf, ' +
            'percentStringConcat(' + powerFactorPercent + ') as pf_percentage,' + '\'' + billingCycleDate + ',' + req.body.data.penalty + ',' + req.body.data.noIncentiveFrom + ',' + req.body.data.noIncentiveTo + ',' + req.body.data.incentive + '\' as cycle_date' +
            '\noutput last every 1 min' +
            '\ninsert into pf_out_' + userId + ';';

          PFQuery = '\n\n' + '/*PF ' + req.body.id + ' start*/' + "\n" + query1 + "\n" + '/*PF ' + req.body.id + ' end*/';
          NCPFQuery = '\n\n' + '/*NCPF ' + req.body.id + ' start*/' + "\n" + query + "\n" + '/*NCPF ' + req.body.id + ' end*/';
          PFQueryString = PFQuery + "\n" + NCPFQuery;
        } else {
          var query = 'from pf_inp_' + companyId + ' [meter==\'' + nodeUniqueId + '\']#window.cron("00 30 18 * * ?")' + select + '\'' + req.body.id + '\' as id, \'' +
            req.body.data.message + '\' as message, dataStringConcat(' + pfDataString + ') as data, \'' + req.body.data.category + '\' as flag, \'' + req.body.data.communicationType + '\' as c_type, \'' + req.body.data.email + '\' as emails, \'' + req.body.data.mobile + '\' as mobile_no, ' + '(DoubleTwoDigit(avg(act_pf)) <= ' + req.body.data.penalty + ') as s1, ((DoubleTwoDigit(avg(act_pf)) >= ' + req.body.data.noIncentiveFrom + ') and (DoubleTwoDigit(avg(act_pf)) <= ' + req.body.data.noIncentiveTo + ' )) as s2, (DoubleTwoDigit(avg(act_pf)) >=' + req.body.data.incentive + ') as s3, false as s4 ,DoubleTwoDigit(avg(act_pf)) as cal_pf,' + 'percentStringConcat(' + powerFactorPercent + ') as pf_percentage,' + '\'' + billingCycleDate + ',' + req.body.data.penalty + ',' + req.body.data.noIncentiveFrom + ',' + req.body.data.noIncentiveTo + ',' + req.body.data.incentive + '\' as cycle_date' + '\noutput last every 1 min' + '\ninsert into pf_out_' + userId + ';';
          PFQueryString = '\n\n' + '/*PF ' + req.body.id + ' start*/' + "\n" + query + "\n" + '/*PF ' + req.body.id + ' end*/';
        }
      }

      var PFExecutionFileContent = '';
      /* if input file already exist then return , do not write file again */
      readStream.on('data', function (chunk) {
        PFExecutionFileContent = chunk.toString('utf8');
        var PFOutputStreamRegExp = new RegExp("\\n\\n\/\\*Output stream " + userId + " start\[\\s\\S\]\*\?Output stream " + userId + " end\\*\/", "gi");
        PFExecutionFileContent = PFExecutionFileContent.replace(PFOutputStreamRegExp, '');
        var PFQueryRegExp = "\\n\\n\/\\*PF " + req.body.id + " start\[\\s\\S\]\*\?PF " + req.body.id + " end\\*\/";
        var PFQueryRegExpNCPF = "\\n\\n\/\\*NCPF " + req.body.id + " start\[\\s\\S\]\*\?NCPF " + req.body.id + " end\\*\/";
        /* Replace PF and NCPF if already present */
        var PFRegExp = new RegExp(PFQueryRegExp, "gi");
        var NCPFRegExp = new RegExp(PFQueryRegExpNCPF, "gi");
        PFExecutionFileContent = PFExecutionFileContent.replace(PFRegExp, '');
        PFExecutionFileContent = PFExecutionFileContent.replace(NCPFRegExp, '');
        /* Replace output stream with string 'Output stream' Append PF */
        if (req.body.action == 'edit') {
          PFExecutionFileContent = PFExecutionFileContent.replace('\/\*Output Stream\*\/', PFOutputStream);
          PFExecutionFileContent = PFExecutionFileContent + PFQueryString;
        }
      });

      readStream.on('end', function () {
        try {
          if (PFExecutionFileContent != '') {
            sftp.writeFile(marcconfig.REMOTEPATHFOREXECUTIONPLANS + PFExecutionFileName, PFExecutionFileContent, function (err) {
              if (err) {
                return reject(err);
              }
              return resolve(1);
            });
          } else {
            return reject(0);
          }
        } catch (exception) {
          return reject(exception);
        }
      });
      /* if input file not found then write file */
      readStream.on('error', function (err) {
        var errToString = err.toString();
        if ('Error: No such file' == errToString) {
          /* if file doesn't exists create one and add input and output stream with (alarm or notification) into it */
          var PFInputStream = "/*Input stream start*/\n@Import('pf_inp_" + companyId + ":1.0.0')" + "\ndefine stream pf_inp_" + companyId + " (meter string, time string,";
          for (var paramId in req.body.parameterAry) {
            PFInputStream += parameterObj[req.body.parameterAry[paramId]] + ' double,';
          }
          PFInputStream += 'act_pf double,';
          PFInputStream = PFInputStream.replace(/,*$/, ") ;");
          PFInputStream += "\n/*Input stream end*/";
          /* for loop starts from 2 as parameters are passed from postion 3 onwards (postion 1 - node id, postion 2 - query type) */
          var PFDataString = "\n\n/*Data string concat function start*/" +
            "\ndefine function dataStringConcat[JavaScript] return string {" +
            "\n\tvar str = '{';" +
            "\n\tstr += '\"nodeId\":\"'+data[0]+'\",\"query\":\"'+data[1]+'\",\"parameterId\":{'" +
            "\n\tfor(var i=2;i<data.length;i++){" +
            "\n\t\tif(0 == i%2){" +
            "\n\t\t\tstr += ((2 != i) ? ',': '')+'\"'+data[i]+'\":';" +
            "\n\t\t}" +
            "\n\t\telse{" +
            "\n\t\t\tstr +='\"'+data[i]+'\"';" +
            "\n\t\t}" +
            "\n\t}" +
            "\n\tstr += '}}';" +
            "\n\treturn str;" +
            "\n};\n/*Data string concat function end*/";

          var PFPercentString = "\n\n/*Percent string concat function start*/" +
            "\ndefine function percentStringConcat[JavaScript] return string {" +
            "\n\tvar obj = {};" +
            "\n\tfor(var i=0;i<data.length;i++){" +
            "\n\t\tobj[data[i]] = data[++i];" +
            "\n\t}" +
            "\n\tvar res = '';" +
            "\n\tres = JSON.stringify(obj);" +
            "\n\treturn res;" +
            "\n};\n/*Percent string concat function end*/";

          var PFPercentFunction = "\n\n/*Percent number roundOff function start*/" +
            "\ndefine function DoubleTwoDigit[JavaScript] return double {" +
            "\n\tvar num =  parseFloat(Math.round(data * 100) / 100);" +
            "\n\treturn num;" +
            "\n};\n/*Percent number roundOff function end*/";

          var template = "/*Enter a unique ExecutionPlan*/\n@Plan:name('pf_exec_" + companyId + "')\n\n" + PFInputStream + "\n\n" + PFOutputStream + PFDataString + PFPercentString + PFPercentFunction + PFQueryString;
          sftp.writeFile(marcconfig.REMOTEPATHFOREXECUTIONPLANS + PFExecutionFileName, template, function (error) {
            if (error) {
              return reject(error);
            }
            return resolve(1);
          });
          return resolve(1);
        }
      });
    }
    catch (exception) {
      return reject(exception);
    }
  });
}

function generatePFPublisherFile(sftp, req, userId) {
  return new Promise((resolve, reject) => {
    try {
      /* User id wise email/sms file in publisher path specified above */
      var PFPublisherFileName = 'pf_pub_' + userId;
      var PFOutputStreamFileName = 'pf_out_' + userId;
      var readStream = sftp.createReadStream(marcconfig.REMOTEPATHFORPUBLISHERS + PFPublisherFileName + '.xml');
      readStream.on('data', function (chunk) {
        return resolve(1);
      });
      readStream.on('error', function (err) {
        var errToString = err.toString();
        if ('Error: No such file' == errToString) {
          var PFPublisherXML = '<?xml version="1.0" encoding="UTF-8"?>' +
            '\n<eventPublisher name="' + PFPublisherFileName + '" statistics="disable"' +
            '\ntrace="disable" xmlns="http://wso2.org/carbon/eventpublisher">' +
            '\n<from streamName="' + PFOutputStreamFileName + '" version="1.0.0"/>' +
            '\n<mapping customMapping="disable" type="json"/>' +
            '\n<to eventAdapterType="PFNotificationPublisher">' +
            '\n<property name="email.address">' + marcconfig.SMTPUSERNAME + '</property>' +
            '\n<property name="email.type">BOTH</property>' +
            '\n</to>' +
            '\n</eventPublisher>';
          sftp.writeFile(marcconfig.REMOTEPATHFORPUBLISHERS + PFPublisherFileName + '.xml', PFPublisherXML, function (error) {
            if (error) {
              return reject(error);
            }
            return resolve(1);
          });
        }
      });
    } catch (exception) {
      return reject(exception);
    }
  });
}

router.post('/submitRealtimePFParameters', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.submitRealtimePFParameters(req.body, req.session.passport.user.user_id, function (err) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Powerfactor submitted succesfully." });
    res.end();
    return res;
  })
})

router.post('/waterPlantList', authenticationHelpers.isClientAuth, function (req, res) {
  var sessionCompanyId = req.session.passport.user.company_id;
  var sessionPartnerId = req.session.passport.user.companiesObj[sessionCompanyId]['partner_id'];
  assetanalysis.waterPlantList(sessionPartnerId, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    if (!result['waterPlantList']) {
      res.json({ "error": true, "reason": "No records found." });
      return res;
    }
    var nodeModelObj = {};
    if (result['nodeModelAry']) {
      result['nodeModelAry'].forEach(function (nodeModel, v) {
        nodeModelObj[nodeModel.meter_model_id] = ((null != nodeModel.node_parameter_ids) ? nodeModel.node_parameter_ids.split(',').map(Number) : []);
        nodeModelObj[nodeModel.meter_model_id] = lodash.sortBy(nodeModelObj[nodeModel.meter_model_id]);
        nodeModelObj[nodeModel.meter_model_id].map(String);
      });
    }
    var responseObj = { nodeModelObj: nodeModelObj, waterPlantList: [] };
    var waterPlantAry = [];
    var resultIndex = 0;
    result['waterPlantList'].forEach(function (plantData, index) {
      waterPlantAry.push(plantData);
    });
    if (waterPlantAry.length == 0) {
      res.json({ "error": true, "reason": "No records found." });
      return res;
    }
    waterPlantAry.forEach(function (plantData, index) {
      var companyNodeObj = {}, companyNodeStatusObj = {}, dataPromiseAry = [], nodeUniqueIdAry = [], nodeListPromiseAry = [], locationListPromiseAry = [];
      waterPlantAry[index]['companyNodeObj'] = companyNodeObj;
      waterPlantAry[index]['companyNodeStatusObj'] = companyNodeStatusObj;
      waterPlantAry[index]['companyLocationObj'] = {};
      waterPlantAry[index]['todayFeed'] = (0).toFixed(2);
      waterPlantAry[index]['todayPermeate'] = (0).toFixed(2);
      waterPlantAry[index]['yesterdayFeed'] = (0).toFixed(2);
      waterPlantAry[index]['yesterdayPermeate'] = (0).toFixed(2);
      waterPlantAry[index]['defaultAnalyticsSetting'] = { interval: 'fifteen', parameter: ['263', '135'], chartType: 'bar', duration: 'Today', dateRange: '', node: [] };
      var partnerCompanyIdObj = {};
      for (var companyId in req.session.passport.user.companiesObj) {
        if (req.session.passport.user.companiesObj[companyId]['partner_id'] == result['partnerId']) {
          partnerCompanyIdObj[companyId] = req.session.passport.user.companiesObj[companyId];
        }
      }
      nodeListPromiseAry.push(companyNodeList(Object.keys(partnerCompanyIdObj)));
      Promise.all(nodeListPromiseAry).then(function (companyNodeAry) {
        if (nodeListPromiseAry.length == companyNodeAry.length) {
          var locationObj = {}, nodeId, companyId, nodeIdAry = [];
          for (var pCompanyId in partnerCompanyIdObj) {
            companyNodeObj[pCompanyId] = {};
            companyNodeStatusObj[pCompanyId] = {};
            locationListPromiseAry.push(companyLocationList(pCompanyId));
          }
          Promise.all(locationListPromiseAry).then(function (companyLocationAry) {
            if (locationListPromiseAry.length == companyLocationAry.length) {
              for (var companyIndex in companyLocationAry) {
                if ('undefined' != typeof companyLocationAry[companyIndex]) {
                  for (var locationIndex in companyLocationAry[companyIndex]) {
                    if ('undefined' != typeof companyLocationAry[companyIndex][locationIndex] && 'undefined' != typeof companyLocationAry[companyIndex][locationIndex]['latlong']) {
                      locationObj[companyLocationAry[companyIndex][locationIndex]['location_id']] = { latitude: companyLocationAry[companyIndex][locationIndex]['latlong']['latitude'], longitude: companyLocationAry[companyIndex][locationIndex]['latlong']['longitude'], locationName: companyLocationAry[companyIndex][locationIndex]['location_name'] };
                    }
                  }
                }
              }
              for (var companyIndex in companyNodeAry) {
                if ('undefined' != typeof companyNodeAry[companyIndex]) {
                  for (var nodeIndex in companyNodeAry[companyIndex]['nodeList']) {
                    if ('undefined' != typeof companyNodeAry[companyIndex]['nodeList'][nodeIndex]) {
                      nodeUniqueIdAry.push(companyNodeAry[companyIndex]['nodeList'][nodeIndex]['node_unique_id']);
                      nodeId = companyNodeAry[companyIndex]['nodeList'][nodeIndex]['node_id'].toString();
                      if (nodeIdAry.indexOf(nodeId) == -1) nodeIdAry.push(nodeId);
                      companyId = companyNodeAry[companyIndex]['nodeList'][nodeIndex]['company_id'].toString();
                      companyNodeObj[companyId][nodeId] = companyNodeAry[companyIndex]['nodeList'][nodeIndex];
                      companyNodeObj[companyId][nodeId]['location_data'] = locationObj[companyNodeAry[companyIndex]['nodeList'][nodeIndex]['location_id']];
                      companyNodeStatusObj[companyId] = companyNodeAry[companyIndex]['nodeObjectStatus'];
                    }
                  }
                }
              }
              waterPlantAry[index]['defaultAnalyticsSetting']['node'] = nodeIdAry;
              waterPlantAry[index]['companyLocationObj'] = locationObj;
              var currentDate = momentTimezone.tz(req.session.passport.user.timezone);
              var postData = {};
              postData['nodeId'] = nodeUniqueIdAry;
              postData['parameterId'] = [263, 135];
              postData['interval'] = 'hourly';
              postData['fromDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
              postData['toDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
              postData['isinstantaneous'] = 0;
              postData['readingGap'] = true;
              dataPromiseAry.push(getTodayWaterPlantFeedAndPermeate(req, postData));

              postData['fromDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).subtract(1, 'd').format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
              postData['toDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).subtract(1, 'd').format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
              dataPromiseAry.push(getYesterdayWaterPlantFeedAndPermeate(req, postData));

              Promise.all(dataPromiseAry).then(function (promiseResults) {
                waterPlantAry[index]['todayFeed'] = promiseResults[0]['todayFeed'];
                waterPlantAry[index]['todayPermeate'] = promiseResults[0]['todayPermeate'];
                waterPlantAry[index]['yesterdayFeed'] = promiseResults[1]['yesterdayFeed'];
                waterPlantAry[index]['yesterdayPermeate'] = promiseResults[1]['yesterdayPermeate'];
                resultIndex++;
                if (waterPlantAry.length == resultIndex) {
                  responseObj['waterPlantList'] = waterPlantAry;
                  res.json({ "result": responseObj });
                  res.end();
                  return res;
                }
              }).catch(err => {
                res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
                res.end();
                return res;
              });
            }
          }).catch(err => {
            res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
            return res;
          });
        }
      }).catch(err => {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      });
    });
  });
});

function getTodayWaterPlantFeedAndPermeate(req, postData) {
  return new Promise((resolve, reject) => {
    req.body = postData;
    rochemCommon.getCummulativeHourlyData(req, function (error, data) {
      var dataObj = { todayFeed: 0, todayPermeate: 0 };
      if (!data['error'] && 'undefined' != typeof data['data'] && Object.keys(data['data']).length > 0) {
        var readingDataObj = {}, length;
        for (var key in data['data']) {
          for (var nodeUniqueIdParamId in data['data'][key]) {
            if ('timestamp' == nodeUniqueIdParamId) {
              continue;
            }
            if (null !== data['data'][key][nodeUniqueIdParamId]['difference']) {
              if ('undefined' == typeof readingDataObj[nodeUniqueIdParamId]) {
                readingDataObj[nodeUniqueIdParamId] = {}
              }
              length = Object.keys(readingDataObj[nodeUniqueIdParamId]).length;
              readingDataObj[nodeUniqueIdParamId][length] = data['data'][key][nodeUniqueIdParamId];
            }
          }
        }
        for (var nodeUniqueIdParamId in readingDataObj) {
          if ('undefined' == typeof readingDataObj[nodeUniqueIdParamId]) { continue; }
          var nodeUniqueIdParamIdAry = nodeUniqueIdParamId.split('_');
          var lastKey = Object.keys(readingDataObj[nodeUniqueIdParamId]).length - 1;
          var difference = readingDataObj[nodeUniqueIdParamId][lastKey]['endReading'] - readingDataObj[nodeUniqueIdParamId][0]['startReading'];
          if (nodeUniqueIdParamIdAry[1] == 263) dataObj['todayFeed'] += (null !== difference) ? difference : 0;
          if (nodeUniqueIdParamIdAry[1] == 135) dataObj['todayPermeate'] += (null !== difference) ? difference : 0;
        }
      }
      return resolve(dataObj);
    });
  })
}

function getYesterdayWaterPlantFeedAndPermeate(req, postData) {
  return new Promise((resolve, reject) => {
    req.body = postData;
    rochemCommon.getCummulativeHourlyData(req, function (error, data) {
      var dataObj = { yesterdayFeed: 0, yesterdayPermeate: 0 };
      if (!data['error'] && 'undefined' != typeof data['data'] && Object.keys(data['data']).length > 0) {
        for (var key in data['data']) {
          for (var nodeUniqueIdParamId in data['data'][key]) {
            if ('timestamp' == nodeUniqueIdParamId) {
              continue;
            }
            var nodeUniqueIdParamIdAry = nodeUniqueIdParamId.split('_');
            if (data['data'][key][nodeUniqueIdParamId]['difference'] != null) {
              if (nodeUniqueIdParamIdAry[1] == 263) dataObj['yesterdayFeed'] += data['data'][key][nodeUniqueIdParamId]['difference'];
              if (nodeUniqueIdParamIdAry[1] == 135) dataObj['yesterdayPermeate'] += data['data'][key][nodeUniqueIdParamId]['difference'];
            }
          }
        }
      }
      return resolve(dataObj);
    });
  });
}

function companyNodeList(companyId) {
  return new Promise((resolve, reject) => {
    assetanalysis.companyNodeList(companyId, function (err, result) {
      if (err) {
        return reject(0);
      }
      return resolve(result);
    });
  });
}

function companyLocationList(companyId) {
  return new Promise((resolve, reject) => {
    assetanalysis.companyLocationList(companyId, function (err, result) {
      if (err) {
        return reject(0);
      }
      return resolve(result);
    });
  });
}

router.post('/deleteWaterPlant', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.deleteWaterPlant(req.body.id, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Water plant deleted successfully." });
    res.end();
    return res;
  });
});

router.post('/waterPlantRealtimeSettings', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.waterPlantRealtimeSettings(req.body, req.session.passport.user.user_id, function (err) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Water plant submitted successfully." });
    res.end();
    return res;
  });
});

router.post('/submitWaterPlantAnalyticsSetting', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.submitWaterPlantAnalyticsSetting(req.body, req.session.passport.user.user_id, function (err) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Water plant submitted succesfully." });
    res.end();
    return res;
  });
});

router.post('/saveWidgetStateData', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.saveWidgetStateData(req.body, req.session.passport.user.user_id, function (err) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Water plant widgets submitted succesfully." });
    res.end();
    return res;
  });
});

router.post('/machineList', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.machineList(req.session.passport.user, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    if (!result) {
      res.json({ "error": true, "reason": "No records found." });
      return res;
    }
    res.json({ "error": false, "result": result });
    res.end();
    return res;
  });
});

router.post('/machineStateBasicSettings', authenticationHelpers.isClientAuth, function (req, res) {
  req.checkBody("data.node", "Node is required.").notEmpty();
  req.checkBody("data.parameter", "Parameter is required.").notEmpty();
  req.checkBody("data.setPoint", "Set point is required.").notEmpty();
  var errorMsg = '';
  req.getValidationResult().then(function (err) {
    if (!err.isEmpty()) {
      err.array().map(function (elem) {
        errorMsg += elem.msg + "\n";
      });
      errorMsg = errorMsg.trim("\n");
      res.json({ "error": true, "reason": errorMsg });
      return res;
    }
    sparkAPI.startMachineStateSparkJob(req.body.data, req.body.id, function (err, data) {
      if (err) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      assetanalysis.machineStateBasicSettings(req.body, function (err) {
        if (err) {
          res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
          return res;
        }
        res.json({ "error": false, "reason": "Settings saved successfully." });
        res.end();
        return res;
      });
    });
  });
});

router.post('/deleteMachine', authenticationHelpers.isClientAuth, function (req, res) {
  sparkAPI.stopMachineStateSparkJob(req.body.queryParameters, req.body.id, function (err, data) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    assetanalysis.deleteMachine(req.body.id, function (err, result) {
      if (err) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      res.json({ "error": false, "reason": "Machine performance monitoring deleted successfully." });
      res.end();
      return res;
    });
  });
});


/* ??????????? Query ??????????? */
router.post('/tenantList', authenticationHelpers.isClientAuth, function (req, res) {
  /**get all the list of apps from tenant table */
  assetanalysis.tenantList(req.session.passport.user.company_id, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    if (!result) {
      res.json({ "error": true, "reason": "No records found." });
      return res;
    }
    var tenantDataAry = [];
    var resultIndex = 0;
    // result.forEach(function (tenantData, index) {
    //   if ('public' == tenantData['app_type'] || 'private' == tenantData['app_type'] && req.session.passport.user.user_id == tenantData['user_id']) {
    //     tenantDataAry.push(tenantData);
    //   }
    // });


    commonfunction.AllappList(req.session.passport.user, result, 'tenant', function (err, data) {
      if (err) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      if (!data) {
        res.json({ "error": true, "reason": "No records found." });
        return res;
      }


      tenantDataAry = data;
      if (tenantDataAry.length == 0) {
        res.json({ "error": true, "reason": "No records found" });
        return res;
      }



      tenantDataAry.forEach(function (tenantData, index) {
        /**set energy generation value to zero and default analytics setting values */
        tenantDataAry[index]['todayEnergyGeneration'] = (0).toFixed(2);
        tenantDataAry[index]['yesterdayEnergyGeneration'] = (0).toFixed(2);
        tenantDataAry[index]['thisMonthEnergyGeneration'] = (0).toFixed(2);
        tenantDataAry[index]['lastMonthEnergyGeneration'] = (0).toFixed(2);
        tenantDataAry[index]['defaultAnalyticsSetting'] = { interval: 'fifteen', parameter: ['37'], chartType: 'bar', duration: 'Today', dateRange: '', node: [] };
        if (null == tenantData['facility']) {
          resultIndex++;
          if (tenantDataAry.length == resultIndex) {
            res.json({ "result": tenantDataAry });
            res.end();
            return res;
          }
        }

        if (null != tenantData['facility']) {
          var tenantDataObj = { nodesAry: [], tenantUserWiseNode: {}, promiseAry: [], dataPromiseAry: [], userWiseNodeObj: {}, nodeCountObj: {}, tenantFacilityDataObj: {}, tenantSettingDataObj: {}, userWiseConsumption: {} }
          tenantDataObj['tenantFacilityDataObj'] = JSON.parse(tenantData['facility']);
          tenantDataObj['tenantSettingDataObj'] = JSON.parse(tenantData['tenant_setting']);
          /**push common facility and tenant individual nodes in nodesAry and created userwise nodes object as well as created nodecount object */
          Object.keys(tenantDataObj['tenantFacilityDataObj']).forEach(function (index) {
            if (tenantDataObj['nodesAry'].indexOf(tenantDataObj['tenantFacilityDataObj'][index]['node']) == -1) tenantDataObj['nodesAry'].push(tenantDataObj['tenantFacilityDataObj'][index]['node']);
          });
          for (var tenantIndex in tenantDataObj['tenantSettingDataObj']) {
            if (tenantDataObj['nodesAry'].indexOf(tenantDataObj['tenantSettingDataObj'][tenantIndex]['tenantNode']) == -1) tenantDataObj['nodesAry'].push(tenantDataObj['tenantSettingDataObj'][tenantIndex]['tenantNode']);
            tenantDataObj['tenantUserWiseNode'][tenantDataObj['tenantSettingDataObj'][tenantIndex]['users']] = tenantDataObj['tenantSettingDataObj'][tenantIndex]['tenantNode'];
            if ('undefined' == typeof tenantDataObj['userWiseNodeObj'][tenantDataObj['tenantSettingDataObj'][tenantIndex]['users']]) {
              tenantDataObj['userWiseNodeObj'][tenantDataObj['tenantSettingDataObj'][tenantIndex]['users']] = [];
            }
            tenantDataObj['tenantSettingDataObj'][tenantIndex]['facility'].forEach(facilityIndex => {
              tenantDataObj['userWiseNodeObj'][tenantDataObj['tenantSettingDataObj'][tenantIndex]['users']].push(tenantDataObj['tenantFacilityDataObj'][facilityIndex]['node']);
              if (tenantDataObj['nodeCountObj'].hasOwnProperty(tenantDataObj['tenantFacilityDataObj'][facilityIndex]['node'])) {
                tenantDataObj['nodeCountObj'][tenantDataObj['tenantFacilityDataObj'][facilityIndex]['node']] = ++tenantDataObj['nodeCountObj'][tenantDataObj['tenantFacilityDataObj'][facilityIndex]['node']];
              }
              else {
                tenantDataObj['nodeCountObj'][tenantDataObj['tenantFacilityDataObj'][facilityIndex]['node']] = 1;
              }
            });
          }
          tenantDataObj['promiseAry'].push(getTenantNodes(tenantDataObj['nodesAry'], tenantData['app_id']));/**get nodeUniqueId array and nodeIdwise nodeuniqueid object */
          Promise.all(tenantDataObj['promiseAry']).then(function (promiseResult) {
            var currentDate = momentTimezone.tz(req.session.passport.user.timezone);
            var nodeUniqueId = promiseResult[0][tenantData['app_id']]['nodeUniqueIdAry'];
            var postDataObj = {};
            postDataObj['nodeId'] = nodeUniqueId;
            postDataObj['parameterId'] = [37];
            postDataObj['interval'] = 'hourly';
            postDataObj['fromDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
            postDataObj['toDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
            postDataObj['isinstantaneous'] = 0;
            tenantDataObj['dataPromiseAry'].push(getTenantTodayGeneration(req, postDataObj));

            postDataObj['interval'] = 'daily';
            postDataObj['fromDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).subtract(1, 'd').format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
            postDataObj['toDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).subtract(1, 'd').format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
            tenantDataObj['dataPromiseAry'].push(getTenantYesterdayGeneration(req, postDataObj));

            postDataObj['interval'] = 'monthly';
            postDataObj['fromDate'] = momentTimezone.tz().startOf('month').format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
            postDataObj['toDate'] = momentTimezone.tz().endOf('month').format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
            tenantDataObj['dataPromiseAry'].push(getTenantMonthlyGeneration(req, postDataObj));

            postDataObj['interval'] = 'monthly';
            postDataObj['fromDate'] = momentTimezone.tz().startOf('month').subtract(1, 'month').format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
            postDataObj['toDate'] = momentTimezone.tz().endOf('month').subtract(1, 'month').format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
            tenantDataObj['dataPromiseAry'].push(getTenantLastMonthGeneration(req, postDataObj));

            /** userwise consumption today,yesterday,this month,last month */
            Promise.all(tenantDataObj['dataPromiseAry']).then(function (promiseResults) {
              for (var userId in tenantDataObj['userWiseNodeObj']) {
                var indNodeUniqueId = promiseResult[0][tenantData['app_id']]['nodeIdWiseObj'][tenantDataObj['tenantUserWiseNode'][userId]];
                var indTodayConsumption = ('undefined' == typeof promiseResults[0]['nodeWiseDataToday'][indNodeUniqueId]) ? 0 : promiseResults[0]['nodeWiseDataToday'][indNodeUniqueId];
                var indYesterdayConsumption = ('undefined' == typeof promiseResults[1]['nodeWiseDataYesterday'][indNodeUniqueId]) ? 0 : promiseResults[1]['nodeWiseDataYesterday'][indNodeUniqueId];
                var indThisMonthConsumption = ('undefined' == typeof promiseResults[2] || 'undefined' == typeof promiseResults[2]['nodewiseDataMonthly'][indNodeUniqueId]) ? 0 : promiseResults[2]['nodewiseDataMonthly'][indNodeUniqueId];
                var indLastMonthConsumption = ('undefined' == typeof promiseResults[3] || 'undefined' == typeof promiseResults[3]['nodewiseDataMonthly'][indNodeUniqueId]) ? 0 : promiseResults[3]['nodewiseDataMonthly'][indNodeUniqueId];
                if ('undefined' == typeof tenantDataObj['userWiseConsumption'][userId]) {
                  tenantDataObj['userWiseConsumption'][userId] = { today: { individual: indTodayConsumption, common: 0, total: {} }, yesterday: { individual: indYesterdayConsumption, common: 0, total: {} }, thisMonth: { individual: indThisMonthConsumption, common: 0, total: {} }, lastMonth: { individual: indLastMonthConsumption, common: 0, total: {} } };
                }
                for (var key in tenantDataObj['userWiseNodeObj'][userId]) {
                  var nodeUniqId = promiseResult[0][tenantData['app_id']]['nodeIdWiseObj'][tenantDataObj['userWiseNodeObj'][userId][key]];
                  var nodeTodayConsumption = ('undefined' == typeof promiseResults[0]['nodeWiseDataToday'][nodeUniqId]) ? 0 : promiseResults[0]['nodeWiseDataToday'][nodeUniqId];
                  var nodeYesterdayConsumption = ('undefined' == typeof promiseResults[1]['nodeWiseDataYesterday'][nodeUniqId]) ? 0 : promiseResults[1]['nodeWiseDataYesterday'][nodeUniqId];
                  var nodeThisMonthConsumption = ('undefined' == typeof promiseResults[2] || 'undefined' == typeof promiseResults[2]['nodewiseDataMonthly'][nodeUniqId]) ? 0 : promiseResults[2]['nodewiseDataMonthly'][nodeUniqId];
                  var nodeLastMonthConsumption = ('undefined' == typeof promiseResults[3] || 'undefined' == typeof promiseResults[3]['nodewiseDataMonthly'][nodeUniqId]) ? 0 : promiseResults[3]['nodewiseDataMonthly'][nodeUniqId];
                  var nodeCount = tenantDataObj['nodeCountObj'][tenantDataObj['userWiseNodeObj'][userId][key]];
                  var todayConsumption = nodeTodayConsumption / nodeCount;
                  var yesterdayConsumption = nodeYesterdayConsumption / nodeCount;
                  var thisMonthConsumption = nodeThisMonthConsumption / nodeCount;
                  var lastMonthConsumption = nodeLastMonthConsumption / nodeCount;
                  tenantDataObj['userWiseConsumption'][userId]['today']['common'] += todayConsumption;
                  tenantDataObj['userWiseConsumption'][userId]['yesterday']['common'] += yesterdayConsumption;
                  tenantDataObj['userWiseConsumption'][userId]['thisMonth']['common'] += thisMonthConsumption;
                  tenantDataObj['userWiseConsumption'][userId]['lastMonth']['common'] += lastMonthConsumption;
                }
                tenantDataObj['userWiseConsumption'][userId]['today']['total'] = tenantDataObj['userWiseConsumption'][userId]['today']['individual'] + tenantDataObj['userWiseConsumption'][userId]['today']['common'];
                tenantDataObj['userWiseConsumption'][userId]['yesterday']['total'] = tenantDataObj['userWiseConsumption'][userId]['yesterday']['individual'] + tenantDataObj['userWiseConsumption'][userId]['yesterday']['common'];
                tenantDataObj['userWiseConsumption'][userId]['thisMonth']['total'] = tenantDataObj['userWiseConsumption'][userId]['thisMonth']['individual'] + tenantDataObj['userWiseConsumption'][userId]['thisMonth']['common'];
                tenantDataObj['userWiseConsumption'][userId]['lastMonth']['total'] = tenantDataObj['userWiseConsumption'][userId]['lastMonth']['individual'] + tenantDataObj['userWiseConsumption'][userId]['lastMonth']['common'];
              }
              tenantDataAry[index]['nodeCountObj'] = tenantDataObj['nodeCountObj'];
              tenantDataAry[index]['individualUserNodes'] = tenantDataObj['userWiseNodeObj'];
              tenantDataAry[index]['commonUserNodes'] = tenantDataObj['userWiseNodeObj'];
              tenantDataAry[index]['defaultAnalyticsSetting']['node'] = tenantDataObj['nodesAry'];
              tenantDataAry[index]['userWiseConsumption'] = tenantDataObj['userWiseConsumption'];
              tenantDataAry[index]['todayEnergyGeneration'] = promiseResults[0]['todayTenantEnergyGenaration'];
              tenantDataAry[index]['yesterdayEnergyGeneration'] = promiseResults[1]['yesterdayTenantEnergyGenaration'];
              tenantDataAry[index]['thisMonthEnergyGeneration'] = ('undefined' == typeof promiseResults[2]) ? 0 : promiseResults[2]['tenantMonthlyEnergyGeneration'];
              tenantDataAry[index]['lastMonthEnergyGeneration'] = ('undefined' == typeof promiseResults[3]) ? 0 : promiseResults[3]['tenantMonthlyEnergyGeneration'];
              resultIndex++;
              if (tenantDataAry.length == resultIndex) {
                res.json({ "result": tenantDataAry });
                res.end();
                return res;
              }
            }).catch(err => {
              //console.log('err1 here', err)
              res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
              res.end();
              return res;
            });
          }).catch(err => {
            //console.log('err2 here', err)
            res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
            res.end();
            return res;
          });
        }
      });
    });
  });
});

function getTenantNodes(nodeIds, appId) {
  return new Promise((resolve, reject) => {
    assetanalysis.getNodes(nodeIds, function (err, result) {
      if (err) {
        return reject(err);
      }
      var nodeUniqueIdObj = {};
      for (var i = 0; i < result.length; i++) {
        if ('undefined' == typeof nodeUniqueIdObj[appId]) {
          nodeUniqueIdObj[appId] = { nodeIdWiseObj: {}, nodeUniqueIdAry: [] };
        }
        nodeUniqueIdObj[appId]['nodeIdWiseObj'][result[i]['node_id']] = result[i]['node_unique_id'];
        nodeUniqueIdObj[appId]['nodeUniqueIdAry'].push(result[i]['node_unique_id']);
      }
      return resolve(nodeUniqueIdObj);
    });
  });
}

function getTenantTodayGeneration(req, postDataObj) {
  return new Promise((resolve, reject) => {
    req.body = postDataObj;
    common.getCummulativeHourlyData(req, function (error, tenantReadingdata) {
      var todayDataObj = { todayTenantEnergyGenaration: 0, nodeWiseDataToday: {} }
      if (!tenantReadingdata['error'] && 'undefined' != typeof tenantReadingdata['data'] && Object.keys(tenantReadingdata['data']).length > 0) {
        var readingDataObj = {}, length;
        for (let key in tenantReadingdata['data']) {
          for (let tenantIndex in tenantReadingdata['data'][key]) {
            if (tenantIndex == 'timestamp') {
              continue;
            }
            if (null !== tenantReadingdata['data'][key][tenantIndex]['difference']['reading']) {
              if ('undefined' == typeof readingDataObj[tenantIndex]) {
                readingDataObj[tenantIndex] = {};
              }
              length = Object.keys(readingDataObj[tenantIndex]).length;
              readingDataObj[tenantIndex][length] = tenantReadingdata['data'][key][tenantIndex];
            }
          }
        }
        for (let tenantReadingIndex in readingDataObj) {
          if ('undefined' == typeof readingDataObj[tenantReadingIndex]) { continue; }
          var lastKey = Object.keys(readingDataObj[tenantReadingIndex]).length - 1;
          var difference = readingDataObj[tenantReadingIndex][lastKey]['endReading']['reading'] - readingDataObj[tenantReadingIndex][0]['startReading']['reading'];
          todayDataObj['todayTenantEnergyGenaration'] += (null !== difference) ? difference : 0;
          var nodeId = tenantReadingIndex.split('_');
          todayDataObj.nodeWiseDataToday[nodeId[0]] = (null !== difference) ? difference : 0;
        }
      }
      return resolve(todayDataObj)
    });
  });
}


function getTenantYesterdayGeneration(req, postData) {
  return new Promise((resolve, reject) => {
    req.body = postData;
    common.getCummulativeDailyData(req, function (error, data) {
      var yesterdayDataObj = { yesterdayTenantEnergyGenaration: 0, nodeWiseDataYesterday: {} }
      if (!data['error'] && 'undefined' != typeof data['data'] && Object.keys(data['data']).length > 0) {
        for (var key in data['data']) {
          for (var deviceId in data['data'][key]) {
            if ('timestamp' == deviceId) {
              continue;
            }
            if (data['data'][key][deviceId]['difference']['reading'] != null) {
              yesterdayDataObj['yesterdayTenantEnergyGenaration'] = (null !== data['data'][key][deviceId]['difference']['reading']) ? data['data'][key][deviceId]['difference']['reading'] : 0;
              var nodeId = deviceId.split('_');
              yesterdayDataObj.nodeWiseDataYesterday[nodeId[0]] = (null !== data['data'][key][deviceId]['difference']['reading']) ? data['data'][key][deviceId]['difference']['reading'] : 0;
            }
          }
        }
      }
      return resolve(yesterdayDataObj);
    });
  });
}

function getTenantLastMonthGeneration(req, postDataObj) {
  return new Promise((resolve, reject) => {
    req.body = postDataObj;
    common.getCummulativeMonthlyData(req, function (error, tenantReadingData) {
      if (!tenantReadingData['error'] && 'undefined' != typeof tenantReadingData['data'] && Object.keys(tenantReadingData['data']).length > 0) {
        var readingDataObj = { tenantMonthlyEnergyGeneration: 0, nodewiseDataMonthly: {} };
        for (var key in tenantReadingData['data']) {
          for (var tenantIndex in tenantReadingData['data'][key]) {
            if (tenantIndex == 'timestamp') {
              continue;
            }
            if (null != tenantReadingData['data'][key][tenantIndex]['difference']['reading']) {
              readingDataObj['tenantMonthlyEnergyGeneration'] += (null !== tenantReadingData['data'][key][tenantIndex]['difference']['reading']) ? tenantReadingData['data'][key][tenantIndex]['difference']['reading'] : 0;
              var nodeId = tenantIndex.split('_');
              readingDataObj['nodewiseDataMonthly'][nodeId[0]] = (null !== tenantReadingData['data'][key][tenantIndex]['difference']['reading']) ? tenantReadingData['data'][key][tenantIndex]['difference']['reading'] : 0;
            }
          }
        }
      }
      return resolve(readingDataObj)
    });
  });
}

function getTenantMonthlyGeneration(req, postDataObj) {
  return new Promise((resolve, reject) => {
    req.body = postDataObj;
    common.getCummulativeMonthlyData(req, function (error, tenantReadingData) {
      if (!tenantReadingData['error'] && 'undefined' != typeof tenantReadingData['data'] && Object.keys(tenantReadingData['data']).length > 0) {
        var readingDataObj = { tenantMonthlyEnergyGeneration: 0, nodewiseDataMonthly: {} };
        for (var key in tenantReadingData['data']) {
          for (var tenantIndex in tenantReadingData['data'][key]) {
            if (tenantIndex == 'timestamp') {
              continue;
            }
            if (null != tenantReadingData['data'][key][tenantIndex]['difference']['reading']) {
              readingDataObj['tenantMonthlyEnergyGeneration'] += (null !== tenantReadingData['data'][key][tenantIndex]['difference']['reading']) ? tenantReadingData['data'][key][tenantIndex]['difference']['reading'] : 0;
              var nodeId = tenantIndex.split('_');
              readingDataObj['nodewiseDataMonthly'][nodeId[0]] = (null !== tenantReadingData['data'][key][tenantIndex]['difference']['reading']) ? tenantReadingData['data'][key][tenantIndex]['difference']['reading'] : 0;
            }
          }
        }
      }
      return resolve(readingDataObj)
    });
  });
}

router.post('/deleteTenant', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.deleteTenant(req.body.id, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Tenant app deleted successfully." });
    res.end();
    return res;
  });
});

router.post('/submitCommonTenantSetting', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.submitCommonTenantSetting(req.body, req.session.passport.user.user_id, function (err) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Common tenant settings submitted succesfully." });
    res.end();
    return res;
  });
});

router.post('/submitTenantSetting', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.submitTenantSetting(req.body, req.session.passport.user.user_id, function (err) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Tenant setting submitted succesfully." });
    res.end();
    return res;
  });
});

router.post('/submitTenantAnalyticsSettings', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.submitTenantAnalyticsSettings(req.body, req.session.passport.user.user_id, function (err) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Tenant app submitted succesfully." });
    res.end();
    return res;
  });
});

router.post('/submitBillingSetting', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.submitBillingSetting(req.body, req.session.passport.user.user_id, function (err) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Tenant app billing submitted succesfully." });
    res.end();
    return res;
  });
});

/***********nodejs/routes/client/asset-analysis.js************/

router.post('/nodeConsumption', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.nodeConsumption(req.body.app_id, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    try {
      var currentDate = momentTimezone.tz(req.session.passport.user.timezone);
      var postData = {};
      var dataPromiseAry = [];
      var solarPlantAry = {};
      var otherSettingObj = JSON.parse(result[0]['other_setting']);
      postData['nodeId'] = req.body.nodeId;
      postData['parameterId'] = [37];
      postData['interval'] = 'hourly';
      postData['fromDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
      postData['toDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
      postData['isinstantaneous'] = 0;
      postData['readingGap'] = true
      //for TodayConsumption
      dataPromiseAry.push(getTodayConsumption(req, postData));

      postData['interval'] = 'daily';
      postData['fromDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).subtract(1, 'd').format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
      postData['toDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).subtract(1, 'd').format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
      //for YesterdayConsumption
      dataPromiseAry.push(getYesterdayConsumption(req, postData));

      postData['interval'] = 'monthly';
      postData['fromDate'] = momentTimezone.tz(result[0].installation_date, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).subtract(1, 'd').format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
      postData['toDate'] = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone).format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
      //for totalKWh and totalINRSaved
      dataPromiseAry.push(getMonthlyConsumption(req, postData, otherSettingObj));
    } catch (exception) {
      //console.log('exception here', exception)
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      res.end();
      return res;
    }
    Promise.all(dataPromiseAry).then(function (promiseResults) {
      solarPlantAry['todayConsumption'] = promiseResults[0];
      solarPlantAry['yesterdayConsumption'] = promiseResults[1];
      solarPlantAry['totalKWh'] = promiseResults[2]['totalKWh'];
      solarPlantAry['totalINRSaved'] = promiseResults[2]['totalINRSaved'];
      res.json(solarPlantAry);
      res.end();
      return res;
    }).catch(err => {
      //console.log(err)
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      res.end();
      return res;
    });
  });
});
/***********
 * nodejs/routes/client/asset-analysis.js
 * for stoaring AGM Lat ,Lang and Zoom Value
 * in solar_plant By Naynesh date 23-06-2021
 * ************/

router.post('/solarAGMLatLngZoom', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.solarAGMLatLngZoom(req.body, function (err) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Maps Store succesfully.", "data": req.body });
    res.end();
    return res;
  });
});



router.post('/getSolarAGMLatLngZoom', authenticationHelpers.isClientAuth, function (req, res) {
  assetanalysis.getSolarAGMLatLngZoom(req.body.id, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    if (!result) {
      res.json({ "error": true, "reason": "No records found." });
      return res;
    }
    res.json({ "error": false, "result": result });
    res.end();
    return res;
  });
});
/* **historical data api for amdroid app made By Ekta   */

router.post('/Historicaldata', authenticationHelpers.isClientAuth, function (req, res, next) {

  if (req.body.dataInterval == 'day' || req.body.dataInterval == 'week' || req.body.dataInterval == 'month' || req.body.dataInterval == 'year' || req.body.dataInterval == 'total') {
    req.checkBody("nodeId", "NodeId is required.").notEmpty();
    req.checkBody("dataInterval", "Interval is required.").notEmpty();
    req.checkBody("isInstantaneous", "isInstantaneous is required.").notEmpty();
    req.checkBody("readingGap", "readingGap is required.").notEmpty();
    req.checkBody("parameterId", "parameterId is required.").notEmpty();
    req.checkBody("fromDate", "fromDate is required.").notEmpty();
    req.checkBody("toDate", "toDate is required.").notEmpty();
    if (req.body.parameterId.length == 2) {

      res.json({ "error": true, "reason": "Unable to get data. Please try again!" });
      return res;


    }
  }

  else if (req.body.dataInterval == 'all') {
    req.checkBody("nodeId", "NodeId is required.").notEmpty();
    req.checkBody("dataInterval", "Interval is required.").notEmpty();
    req.checkBody("isInstantaneous", "isInstantaneous is required.").notEmpty();
    req.checkBody("readingGap", "readingGap is required.").notEmpty();
  }
  else { }
  var errorMsg = '';
  req.getValidationResult().then(function (err) {
    if (!err.isEmpty()) {
      err.array().map(function (elem) {
        errorMsg += elem.msg + "\n";
      });
      errorMsg = errorMsg.trim("\n");
      res.json({ "error": true, "reason": errorMsg });
      return res;
    }

    try {
      var promiseAry = [];
      var isInstantaneous = parseInt(req.body.isInstantaneous);
      var dataInterval = req.body.dataInterval
      postdata = {}
      postdata = req.body

      switch (dataInterval) {

        case 'day':

          postdata.interval = 'fifteen'
          var fromDate = req.body.fromDate
          var fromDateTimeObject = momentTimezone.utc(fromDate + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It 
          fromDateTimeObject.add(1, 'days');
          var fromDatetime = fromDateTimeObject.format('DD/MM/YYYY')
          var toDate = req.body.toDate
          var toDateTimeObject = momentTimezone.utc(toDate + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just 
          var toDatetime = toDateTimeObject.format('DD/MM/YYYY')
          if (fromDatetime == toDatetime) {

            promiseAry.push(getFifteenMinuteReadingData(req, postdata));
          }
          else {
            res.json({ error: true, reason: "Error: Unable to get daydata. Please try again!" });
            return res;
          }
          break;
        case 'week':

          postdata.interval = 'daily'
          var fromDate = req.body.fromDate
          var fromDateTimeObject = momentTimezone.utc(fromDate + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It  
          var fromDatetime = fromDateTimeObject.format('DD')
          var toDate = req.body.toDate
          var toDateTimeObject = momentTimezone.utc(toDate + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just 
          if (fromDateTimeObject.diff(toDateTimeObject, 'd') < -5 && fromDateTimeObject.diff(toDateTimeObject, 'd') > -8) {
            promiseAry.push(getDailyReadingData(req, postdata, 'week'));
          }
          else {
            res.json({ error: true, reason: "Error: Unable to get weekdata. Please try again!" });
            return res;
          }
          break;
        case 'month':
          postdata.interval = 'daily'
          var fromDate = req.body.fromDate
          var fromDateTimeObject = momentTimezone.utc(fromDate + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It  
          var fromDatetime = fromDateTimeObject.format('DD')
          var toDate = req.body.toDate
          var toDateTimeObject = momentTimezone.utc(toDate + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just 
          if (fromDateTimeObject.diff(toDateTimeObject, 'd') > -35) {
            promiseAry.push(getDailyReadingData(req, postdata, 'month'));
          }
          else {
            res.json({ error: true, reason: "Error: Unable to get monthdata. Please try again!" });
            return res;
          }
          break;
        case 'year':
          var fromDate = req.body.fromDate
          var fromDateTimeObject = momentTimezone.utc(fromDate + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It  
          var fromDatetime = fromDateTimeObject.format('DD')
          var toDate = req.body.toDate

          var toDateTimeObject = momentTimezone.utc(toDate + '+0000', 'YYYY-MM-DD HH:mm:ssZ');//This doesnt convert datetime to utc, It just 
          if (fromDateTimeObject.diff(toDateTimeObject, 'd') >= -368) {
            postdata.interval = 'monthly'
            promiseAry.push(getMonthlyReadingData(req, postdata));
          }
          else {
            res.json({ error: true, reason: "Error: Unable to get yeardata. Please try again!" });
            return res;
          }
          break;
        case 'total':
          postdata.interval = 'yearly'
          promiseAry.push(getYearlyReadingData(req, postdata));

          break;
        case 'all':
          let userTimezoneObj = req.session.passport.user.timezone
          let dateRangePickerOptionsObj = { ranges: {}, locale: {} };
          dateRangePickerOptionsObj['ranges'] = {
            'Today': [momentTimezone.tz(userTimezoneObj['timezone']), momentTimezone.tz(userTimezoneObj['timezone'])],
            'This Week': [momentTimezone.tz(userTimezoneObj['timezone']).startOf('isoWeek'), momentTimezone.tz(userTimezoneObj['timezone']).endOf('isoWeek')],
            'This Month': [momentTimezone.tz(userTimezoneObj['timezone']).startOf('month'), momentTimezone.tz(userTimezoneObj['timezone']).endOf('month')],
            'This Year': [momentTimezone.tz(userTimezoneObj['timezone']).startOf('year'), momentTimezone.tz(userTimezoneObj['timezone']).endOf('year')],
          };

          daydata = {};
          weekdata = {};
          monthdata = {};
          yeardata = {};
          fromdate = dateRangePickerOptionsObj['ranges']['Today'][0].format('YYYY/MM/DD');
          todate = dateRangePickerOptionsObj['ranges']['Today'][1].format('YYYY/MM/DD');

          fromdateDay = momentTimezone.tz(fromdate, userTimezoneObj['timezone']).format('YYYY-MM-DD 00:00:00')
          todateDay = momentTimezone.tz(todate, userTimezoneObj['timezone']).format('YYYY-MM-DD 23:59:59')
          nodeId = req.body.nodeId;
          readingGap = req.body.readingGap;
          //  parameterId : [ '27' ];
          isInstantaneous = req.body.isInstantaneous;
          let paramId = (isInstantaneous == 0) ? ['37'] : ['27'];
          daydata = ({ 'interval': 'fifteen', 'fromDate': fromdateDay, 'toDate': todateDay, 'nodeId': nodeId, 'readingGap': readingGap, 'parameterId': paramId, 'isInstantaneous': isInstantaneous, case: 'day' })
          fromdateWeek = dateRangePickerOptionsObj['ranges']['This Week'][0].format('YYYY/MM/DD');
          todateWeek = dateRangePickerOptionsObj['ranges']['This Week'][1].format('YYYY/MM/DD');
          weekdata = { ...daydata, 'interval': 'daily', 'fromDate': fromdateWeek, 'toDate': todateWeek }
          fromdateMonth = dateRangePickerOptionsObj['ranges']['This Month'][0].format('YYYY/MM/DD');
          todateMonth = dateRangePickerOptionsObj['ranges']['This Month'][1].format('YYYY/MM/DD');
          monthdata = { ...daydata, 'interval': 'daily', 'fromDate': fromdateMonth, 'toDate': todateMonth }
          fromdateYear = dateRangePickerOptionsObj['ranges']['This Year'][0].format('YYYY/MM/DD');
          todateYear = dateRangePickerOptionsObj['ranges']['This Year'][1].format('YYYY/MM/DD');
          yeardata = { ...daydata, 'interval': 'monthly', 'fromDate': fromdateYear, 'toDate': todateYear, case: 'year' }
          fromdateTotal = "2017-01-01 00:00:00+0530",
            todateTotal = dateRangePickerOptionsObj['ranges']['This Year'][1].format('YYYY/MM/DD');
          totaldata = { ...daydata, 'interval': 'yearly', 'fromDate': fromdateTotal, 'toDate': todateTotal, case: 'total' }
          dateRangePickerOptionsObj['locale'] = {
            format: 'DD/MM/YYYY',
            separator: ' - ',
            cancelLabel: '',
            applyLabel: 'Okay'
          }

          promiseAry.push(getDailyReadingData(req, weekdata, 'week'), getDailyReadingData(req, monthdata, 'month'), getMonthlyReadingData(req, yeardata), getYearlyReadingData(req, totaldata));
          //  promiseAry.push( getYearlyReadingData(req, totaldata))
          break;
        case 'default':
          res.json({ data: {} });
          res.end();
          return res;
      }
    }

    catch (exception) {
      res.json({ error: true, reason: "Error: Unable to get data1. Please try again!" });
      res.end();
      return res;
    }

    Promise.all(promiseAry).then(function (promiseResult) {
      var obj = {};
      for (var i in promiseResult) {
        obj[Object.keys(promiseResult[i])] = promiseResult[i][Object.keys(promiseResult[i])];

      }
      res.json(obj)
      res.end();
      return res;
    })
      .catch(err => {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        res.end();
        return res;
      });
  });
})


function getFifteenMinuteReadingData(req, daydata) {
  return new Promise((resolve, reject) => {
    req.body = daydata;
    if (req.body.isInstantaneous == 0) {
      common.getCummulativeFifteenMinutesData(req, function (error, data) {
        var FifteenMinutedata = {};
        var temp = {}
        temp['FifteenMinute'] = {}
        FifteenMinutedata['total'] = 0
        for (var key in data.data) {
          if (!FifteenMinutedata[key]) {
            FifteenMinutedata[key] = 0

          }
          for (var node in data.data[key]) {
            if (node == 'timestamp') { continue }
            var difference = _.get(data, ['data', key, node, 'difference', 'reading']);
            FifteenMinutedata[key] += difference;
            FifteenMinutedata['total'] += difference;
          }
        }

        temp['FifteenMinute'] = FifteenMinutedata
        return resolve(temp);
      });
    }
    else {
      common.getInstantaneousFifteenMinutesData(req, function (error, data) {
        var FifteenMinutedata = {};
        var temp = {}
        temp['FifteenMinute'] = {}
        FifteenMinutedata['total'] = 0
        var i = 0;
        for (var key in data.data) {
          if (!FifteenMinutedata[key]) {
            FifteenMinutedata[key] = 0
          }
          for (var node in data.data[key]) {
            if (node == 'timestamp') {
              continue
            }
            var difference = _.get(data, ['data', key, node, 'average', 'reading']);
            FifteenMinutedata[key] += difference;
            FifteenMinutedata['total'] += difference;
          }
          if (FifteenMinutedata[key] != 0) {
            i++;
          }
        }
        FifteenMinutedata['total'] = FifteenMinutedata['total'] / i
        temp['FifteenMinute'] = FifteenMinutedata
        return resolve(temp);
      });
    }
  });
}

function getDailyReadingData(req, daydata, week) {
  return new Promise((resolve, reject) => {
    req.body = daydata;
    var temp = {}
    temp[week] = {}
    if (req.body.isInstantaneous == 0) {
      common.getCummulativeDailyData(req, function (error, data) {
        var dailydata = {};
        dailydata['total'] = 0
        for (var key in data.data) {
          if (!dailydata[key]) {
            dailydata[key] = 0

          }
          for (var node in data.data[key]) {
            if (node == 'timestamp') { continue }
            var difference = _.get(data, ['data', key, node, 'difference', 'reading']);
            dailydata[key] += difference;
            dailydata['total'] += difference;
          }
        }
        temp[week] = dailydata

        return resolve(temp);
      });
    }
    else {
      common.getInstantaneousDailyData(req, function (error, data) {
        var dailydata = {};
        dailydata['total'] = 0
        var i = 0;
        for (var key in data.data) {
          if (!dailydata[key]) {
            dailydata[key] = 0
          }
          for (var node in data.data[key]) {
            if (node == 'timestamp') { continue }
            var difference = _.get(data, ['data', key, node, 'average', 'reading']);
            dailydata[key] += difference;
            dailydata['total'] += difference;
          }
          if (dailydata[key] != 0) {
            i++;
          }
        }
        dailydata['total'] = dailydata['total'] / i
        temp[week] = dailydata
        return resolve(temp);
      });
    }
  });
}

function getMonthlyReadingData(req, daydata) {
  return new Promise((resolve, reject) => {
    req.body = daydata;
    if (req.body.isInstantaneous == 0) {
      common.getCummulativeMonthlyData(req, function (error, data) {

        var temp = {}
        temp['year'] = {}
        var monthlydata = {};
        monthlydata['total'] = 0
        for (var key in data.data) {
          if (!monthlydata[key]) {
            monthlydata[key] = 0
          }
          for (var node in data.data[key]) {
            if (node == 'timestamp') { continue }
            var difference = _.get(data, ['data', key, node, 'difference', 'reading']);
            monthlydata[key] += difference;
            monthlydata['total'] += difference;
          };
        }
        temp['year'] = monthlydata
        return resolve(temp);
      });
    }
    else {
      common.getInstantaneousMonthlyData(req, function (error, data) {
        var temp = {}
        temp['year'] = {}
        var monthlydata = {};
        monthlydata['total'] = 0
        var i = 0;
        for (var key in data.data) {
          if (!monthlydata[key]) {
            monthlydata[key] = 0

          }
          for (var node in data.data[key]) {
            if (node == 'timestamp') { continue }
            var difference = _.get(data, ['data', key, node, 'average', 'reading']);
            monthlydata[key] += difference;
            monthlydata['total'] += difference;

          };
          if (monthlydata[key] != 0) {
            i++
          }
        }
        monthlydata['total'] = monthlydata['total'] / i
        temp['year'] = monthlydata
        return resolve(temp);
      });
    }
  });
}

function getYearlyReadingData(req, daydata) {
  return new Promise((resolve, reject) => {
    req.body = daydata;
    if (req.body.isInstantaneous == 0) {
      common.getCummulativeYearlyData(req, function (error, data) {
        var temp = {}
        temp['total'] = {}
        var yearlydata = {};
        yearlydata['total'] = 0
        for (var key in data.data) {
          if (!yearlydata[key]) {
            yearlydata[key] = 0

          }
          for (var node in data.data[key]) {
            if (node == 'timestamp') { continue }
            var difference = _.get(data, ['data', key, node, 'difference', 'reading']);
            yearlydata[key] += difference;
            yearlydata['total'] += difference;
          }
        }
        temp['total'] = yearlydata
        return resolve(temp);
      });
    }
    else {
      common.getInstantaneousYearlyData(req, function (error, data) {

        var temp = {}
        temp['total'] = {}
        var yearlydata = {};
        yearlydata['total'] = 0
        var i = 0;
        for (var key in data.data) {
          if (!yearlydata[key]) {
            yearlydata[key] = 0

          }
          for (var node in data.data[key]) {
            if (node == 'timestamp') { continue }
            var difference = _.get(data, ['data', key, node, 'average', 'reading']);
            yearlydata[key] += difference;
            yearlydata['total'] += difference;
          }
          if (yearlydata[key] != 0) {
            i++;
          }
        }
        yearlydata['total'] = yearlydata['total'] / i
        temp['total'] = yearlydata
        return resolve(temp);
      });
    }
  });
}

/*************** Added by Arjun : Start - Tenant Billing *****************/


router.post('/getBillingCycleList', authenticationHelpers.isClientAuth, function (req, res) {

  //console.log(' Route Body data ',);

  assetanalysis.getBillingCycleList(req.body.app_id, function (err, result) {

    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }

    if (result.length == 0) {
      res.json({ "error": true, "reason": "Error: No Records found" });
      return res;
    }

    //console.log(' Route Last log')

    res.json({ "error": false, "result": result });
    res.end();
    return res;


  })

});



router.post('/getTariffRate', authenticationHelpers.isClientAuth, function (req, res) {

  //console.log(' Route Body data ',);

  assetanalysis.getTariffRate(req.body.app_id, function (err, result) {

    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }

    if (result.length == 0) {
      res.json({ "error": true, "reason": "Error: No Records found" });
      return res;
    }

    //console.log(' Route Last log')

    res.json({ "error": false, "result": result });
    res.end();
    return res;


  })

});



router.post('/facilityList', authenticationHelpers.isClientAuth, function (req, res) {

  //console.log(' Route Body data ',);

  assetanalysis.facilityList(req.body.app_id, function (err, result) {

    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }

    if (result.length == 0) {
      res.json({ "error": true, "reason": "Error: No Records found" });
      return res;
    }

    //console.log(' Route Last log')

    res.json({ "error": false, "result": result });
    res.end();
    return res;


  })

});



router.post('/tenantList1', authenticationHelpers.isClientAuth, function (req, res) {
  /**get all the list of apps from tenant table */
  //console.log(' Request Body %%^^&&', req.body);

  assetanalysis.tenantList1(req.session.passport.user.company_id, req.body.app_id, function (err, result) {

    //console.log(' Result !!! ', result)
    //console.log(' err ', err)

    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }

    if (result.length == 0) {
      res.json({ "error": true, "reason": "Error: No Records found" });
      return res;
    }

    //console.log(' Route Last log')

    res.json({ "error": false, "result": result });
    res.end();
    return res;
  })


});


router.post('/submitCommonTenantSetting1', authenticationHelpers.isClientAuth, function (req, res) {

  if (req.body.requestAction == 'submit') {

    assetanalysis.submitCommonTenantSetting1(req.body, req.session.passport.user.user_id, function (err) {
      if (err) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      res.json({ "error": false, "reason": "Common tenant settings submitted succesfully." });
      res.end();
      return res;
    });
  }
  else if (req.body.requestAction == 'edit') {

    assetanalysis.submitCommonTenantSetting1_edit(req.body, req.session.passport.user.user_id, function (err) {
      if (err) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      res.json({ "error": false, "reason": "Common tenant settings Updated Succesfully." });
      res.end();
      return res;
    });
  } else if (req.body.requestAction == 'delete') {
    assetanalysis.submitCommonTenantSetting1_delete(req.body, req.session.passport.user.user_id, function (err) {
      if (err) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      res.json({ "error": false, "reason": "Common tenant settings Deleted Succesfully." });
      res.end();
      return res;
    });
  }
});


router.post('/submitTenantSetting1', authenticationHelpers.isClientAuth, function (req, res) {

  //console.log(' Test !!!!&^&^& 3113 ', req.body, req.body.requestAction)

  if (req.body.requestAction == 'submit') {

    // //console.log('Passport : ',req.session.passport.user.company_id);
    assetanalysis.submitTenantSetting1(req.body, req.session.passport.user.user_id, req.session.passport.user.company_id, function (err) {
      if (err) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      res.json({ "error": false, "reason": "Tenant setting submitted succesfully." });
      res.end();
      return res;
    });
  }

  if (req.body.requestAction == 'edit') {

    assetanalysis.submitTenantSetting1_edit(req.body, req.session.passport.user.user_id, req.session.passport.user.company_id, function (err) {
      if (err) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      res.json({ "error": false, "reason": "Tenant setting Updated succesfully." });
      res.end();
      return res;
    })

  }

  if (req.body.requestAction == 'delete') {
    //console.log(req.body);
    assetanalysis.submitTenantSetting1_delete(req.body, req.session.passport.user.user_id, req.session.passport.user.company_id, function (err) {
      if (err) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      res.json({ "error": false, "reason": "Tenant setting Deleted succesfully." });
      res.end();
      return res;
    })

  }

});

/******* 10 Jan 2023  */

router.post('/submitBillingSetting1', authenticationHelpers.isClientAuth, function (req, res) {
  //console.log(' Test 365632452342 2', req.body)
  //console.log(' Test 365632452342 requestAction', req.body.data['requestAction'])


  if (req.body.data['requestAction'] == 'edit') {

    //console.log(' Test Route reqAction : ', req.body.requestAction)
    assetanalysis.submitBillingSetting1_edit(req.body, req.session.passport.user.user_id, function (err) {
      if (err) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      res.json({ "error": false, "reason": "Billing Settings Updated succesfully." });
      res.end();
      return res;
    });
  } else if (req.body.data['requestAction'] == 'submit') {
    //console.log(' Test Route reqAction : ', req.body.requestAction)
    assetanalysis.submitBillingSetting1(req.body, req.session.passport.user.user_id, function (err) {
      if (err) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      res.json({ "error": false, "reason": "Billing Settings submitted succesfully." });
      res.end();
      return res;
    });

  }
  else if(req.body.data['requestAction'] == 'delete') {
    //console.log(' Test Route reqAction : ', req.body.requestAction)
    assetanalysis.submitBillingSetting1_delete(req.body, req.session.passport.user.user_id, function (err) {
      if (err) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      res.json({ "error": false, "reason": "Billing Settings deleted succesfully." });
      res.end();
      return res;
    });

  }


});

/******* 10 Jan 2023  */

router.post('/png2Pdf', authenticationHelpers.isClientAuth, function (req, res) {


  //console.log(' Request !!! ', req.body);

  req.body.tenantFinalArray.map(item => {
    //console.log('Item ### 1', item);
    var docDefinition = {
      
      pageSize: 'A4',
      pageMargins: [ 10, 10, 10, 10 ],
      content: [
        {
          image: item.billImg,
          width: 550,
          height: 1000,
          fit: [550, 1000],
          style: 'clsImage'
        },
      ],
      styles: {
        clsHeader: {
          fontSize: 12,
          bold: true
        },
        clsSubHeader: {
          fontSize: 10
        },
        clsTblHeader: {
          fillColor: '#9e9e9e',
          color: '#FFFFFF'
        },
        clsImage: {
          margin: [0, 0, 0, 0]
        },
        clsTable: {
          fontSize: 8
        }
      },
      defaultStyle: {
        alignment: 'justify'
      }
    }
    //console.log(' Test %%%%%% ')
    //console.log(' docDefinition %%%%%% ', docDefinition)
    var doc = printer.createPdfKitDocument(docDefinition);

    var chunks = [];
    doc.on('readable', function () {
      var chunk;
      while ((chunk = doc.read(9007199254740991)) !== null) {
        chunks.push(chunk);
      }
    });
    if (req.body.action) {
      doc.on('end', function () {
        var buffer = Buffer.concat(chunks);
        // return resolve(buffer);
        res.json({ "error": false, "reason": "Tenant bills download succesfully.", "result": buffer });
        res.end();
        return res;
      });
      doc.end();

    }
    if (!req.body.action) {
      var tempFilePath = tempfile('.pdf');
      var wait;
      doc.pipe(wait = fs.createWriteStream(tempFilePath));
      doc.end();
      wait.on('finish', function () {
        //console.log(tempFilePath);
        //console.log('Item ### 2', item);

        var tempEmail = []
        tempEmail.push(item.email_address);
        //console.log('tempEmail ### ', tempEmail);
        common.sendMail({ string: '<p>PFA</p>', mails: tempEmail, filePath: tempFilePath, subject: 'Energy Consumption Bill', fileName: 'energy_consumption_bill.pdf' }, function (error, readingDataObj) {
          if (error) {
            //console.log(error, "error");
          }
          //console.log(readingDataObj, "sdfsdfsfsdfsdfsdf");
          
        });
        // return resolve(tempFilePath);
        // ,'mahesh.palde@goesl.co','ajay.kolte@goesl.co'
        // ,'mahesh.palde@goesl.co','ajay.kolte@goesl.co','akshay.goliya@goesl.co'
      });
      res.json({ "error": false, "reason": "Tenant bills send succesfully."});
        res.end();
        return res;
    }
  })




});




router.post('/submitTariffRateSetting', authenticationHelpers.isClientAuth, function (req, res) {

  //console.log('Data Obj @@@ ', req.body)

  // requestAction

  if (req.body['requestAction'] == 'submit') {


    assetanalysis.submitTariffRateSetting(req.body, req.session.passport.user.user_id, function (err) {
      if (err) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      res.json({ "error": false, "reason": "Tariff rate setting submitted succesfully." });
      res.end();
      return res;
    });

  }

  if (req.body['requestAction'] == 'delete') {

    assetanalysis.submitTariffRateSetting_delete(req.body, req.session.passport.user.user_id, function (err) {
      if (err) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      res.json({ "error": false, "reason": "Tariff rate setting Deleted succesfully." });
      res.end();
      return res;
    });

  }


});





/*************** Added by Arjun : End - Tenant Billing *****************/


/* **historical data api for amdroid app made By Ekta   */
module.exports = router;
