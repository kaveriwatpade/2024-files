var express = require('express');
var router = express.Router();
var authenticationHelpers = require('../authentication-helpers');
var fs = require('fs');
var Promise = require('promise');
var XLSX = require('@sheet/edit');
const tempfile = require('tempfile');
var ejs = require('ejs');
var common = require(__base + 'routes/common');
var lodash = require('lodash');
var momentTimezone = require('moment-timezone');
var moment = require('moment');
const os = require('os');
var intervalObj = { 'tenmin': '10min', 'fifteen': '15min', 'hourly': 'Hourly', 'daily': 'Daily', 'weekly': 'Weekly', 'monthly': 'Monthly', 'yearly': 'Yearly', 'all': 'All' };
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

/**function promise call to call the functions based on their report types to download pdf or xcel file  */
router.post('/downloadReportFile', authenticationHelpers.isClientAuth, function (req, res) {
  var promiseAry = [];
  console.log(req.body.postData, 'req.body.postData');
  var interval = req.body.postData['interval'] ? req.body.postData['interval'] : req.body.postData[0]['interval']
  var formdate = req.body.postData['fromDate'] ? req.body.postData['fromDate'] : req.body.postData[0]['fromDate']
  var todate = req.body.postData['toDate'] ? req.body.postData['toDate'] : req.body.postData[0]['toDate']


  formdate = momentTimezone.tz(formdate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone);
  todate = momentTimezone.tz(todate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone);

  if (interval != 'tenmin') {

    if ((req.body['reportType'] != 'Multi Node' && req.body['reportType'] != 'Group Wise Consumption' && req.body['reportType'] != 'Location Wise Consumption') && req.body.postData[0]['compareTo'] == true) {
      var formdate2 = req.body.postData[1]['fromDate']
      var todate2 = req.body.postData[1]['toDate']

      formdate2 = momentTimezone.tz(formdate2, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone);
      todate2 = momentTimezone.tz(todate2, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone);
    }
  }






  if (interval == 'all' && todate.diff(formdate, 'd') > 182) {
    res.json({ error: true, reason: "Error: Please select duration within 6 months!" });
    return res;

  }
  else if (interval != 'yearly' && todate.diff(formdate, 'd') > 370) {
    res.json({ error: true, reason: "Error: Please select duration within 1 Year!" });
    return res;
  }
  else if (((req.body['reportType'] == 'SingleNodeConsumption') || (req.body['reportType'] == 'SingleNodeComparison')) && ((req.body.postData[0]['compareTo'] == true) && (interval != 'yearly' && todate.diff(formdate, 'd') > 32))) {

    res.json({ error: true, reason: "Error: Please select duration within 1 Month!" });
    return res;

  }
  else if (((req.body['reportType'] == 'Trend Comparison')) && ((req.body.postData[0]['compareTo'] == true) && (interval != 'yearly' && todate.diff(formdate, 'd') > 32))) {

    res.json({ error: true, reason: "Error: Please select duration within 1 Month!" });
    return res;
  }


  if (interval == 'all' && todate.diff(formdate, 'd') > 182) {
    res.json({ error: true, reason: "Error: Please select duration within 6 months!" });
    return res;

  }
  else if (interval != 'yearly' && todate.diff(formdate, 'd') > 370) {
    res.json({ error: true, reason: "Error: Please select duration within 1 Year!" });
    return res;
  }
  else if ((interval != 'tenmin') && ((req.body['reportType'] == 'SingleNodeConsumption') || (req.body['reportType'] == 'SingleNodeComparison') || (req.body['reportType'] == 'Trend') || (req.body['reportType'] == 'Trend Comparison') || (req.body['reportType'] == 'Consumption')) && ((req.body.postData[0]['compareTo'] == true) && (interval != 'yearly' && todate.diff(formdate, 'd') > 32))) {
    res.json({ error: true, reason: "Error: Please select duration within 1 Month!" });
    return res;
  }
  else if ((interval != 'tenmin') && (req.body['reportType'] != 'Multi Node' && req.body['reportType'] != 'Group Wise Consumption' && req.body['reportType'] != 'Location Wise Consumption') && (req.body.postData[0]['compareTo'] == true) && (todate.diff(formdate, 'd') != todate2.diff(formdate2, 'd'))) {
    res.json({ error: true, reason: "Error: Please select equal number of comparison days!" });
    return res;
  }
  else {
    if (req.body['format'] == 'xls') {
      switch (req.body['reportType']) {
        case 'SingleNodeConsumption':
          //in consumption
          promiseAry.push(generateSingleNodeReportExcelFile(req, req.session.passport.user, 1));
          break;

        case 'SingleNodeComparison':
          promiseAry.push(generateSingleNodeComparisonReportExcelFile(req, req.session.passport.user, 1));
          break;

        case 'Location Wise Consumption':
          promiseAry.push(generateLocationWiseExcelReportFile(req, req.session.passport.user, 1));
          break;

        case 'Group Wise Consumption':
          promiseAry.push(generateLocationWiseExcelReportFile(req, req.session.passport.user, 1));
          break;

        case 'Multi Node':
          promiseAry.push(generateLocationWiseExcelReportFile(req, req.session.passport.user, 1));
          break;

        case 'Trend':
          promiseAry.push(generateReportExcelFile(req, req.session.passport.user, 1));
          break;

        case 'Trend Comparison':
          promiseAry.push(generateComparisonReportExcelFile(req, req.session.passport.user, 1));
          break;

        case 'Consumption':
          promiseAry.push(generateSingleNodeConsumptionReportExcelFile(req, req.session.passport.user, 1));
          break;
      }
    }
    if (req.body['format'] == 'csv') {
      switch (req.body['reportType']) {
        case 'SingleNodeConsumption':
          promiseAry.push(generateSingleNodeReportCsvFile(req, req.session.passport.user, 1));
          break;

        case 'SingleNodeComparison':
          promiseAry.push(generateSingleNodeComparisionReportCsvFile(req, req.session.passport.user, 1));
          break;

        case 'Trend Comparison':
          promiseAry.push(generateTrendComparisionReportCsvFile(req, req.session.passport.user, 1));
          break;

        case 'Location Wise Consumption':
          promiseAry.push(generateLocationWiseCsvReportFile(req, req.session.passport.user, 1));
          break;

        case 'Group Wise Consumption':
          promiseAry.push(generateLocationWiseCsvReportFile(req, req.session.passport.user, 1));
          break;

        case 'Multi Node':
          promiseAry.push(generateLocationWiseCsvReportFile(req, req.session.passport.user, 1));
          break;

      }

      /************** Added by Kaveri ***********/
      if (interval == 'tenmin') {
        var temp = req.body.postData;
        req.body.postData = []
        req.body.postData.push(temp);
        promiseAry.push(generateSingleNodeReportCsvFile(req, req.session.passport.user, 1));
      }
      /***************************************/

    }
    if (req.body['format'] == 'pdf') {
      switch (req.body['reportType']) {
        case 'SingleNodeConsumption':
          promiseAry.push(generateSingleNodeReportPDFFile(req, req.session.passport.user, 1));
          break;

        case 'SingleNodeComparison':
          promiseAry.push(generateSingleNodeComparisonReportPdfFile(req, req.session.passport.user, 1));
          break;

        case 'Location Wise Consumption':
          promiseAry.push(generateGroupReportPDFFile(req, req.session.passport.user, 1));
          break;

        case 'Group Wise Consumption':
          promiseAry.push(generateGroupReportPDFFile(req, req.session.passport.user, 1));
          break;

        case 'Multi Node':
          promiseAry.push(generateGroupReportPDFFile(req, req.session.passport.user, 1));
          break;

        case 'Trend':
          promiseAry.push(generateReportPDFFile(req, req.session.passport.user, 1));
          break;

        case 'Trend Comparison':
          promiseAry.push(generateComparisonReportPDFFile(req, req.session.passport.user, 1));
          break;

        case 'Consumption':
          promiseAry.push(generateSingleNodeConsumptionReportPDFFile(req, req.session.passport.user, 1));
          break;

      }
    }

    Promise.all(promiseAry).then(function (result) {
      if (!result[0]) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!1111" });
        return res;
      }
      res.json({ "error": false, "reason": "File downloaded successfully!", "data": result[0] });
      res.end();
      return res;
    }).catch(err => {
      console.log(err, 'err');
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!22222" });
      return res;
    });
  }
});

/** function promise call to call the functions based on their report types to email pdf or xcel file after getting callbacks from called functions set mail body here and send the mail to respective ones  */
router.post('/emailReportFile', authenticationHelpers.isClientAuth, function (req, res) {

  var interval = req.body.postData['interval'] ? req.body.postData['interval'] : req.body.postData[0]['interval']

  if (req.body['reportType'] == 'SingleNodeConsumption') {
    var emailAdds = req.body['emailAddress'];
  }
  else if (req.body['reportType'] == 'SingleNodeComparison' || req.body['reportType'] == 'Trend Comparison') {
    var emailAdds = req.body['postData'][0]['emailAddress'];
  }
  else if (req.body['reportType'] == 'Multi Node') {
    var emailAdds = req.body['emailAddress'];
  }
  else if (req.body['reportType'] == 'Location Wise Consumption' || req.body['reportType'] == 'Group Wise Consumption') {
    var emailAdds = req.body['emailAddress'];
  } else if (interval == 'tenmin') {
    /************ Added by Kaveri ******/
    var emailAdds = req.body['emailAddress'];
  }
  else { }
  var promiseAry = [];
  var filename = '', contentType = '', subject;

  var interval = req.body.postData['interval'] ? req.body.postData['interval'] : req.body.postData[0]['interval'] //added by soham
  var formdate = req.body.postData['fromDate'] ? req.body.postData['fromDate'] : req.body.postData[0]['fromDate']
  var todate = req.body.postData['toDate'] ? req.body.postData['toDate'] : req.body.postData[0]['toDate']
  var emailAdds = req.body['emailAddress']; //added by Soham


  formdate = momentTimezone.tz(formdate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone);
  todate = momentTimezone.tz(todate, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone);

  if (interval != 'tenmin') {
    if ((req.body['reportType'] != 'Multi Node' && req.body['reportType'] != 'Group Wise Consumption' && req.body['reportType'] != 'Location Wise Consumption') && req.body.postData[0]['compareTo'] == true) {
      var formdate2 = req.body.postData[1]['fromDate']
      var todate2 = req.body.postData[1]['toDate']

      formdate2 = momentTimezone.tz(formdate2, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone);
      todate2 = momentTimezone.tz(todate2, 'YYYY-MM-DD HH:mm:ssZ', req.session.passport.user.timezone);
    }
  }

  if (interval == 'all' && todate.diff(formdate, 'd') > 182) {
    res.json({ error: true, reason: "Error: Please select duration within 6 months." });
    return res;

  }
  else if (interval != 'yearly' && todate.diff(formdate, 'd') > 370) {
    res.json({ error: true, reason: "Error: Please select duration within 1 Year." });
    return res;
  }
  else if ((interval != 'tenmin') && ((req.body['reportType'] == 'SingleNodeConsumption') || (req.body['reportType'] == 'SingleNodeComparison') || (req.body['reportType'] == 'Trend') || (req.body['reportType'] == 'Trend Comparison') || (req.body['reportType'] == 'Consumption')) && ((req.body.postData[0]['compareTo'] == true) && (interval != 'yearly' && todate.diff(formdate, 'd') > 32))) {


    res.json({ error: true, reason: "Error: Please select duration within 1 Month!" });
    return res;
  }
  else if ((interval != 'tenmin') && (req.body['reportType'] != 'Multi Node' && req.body['reportType'] != 'Group Wise Consumption' && req.body['reportType'] != 'Location Wise Consumption') && (req.body.postData[0]['compareTo'] == true) && (todate.diff(formdate, 'd') != todate2.diff(formdate2, 'd'))) {
    res.json({ error: true, reason: "Error: Please select equal number of comparison days!" });
    return res;
  }
  else {
    subject = req.body['reportType'] + ' Report';
    if (req.body['format'] == 'xls') {
      filename = req.body['reportType'].toLowerCase() + '-report.xlsx';
      contentType = 'application/xlsx';
      switch (req.body['reportType']) {
        case 'SingleNodeConsumption':
          promiseAry.push(generateSingleNodeReportExcelFile(req, req.session.passport.user, 0));
          break;

        case 'SingleNodeComparison':
          promiseAry.push(generateSingleNodeComparisonReportExcelFile(req, req.session.passport.user, 0));
          break;

        case 'Location Wise Consumption':
          promiseAry.push(generateLocationWiseExcelReportFile(req, req.session.passport.user, 0));
          break;

        case 'Group Wise Consumption':
          promiseAry.push(generateLocationWiseExcelReportFile(req, req.session.passport.user, 0));
          break;

        case 'Multi Node':
          promiseAry.push(generateLocationWiseExcelReportFile(req, req.session.passport.user, 0));
          break;

        case 'Trend':
          promiseAry.push(generateReportExcelFile(req, req.session.passport.user, 0));
          break;

        case 'Trend Comparison':
          promiseAry.push(generateComparisonReportExcelFile(req, req.session.passport.user, 0));
          break;

        case 'Consumption':
          promiseAry.push(generateSingleNodeConsumptionReportExcelFile(req, req.session.passport.user, 1));
          break;

      }
    }
    if (req.body['format'] == 'csv') {
      filename = req.body['reportType'].toLowerCase() + '-report.csv';
      contentType = 'text/csv';
      switch (req.body['reportType']) {
        case 'SingleNodeConsumption':
          promiseAry.push(generateSingleNodeReportCsvFile(req, req.session.passport.user, 0));
          break;

        case 'SingleNodeComparison':
          promiseAry.push(generateSingleNodeComparisionReportCsvFile(req, req.session.passport.user, 0));
          break;

        case 'Trend Comparison':
          promiseAry.push(generateTrendComparisionReportCsvFile(req, req.session.passport.user, 0));
          break;

        case 'Location Wise Consumption':
          promiseAry.push(generateLocationWiseCsvReportFile(req, req.session.passport.user, 0));
          break;

        case 'Group Wise Consumption':
          promiseAry.push(generateLocationWiseCsvReportFile(req, req.session.passport.user, 0));
          break;

        case 'Multi Node':
          promiseAry.push(generateLocationWiseCsvReportFile(req, req.session.passport.user, 0));
          break;

      }

      /************** Added by Kaveri ******/
      if (interval == 'tenmin') {
        var temp = req.body.postData;
        req.body.postData = []
        req.body.postData.push(temp);
        promiseAry.push(generateSingleNodeReportCsvFile(req, req.session.passport.user, 0));

      }
      /************************************/
    }
    if (req.body['format'] == 'pdf') {
      filename = req.body['reportType'].toLowerCase() + '-report.pdf';
      contentType = 'application/pdf';
      switch (req.body['reportType']) {
        case 'SingleNodeConsumption':
          promiseAry.push(generateSingleNodeReportPDFFile(req, req.session.passport.user, 0));
          break;

        case 'SingleNodeComparison':
          promiseAry.push(generateSingleNodeComparisonReportPdfFile(req, req.session.passport.user, 0));
          break;

        case 'Location Wise Consumption':
          promiseAry.push(generateGroupReportPDFFile(req, req.session.passport.user, 0));
          break;

        case 'Group Wise Consumption':
          promiseAry.push(generateGroupReportPDFFile(req, req.session.passport.user, 0));
          break;

        case 'Multi Node':
          promiseAry.push(generateGroupReportPDFFile(req, req.session.passport.user, 0));
          break;

        case 'Trend':
          promiseAry.push(generateReportPDFFile(req, req.session.passport.user, 0));
          break;

        case 'Trend Comparison':
          promiseAry.push(generateComparisonReportPDFFile(req, req.session.passport.user, 0));
          break;

        case 'Consumption':
          promiseAry.push(generateSingleNodeConsumptionReportPDFFile(req, req.session.passport.user, 1));
          break;
      }
    }
    Promise.all(promiseAry).then(function (result) {
      if (!result[0]) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!1-1-1-1" });
        return res;
      }
      var tempFilePath = result[0];
      var htmlObj = {};
      htmlObj['user'] = '';
      htmlObj['body'] = '<p>PFA</p>';
      htmlObj['imagePath'] = marcconfig.ANGULARBASEPATH + '/assets/images';
      htmlObj['basePath'] = marcconfig.ANGULARBASEPATH;

      ejs.renderFile(__base + marcconfig.EMAILTEMPLATEPATH + '/email.ejs', htmlObj, function (err, html) {
        var mailOptions = {
          from: marcconfig.SMTPFROMNAME,
          to: emailAdds,
          subject: subject,
          html: html,
          attachments: [{
            filename: filename,
            path: tempFilePath,
            contentType: contentType
          }]
        };

        mailSettingDetails.sendMail(mailOptions, function (err, result) {
          if (err) {
            console.log(err, 'error');
            res.json({ "error": true, "reason": "Error: Report not sent.!" });
            return res;
          }
          fs.unlink(tempFilePath, function () { });
          res.json({ "error": false, "reason": "Report mailed successfully.!" });
          res.end();
          return res;
        });
      });
    }).catch(err => {
      console.log(err, 'err');
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!2-2-2-2" });
      return res;
    });
  }
});

/** SheetJS Library Integration...... consumption singlenode report  style done dynamically */
/* code change by kaveri- start*/ // for consumption
function generateSingleNodeReportExcelFile(req, session, download) {
  console.log('=============================');
  return new Promise((resolve, reject) => {
    try {
      const postDataObj = req.body.postData;
      postDataObj[0]['reportType'] = (req.body.interval == 'tenmin') ? 'Ten Min Report' : req.body['reportType'];
      let promiseAry = [];
      var columnAry = JSON.parse(req.body.columns);
      var node = req.body.node;
      var reportDate = req.body.reportDate;
      var interval = req.body.interval;
      var company_name = session['company_name'];
      var reqDataObj = postDataObj[0]//commulative
      var reqDataObj1 = postDataObj[1]//instan
      var parameters = req.session.passport.user.parameters;

      console.log(postDataObj,'postDataObj[0]postDataObj[0]');
      if (postDataObj.length == 2) {
        reqDataObj.parameterId = lodash.union(postDataObj[0].parameterId, lodash.get(postDataObj[1], ['parameterId']));
        reqDataObj1.parameterId = lodash.union(postDataObj[0].parameterId, lodash.get(postDataObj[1], ['parameterId']));

        promiseAry.push(getPostdataReadings(req, reqDataObj));
        promiseAry.push(getPostdataReadings(req, reqDataObj1));
      }
      else if (postDataObj.length == 1) {
        promiseAry.push(getPostdataReadings(req, postDataObj[0]));
      }
      else {
        return;
      }

      Promise.all(promiseAry).then(async promiseResult => {
        console.log(promiseResult, 'promiseResult');
        let dateIndex = 1;
        let rowDataAry = [];
        let rowAry = [];

        /* for both parameter of process data */
        if (promiseResult.length == 2) {

          /********************* Added by Arjun - Start ***********************/

          InstAry = [];
          CumuAry = [];

          await columnAry.forEach(async column => {

            var temp = column.columnDef.split('_')

            if (temp.length == 2) {

              if (parameters[temp[1]].parameter_type == 1) {
                var data = {
                  columnDef: column.columnDef,
                  header: column.header
                }
                InstAry.push(data)
              } else if (parameters[temp[1]].parameter_type == 0) {
                var data = {
                  columnDef: column.columnDef,
                  header: column.header
                }
                CumuAry.push(data)
              }

            } else if (temp.length == 1) {
              var data = {
                columnDef: column.columnDef,
                header: column.header
              }
              InstAry.push(data)
            }

          })

          var temp = InstAry.concat(CumuAry)
          columnAry = temp

          /********************* Added by Arjun - End ***********************/

          /* For all interval */
          if (interval == 'all') {
            rowAry = [];
            rowDataAry = [];
            for (var date in promiseResult[0]['data']) {
              var dataObj = {};
              dataObj['srno'] = dateIndex;
              dataObj['date'] = date;

              postDataObj.map(item => {
                console.log(item, 'postDataObj');
                var timeF = date.split(' ')[1].substring(0, 5);
                var timeT = date.split(' ')[1].substring(0, 5);

                if ((timeF >= item['fTime']) && (timeT <= item['tTime'])) {

                  for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
                    if ('timestamp' == nodeUniqueIdParamId) {
                      continue;
                    }
                    var nodeId = nodeUniqueIdParamId.split('_');
                    if (parameters[nodeId[1]].parameter_type != 1) {
                      continue
                    }
                    else {
                      dataObj['r' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                    }

                  }
                  for (var nodeUniqueIdParamId in promiseResult[1]['data'][date]) {
                    if ('timestamp' == nodeUniqueIdParamId) {
                      continue;
                    }
                    var nodeId = nodeUniqueIdParamId.split('_');
                    if (parameters[nodeId[1]].parameter_type != 0) {
                      continue
                    }
                    else {
                      dataObj['r' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[1]['data'][date][nodeUniqueIdParamId]['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                    }
                  }
                  rowDataAry = Object.values(dataObj);
                  rowAry.push(rowDataAry);
                  dateIndex++;
                }
                else {
                  delete dataObj['date'];
                  delete dataObj['srno'];
                }
              })

            }


          }
          /* for process data */
          else {
            console.log('1111111111111111111111');
            for (let date in promiseResult[0]['data']) {
              console.log('22222222222222222222');
              let dataObj = {};
              dataObj['srno'] = dateIndex;
              dataObj['date'] = date;

              for (let nodeUniqueIdParamId in promiseResult[1]['data'][date]) {
                console.log('3333333333333333333333333');
                if ('timestamp' == nodeUniqueIdParamId) {
                  continue;
                }
                let nodeId = nodeUniqueIdParamId.split('_');
                if (parameters[nodeId[1]].parameter_type != 1) {
                  continue
                }
                else {
                  dataObj['mi' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[1]['data'][date][nodeUniqueIdParamId]['min']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                  dataObj['ma' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[1]['data'][date][nodeUniqueIdParamId]['max']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                  dataObj['a' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[1]['data'][date][nodeUniqueIdParamId]['average']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                }
              }

              for (let nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
                console.log('444444444444444444444');
                if ('timestamp' == nodeUniqueIdParamId) {
                  continue;
                }
                let nodeId = nodeUniqueIdParamId.split('_');
                if (parameters[nodeId[1]].parameter_type != 0) {
                  continue
                }
                else {
                  dataObj['s' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                  dataObj['e' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['endReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                  dataObj['d' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['difference']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                }
              }
              rowDataAry = Object.values(dataObj);
              rowAry.push(rowDataAry);
              dateIndex++;
            }
          }
        }

        /* for single parameter */
        else if (promiseResult.length == 1) {
          /* for all interval */
          if (interval == 'all') {
            rowAry = [];
            rowDataAry = [];
            for (var date in promiseResult[0]['data']) {
              var dataObj = {};
              dataObj['srno'] = dateIndex;
              dataObj['date'] = date;
              postDataObj.map(item => {
                console.log(item, 'postDataObj');
                var timeF = date.split(' ')[1].substring(0, 5);
                var timeT = date.split(' ')[1].substring(0, 5);

                if ((timeF >= item['fTime']) && (timeT <= item['tTime'])) {

                  for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
                    if ('timestamp' == nodeUniqueIdParamId) {
                      continue;
                    }
                    var nodeId = nodeUniqueIdParamId.split('_');
                    dataObj['r' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                    rowDataAry = Object.values(dataObj);
                    rowAry.push(rowDataAry);
                    dateIndex++;
                  }
                }
                else {
                  delete dataObj['srno'];
                  delete dataObj['date'];
                }
              })
            }
          }

          /* for cumulative parameter of process data */
          else if (postDataObj[0].isinstantaneous == 0) {
            promiseAry = []
            rowAry = [];
            rowDataAry = [];
            for (var date in promiseResult[0]['data']) {
              var dataObj = {};
              dataObj['srno'] = dateIndex;
              dataObj['date'] = date;
              for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
                if ('timestamp' == nodeUniqueIdParamId) {
                  continue;
                }
                var nodeId = nodeUniqueIdParamId.split('_');
                dataObj['s' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                dataObj['e' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['endReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                dataObj['d' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['difference']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);


              }
              rowDataAry = Object.values(dataObj);
              rowAry.push(rowDataAry);
              dateIndex++;
            }

          }

          /* for instantanious parameter of process data */
          else if (postDataObj[0].isinstantaneous == 1) {
            promiseAry = []
            rowAry = [];
            rowDataAry = [];
            for (var date in promiseResult[0]['data']) {
              var dataObj = {};
              dataObj['srno'] = dateIndex;
              dataObj['date'] = date;
              postDataObj.map(item => {
                console.log(item, 'postDataObj');

                if ((item['interval'] == 'daily') || (item['interval'] == 'monthly') || (item['interval'] == 'weekly') || (item['interval'] == 'yearly')) {
                  for (let nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
                    if ('timestamp' == nodeUniqueIdParamId) {
                      continue;
                    }
                    let nodeId = nodeUniqueIdParamId.split('_');
                    dataObj['mi' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['min']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                    dataObj['ma' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['max']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                    dataObj['a' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['average']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                  }
                }

                else if (((item['interval'] == 'hourly') || (item['interval'] == 'fifteen'))) {
                  if (((date.split(' ')[1]) >= item['fTime']) && (date.split(' ')[3] <= item['tTime'])) {
                    for (let nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
                      if ('timestamp' == nodeUniqueIdParamId) {
                        continue;
                      }
                      let nodeId = nodeUniqueIdParamId.split('_');
                      dataObj['mi' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['min']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                      dataObj['ma' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['max']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                      dataObj['a' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['average']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                    }
                  }
                  else {
                    delete dataObj['srno'];
                    delete dataObj['date'];
                  }
                }

                else {
                  delete dataObj['srno'];
                  delete dataObj['date'];
                }
              })
              rowDataAry = Object.values(dataObj);
              rowAry.push(rowDataAry);
              dateIndex++;
            }
          }
        }

        var columnLength = columnAry.length;
        var columnMergeChar = getCellCharacterCodeFromInteger(columnLength);

        /** columnHeader array for headings */
        let columnHeader = [];
        columnAry.forEach(column => {
          columnHeader.push(column['header']);
        });
        /** sheet_add_aoa for add column array and row array in sheet */
        var workbook = XLSX.utils.book_new();
        var worksheet = XLSX.utils.aoa_to_sheet([[company_name]]);
        XLSX.utils.sheet_set_range_style(worksheet, 'A1:' + columnMergeChar + '1', { bold: true, sz: 12, name: "Cambria", alignment: { vertical: "middle", horizontal: "center" } });
        XLSX.utils.sheet_add_aoa(worksheet, [["Report", postDataObj['reportType']], ["Node Name", node], ["Duration", reportDate], ["Interval", intervalObj[interval]]], { origin: "A3" });
        XLSX.utils.sheet_set_range_style(worksheet, "A3:A6", { bold: true, name: "Cambria", sz: 11, alignment: { vertical: "middle", horizontal: "center" } });

        var merges = worksheet['!merges'] = [];
        merges.push({ s: 'A1', e: columnMergeChar + '1' });
        merges.push({ s: 'B3', e: columnMergeChar + '3' });
        merges.push({ s: 'B4', e: columnMergeChar + '4' });
        merges.push({ s: 'B5', e: columnMergeChar + '5' });
        merges.push({ s: 'B6', e: columnMergeChar + '6' });

        var columnInteger = 1, columnChar = '', rowInteger = 1, rowChar = '', rowCellNo = 9, rowChar1 = '';
        for (i = 0; i < columnHeader.length; i++) {
          columnChar = getCellCharacterCodeFromInteger(columnInteger);
          XLSX.utils.sheet_add_aoa(worksheet, [columnHeader], { origin: "A8" });
          XLSX.utils.sheet_set_range_style(worksheet, columnChar + '8', { bold: true, name: "Cambria", sz: 11, auto: 1, alignment: { vertical: "middle", horizontal: "center" } });
          columnInteger++;
        }


        for (i = 0; i < rowAry.length; i++) {
          rowChar = getCellCharacterCodeFromInteger(rowInteger);
          rowChar1 = getCellCharacterCodeFromInteger(columnHeader.length);
          XLSX.utils.sheet_add_aoa(worksheet, [rowAry[i]], { origin: "A'" + rowCellNo + "'" });
          XLSX.utils.sheet_set_range_style(worksheet, rowChar + rowCellNo + ':' + rowChar1 + rowCellNo, { sz: 11, name: "Cambria", alignment: { vertical: "middle", horizontal: "center" } });
          rowCellNo++;
        }

        if (download) {
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
          var wbout = XLSX.write(workbook, { type: "array", bookType: 'xlsx', cellStyles: true });
          const buf2 = Buffer.from(wbout, 'wbout');
          promiseAry = []
          rowDataAry = [];
          rowAry = [];
          columnAry = []
          reqDataObj = {}
          reqDataObj1 = {}
          return resolve(buf2);
        }

        if (!download) {
          var tempFilePath = tempfile('.xlsx');
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
          XLSX.writeFile(workbook, tempFilePath, { type: "file", bookType: 'xlsx', cellStyles: true });
          return resolve(tempFilePath);
        }
      })
        .catch(err => {
          return err;
        });
    }
    // )}
    catch (err) {
      return reject(0);
    }
  });
}

/** SheetJS Library Integration...... consumption singlenode ten report  style done dynamically */
function generateSingleNodeConsumptionReportExcelFile(req, session, download) {
  return new Promise((resolve, reject) => {
    try {
      var postDataObj = req.body.postData;
      postDataObj['reportType'] = (req.body.interval == 'tenmin') ? 'Ten Min Report' : req.body['reportType'];
      // postDataObj['reportType'] = req.body['reportType'];
      var promiseAry = [];
      var columnAry = JSON.parse(req.body.columns);
      var node = req.body.node;
      var reportDate = req.body.reportDate;
      var interval = req.body.interval;
      var company_name = session['company_name'];
      promiseAry.push(getPostdataReadings(req, postDataObj));
      Promise.all(promiseAry).then(promiseResult => {
        var dateIndex = 1;
        var rowAry = [];
        var rowDataAry = [];

        if (interval == 'all') {
          for (var date in promiseResult[0]['data']) {
            var dataObj = {};
            dataObj['srno'] = dateIndex;
            dataObj['date'] = date;
            for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
              if ('timestamp' == nodeUniqueIdParamId) {
                continue;
              }
              var nodeId = nodeUniqueIdParamId.split('_');
              dataObj['r' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
            }
            rowDataAry = Object.values(dataObj);
            rowAry.push(rowDataAry);
            dateIndex++;
          }
        } else {
          for (var date in promiseResult[0]['data']) {
            var dataObj = {};
            dataObj['srno'] = dateIndex;
            dataObj['date'] = date;
            for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
              if ('timestamp' == nodeUniqueIdParamId) {
                continue;
              }
              var nodeId = nodeUniqueIdParamId.split('_');
              dataObj['s' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
              dataObj['e' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['endReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
              dataObj['d' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['difference']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
            }
            rowDataAry = Object.values(dataObj);
            rowAry.push(rowDataAry);
            dateIndex++;
          }
        }
        var columnLength = columnAry.length;
        var columnMergeChar = getCellCharacterCodeFromInteger(columnLength);

        /** columnHeader array for headings */
        let columnHeader = [];
        columnAry.forEach(column => {
          columnHeader.push(column['header']);
        });

        /** sheet_add_aoa for add column array and row array in sheet */
        var workbook = XLSX.utils.book_new();
        var worksheet = XLSX.utils.aoa_to_sheet([[company_name]]);
        XLSX.utils.sheet_set_range_style(worksheet, 'A1:' + columnMergeChar + '1', { bold: true, sz: 12, name: "Cambria", alignment: { vertical: "middle", horizontal: "center" } });
        XLSX.utils.sheet_add_aoa(worksheet, [["Report", postDataObj['reportType']], ["Node Name", node], ["Duration", reportDate], ["Interval", intervalObj[interval]]], { origin: "A3" });
        XLSX.utils.sheet_set_range_style(worksheet, "A3:A6", { bold: true, name: "Cambria", sz: 11, alignment: { vertical: "middle", horizontal: "center" } });
        var merges = worksheet['!merges'] = [];
        merges.push({ s: 'A1', e: columnMergeChar + '1' });
        merges.push({ s: 'B3', e: columnMergeChar + '3' });
        merges.push({ s: 'B4', e: columnMergeChar + '4' });
        merges.push({ s: 'B5', e: columnMergeChar + '5' });
        merges.push({ s: 'B6', e: columnMergeChar + '6' });

        var columnInteger = 1, columnChar = '', rowInteger = 1, rowChar = '', rowCellNo = 9, rowChar1 = '';
        for (i = 0; i < columnHeader.length; i++) {
          columnChar = getCellCharacterCodeFromInteger(columnInteger);
          XLSX.utils.sheet_add_aoa(worksheet, [columnHeader], { origin: "A8" });
          XLSX.utils.sheet_set_range_style(worksheet, columnChar + '8', { bold: true, name: "Cambria", sz: 11, auto: 1, alignment: { vertical: "middle", horizontal: "center" } });
          columnInteger++;
        }

        for (i = 0; i < rowAry.length; i++) {
          rowChar = getCellCharacterCodeFromInteger(rowInteger);
          rowChar1 = getCellCharacterCodeFromInteger(columnHeader.length);
          XLSX.utils.sheet_add_aoa(worksheet, [rowAry[i]], { origin: "A'" + rowCellNo + "'" });
          XLSX.utils.sheet_set_range_style(worksheet, rowChar + rowCellNo + ':' + rowChar1 + rowCellNo, { sz: 11, name: "Cambria", alignment: { vertical: "middle", horizontal: "center" } });
          rowCellNo++;
        }

        if (download) {
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
          var wbout = XLSX.write(workbook, { type: "array", bookType: 'xlsx', cellStyles: true });
          const buf2 = Buffer.from(wbout);
          return resolve(buf2);
        }

        if (!download) {
          var tempFilePath = tempfile('.xlsx');
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
          XLSX.writeFile(workbook, tempFilePath, { type: "file", bookType: 'xlsx', cellStyles: true });
          return resolve(tempFilePath);
        }

      }).catch(err => {
        console.log(' generateSingleNodeReportExcelFilein catch block1', err)
        return err;
      });
    } catch (err) {
      console.log(' generateSingleNodeReportExcelFile excel err', err)
      return reject(0);
    }
  });
}

/* code change by kaveri- end*/

/** SheetJS Library Integration...... consumption singlenode comparison report style done dynamically */
// checked
function generateSingleNodeComparisonReportExcelFile(req, session, download) {
  return new Promise((resolve, reject) => {
    try {
      var promiseAry = [];
      var columnAry = JSON.parse(req.body.columns);
      var reportType = req.body['reportType'];
      var node = req.body.node;
      var reportDate = req.body.reportDate;
      var interval = req.body.interval;
      var company_name = session['company_name'];
      var postData1 = req.body.postData[0];
      var postData2 = req.body.postData[1];
      promiseAry.push(getPostdataReadings(req, postData1));
      promiseAry.push(getPostdataReadings(req, postData2));
      Promise.all(promiseAry).then(promiseResult => {
        var dateIndex = 1;
        var rowAry = [];
        var rowDataAry = [];
        for (var date in promiseResult[0]['data']) {
          var dataObj = {};
          dataObj['srno'] = dateIndex;
          dataObj['currentperiod'] = date;
          for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
            if ('timestamp' == nodeUniqueIdParamId) {
              continue;
            }
            var nodeId = nodeUniqueIdParamId.split('_');
            dataObj['s' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
            dataObj['e' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['endReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
            dataObj['d' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['difference']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
          }
          rowDataAry = Object.values(dataObj);
          rowAry.push(rowDataAry);
          dateIndex++;
        }

        var cdateIndex = 1;
        var rowAry1 = [];
        var rowDataAry1 = [];

        for (var date in promiseResult[1]['data']) {
          var dataObj = {};
          dataObj['comparisonperiod'] = date;
          for (var nodeUniqueIdParamId in promiseResult[1]['data'][date]) {
            if ('timestamp' == nodeUniqueIdParamId) {
              continue;
            }
            var nodeId = nodeUniqueIdParamId.split('_');
            dataObj['cs' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[1]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
            dataObj['ce' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[1]['data'][date][nodeUniqueIdParamId]['endReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
            dataObj['cd' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[1]['data'][date][nodeUniqueIdParamId]['difference']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
          }
          rowDataAry1 = Object.values(dataObj);
          rowAry1.push(rowDataAry1);
          cdateIndex++;
        }

        var columnLength = columnAry.length;
        var columnMergeChar = getCellCharacterCodeFromInteger(columnLength);

        /** columnHeader array for headings */
        let columnHeader = [];
        columnAry.forEach(column => {
          columnHeader.push(column['header']);
        });

        /** sheet_add_aoa for add column array and row array in sheet */
        var workbook = XLSX.utils.book_new();
        var worksheet = XLSX.utils.aoa_to_sheet([[company_name]]);
        XLSX.utils.sheet_set_range_style(worksheet, 'A1:' + columnMergeChar + '1', { bold: true, sz: 12, name: "Cambria", alignment: { vertical: "middle", horizontal: "center" } });
        XLSX.utils.sheet_add_aoa(worksheet, [["Report", reportType], ["Node Name", node], ["Duration", reportDate], ["Interval", intervalObj[interval]]], { origin: "A3" });
        XLSX.utils.sheet_set_range_style(worksheet, "A3:A6", { bold: true, name: "Cambria", sz: 11, alignment: { vertical: "middle", horizontal: "center" } });
        var merges = worksheet['!merges'] = [];
        merges.push({ s: 'A1', e: columnMergeChar + '1' });
        merges.push({ s: 'B3', e: columnMergeChar + '3' });
        merges.push({ s: 'B4', e: columnMergeChar + '4' });
        merges.push({ s: 'B5', e: columnMergeChar + '5' });
        merges.push({ s: 'B6', e: columnMergeChar + '6' });

        var columnInteger = 1, columnChar = '', rowInteger = 1, rowChar = '', rowCellNo = 9, rowChar1 = '', rowAryChar = '';
        for (i = 0; i < columnHeader.length; i++) {
          columnChar = getCellCharacterCodeFromInteger(columnInteger);
          XLSX.utils.sheet_add_aoa(worksheet, [columnHeader], { origin: "A8" });
          XLSX.utils.sheet_set_range_style(worksheet, columnChar + '8', { bold: true, name: "Cambria", sz: 11, auto: 1, alignment: { vertical: "middle", horizontal: "center" } });
          columnInteger++;
        }

        for (i = 0; i < rowAry.length; i++) {
          rowChar = getCellCharacterCodeFromInteger(rowInteger);
          rowChar1 = getCellCharacterCodeFromInteger(columnHeader.length);
          XLSX.utils.sheet_add_aoa(worksheet, [rowAry[i]], { origin: "A'" + rowCellNo + "'" });
          rowAryChar = getCellCharacterCodeFromInteger(rowAry[i].length + 1);
          XLSX.utils.sheet_add_aoa(worksheet, [rowAry1[i]], { origin: rowAryChar + rowCellNo });
          XLSX.utils.sheet_set_range_style(worksheet, rowChar + rowCellNo + ':' + rowChar1 + rowCellNo, { sz: 11, name: "Cambria", alignment: { vertical: "middle", horizontal: "center" } });
          rowCellNo++;
        }

        if (download) {
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
          var wbout = XLSX.write(workbook, { type: "array", bookType: 'xlsx', cellStyles: true });
          const buf2 = Buffer.from(wbout);
          return resolve(buf2);
        }

        if (!download) {
          var tempFilePath = tempfile('.xlsx');
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
          XLSX.writeFile(workbook, tempFilePath, { type: "file", bookType: 'xlsx', cellStyles: true });
          return resolve(tempFilePath);
        }

      }).catch(err => {
        return err;
      })
    } catch (err) {
      return reject(0);
    }
  })
}


/** SheetJS Library Integration...... trend report style done dynamically */
// checked
function generateReportExcelFile(req, session, download) {
  return new Promise((resolve, reject) => {
    try {
      var postDataObj = req.body.postData;
      postDataObj['reportType'] = req.body['reportType'];
      var promiseAry = [];
      var columnAry = JSON.parse(req.body.columns);
      var reportType = (req.body.interval == 'tenmin') ? 'Ten Min Report' : req.body['reportType'];
      var node = req.body.node;
      var reportDate = req.body.reportDate;
      var interval = req.body.interval;
      var company_name = session['company_name'];

      promiseAry.push(getPostdataReadings(req, postDataObj));
      Promise.all(promiseAry).then(promiseResult => {
        var dateIndex = 1;
        var rowAry = [];
        var rowDataAry = [];
        if (interval == 'all') {

          for (var date in promiseResult[0]['data']) {
            var dataObj = {};
            dataObj['srno'] = dateIndex;
            dataObj['date'] = date;
            for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
              if ('timestamp' == nodeUniqueIdParamId) {
                continue;
              }
              var nodeId = nodeUniqueIdParamId.split('_');
              dataObj['r' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
            }
            rowDataAry = Object.values(dataObj);
            rowAry.push(rowDataAry);
            dateIndex++;
          }
        } else {
          for (var date in promiseResult[0]['data']) {

            var dataObj = {};
            dataObj['srno'] = dateIndex;
            dataObj['date'] = date;
            for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
              if ('timestamp' == nodeUniqueIdParamId) {
                continue;
              }
              var nodeId = nodeUniqueIdParamId.split('_');
              dataObj['mi' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['min']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
              dataObj['ma' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['max']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
              dataObj['a' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['average']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
            }
            rowDataAry = Object.values(dataObj);
            rowAry.push(rowDataAry);
            dateIndex++;
          }
        }
        var columnLength = columnAry.length;
        var columnMergeChar = getCellCharacterCodeFromInteger(columnLength);

        /** columnHeader array for headings */
        let columnHeader = [];
        columnAry.forEach(column => {
          columnHeader.push(column['header']);
        });

        /** sheet_add_aoa for add column array and row array in sheet */
        var workbook = XLSX.utils.book_new();
        var worksheet = XLSX.utils.aoa_to_sheet([[company_name]]);
        XLSX.utils.sheet_set_range_style(worksheet, 'A1:' + columnMergeChar + '1', { bold: true, sz: 12, name: "Cambria", alignment: { vertical: "middle", horizontal: "center" } });
        XLSX.utils.sheet_add_aoa(worksheet, [["Report", reportType], ["Node Name", node], ["Duration", reportDate], ["Interval", intervalObj[interval]]], { origin: "A3" });
        XLSX.utils.sheet_set_range_style(worksheet, "A3:A6", { bold: true, name: "Cambria", sz: 11, alignment: { vertical: "middle", horizontal: "center" } });
        var merges = worksheet['!merges'] = [];
        merges.push({ s: 'A1', e: columnMergeChar + '1' });
        merges.push({ s: 'B3', e: columnMergeChar + '3' });
        merges.push({ s: 'B4', e: columnMergeChar + '4' });
        merges.push({ s: 'B5', e: columnMergeChar + '5' });
        merges.push({ s: 'B6', e: columnMergeChar + '6' });

        var columnInteger = 1, columnChar = '', rowInteger = 1, rowChar = '', rowCellNo = 9, rowChar1 = '';
        for (i = 0; i < columnHeader.length; i++) {
          columnChar = getCellCharacterCodeFromInteger(columnInteger);
          XLSX.utils.sheet_add_aoa(worksheet, [columnHeader], { origin: "A8" });
          XLSX.utils.sheet_set_range_style(worksheet, columnChar + '8', { bold: true, name: "Cambria", sz: 11, auto: 1, alignment: { vertical: "middle", horizontal: "center" } });
          columnInteger++;
        }

        for (i = 0; i < rowAry.length; i++) {
          rowChar = getCellCharacterCodeFromInteger(rowInteger);
          rowChar1 = getCellCharacterCodeFromInteger(columnHeader.length);
          XLSX.utils.sheet_add_aoa(worksheet, [rowAry[i]], { origin: "A'" + rowCellNo + "'" });
          XLSX.utils.sheet_set_range_style(worksheet, rowChar + rowCellNo + ':' + rowChar1 + rowCellNo, { sz: 11, name: "Cambria", alignment: { vertical: "middle", horizontal: "center" } });
          rowCellNo++;
        }

        if (download) {
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
          var wbout = XLSX.write(workbook, { type: "array", bookType: 'xlsx', cellStyles: true });
          const buf2 = Buffer.from(wbout);
          return resolve(buf2);
        }

        if (!download) {
          var tempFilePath = tempfile('.xlsx');
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
          XLSX.writeFile(workbook, tempFilePath, { type: "file", bookType: 'xlsx', cellStyles: true });
          return resolve(tempFilePath);
        }

      }).catch(err => {
        return err;
      });

    } catch (err) {
      return reject(0);
    }
  });
}

/** SheetJS Library Integration...... trend comparison report style done dynamically */

function generateComparisonReportExcelFile(req, session, download) {
  return new Promise((resolve, reject) => {
    try {
      var postDataObj = req.body.postData;
      var reportType = req.body['reportType'];
      var promiseAry = [];
      var columnAry = JSON.parse(req.body.columns);
      var reportType = req.body['reportType'];
      var node = req.body.node;
      var reportDate = req.body.reportDate;
      var interval = req.body.interval;
      var company_name = session['company_name'];


      promiseAry.push(getPostdataReadings(req, postDataObj[0]));
      promiseAry.push(getPostdataReadings(req, postDataObj[1]));

      Promise.all(promiseAry).then(promiseResult => {
        var dateIndex = 1;
        var rowAry = [];
        var rowDataAry = [];

        for (var currentperiod in promiseResult[0]['data']) {
          var dataObj = {};
          dataObj['srno'] = dateIndex;
          dataObj['currentperiod'] = currentperiod;
          for (var nodeUniqueIdParamId in promiseResult[0]['data'][currentperiod]) {
            if ('timestamp' == nodeUniqueIdParamId) {
              continue;
            }
            dataObj['mi' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][currentperiod][nodeUniqueIdParamId]['min']['unitReading'], req.body.numberFormat);
            dataObj['ma' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][currentperiod][nodeUniqueIdParamId]['max']['unitReading'], req.body.numberFormat);
            dataObj['a' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][currentperiod][nodeUniqueIdParamId]['average']['unitReading'], req.body.numberFormat);
          }
          rowDataAry = Object.values(dataObj);
          rowAry.push(rowDataAry);
          dateIndex++;
        }

        var cdateIndex = 1;
        var rowAry1 = [];
        var rowDataAry1 = [];

        for (var comparisonperiod in promiseResult[1]['data']) {
          var dataObj = {};
          dataObj['comparisonperiod'] = comparisonperiod;
          for (var nodeUniqueIdParamId in promiseResult[1]['data'][comparisonperiod]) {
            if ('timestamp' == nodeUniqueIdParamId) {
              continue;
            }
            dataObj['cmi' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[1]['data'][comparisonperiod][nodeUniqueIdParamId]['min']['unitReading'], req.body.numberFormat);
            dataObj['cma' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[1]['data'][comparisonperiod][nodeUniqueIdParamId]['max']['unitReading'], req.body.numberFormat);
            dataObj['ca' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[1]['data'][comparisonperiod][nodeUniqueIdParamId]['average']['unitReading'], req.body.numberFormat);
          }
          rowDataAry1 = Object.values(dataObj);
          rowAry1.push(rowDataAry1);
          cdateIndex++;
        }

        var columnLength = columnAry.length;
        var columnMergeChar = getCellCharacterCodeFromInteger(columnLength);

        /** columnHeader array for headings */
        let columnHeader = [];
        columnAry.forEach(column => {
          columnHeader.push(column['header']);
        });

        /** sheet_add_aoa for add column array and row array in sheet */
        var workbook = XLSX.utils.book_new();
        var worksheet = XLSX.utils.aoa_to_sheet([[company_name]]);
        XLSX.utils.sheet_set_range_style(worksheet, 'A1:' + columnMergeChar + '1', { bold: true, sz: 12, name: "Cambria", alignment: { vertical: "middle", horizontal: "center" } });
        XLSX.utils.sheet_add_aoa(worksheet, [["Report", reportType], ["Node Name", node], ["Duration", reportDate], ["Interval", intervalObj[interval]]], { origin: "A3" });
        XLSX.utils.sheet_set_range_style(worksheet, "A3:A6", { bold: true, name: "Cambria", sz: 11, alignment: { vertical: "middle", horizontal: "center" } });
        var merges = worksheet['!merges'] = [];
        merges.push({ s: 'A1', e: columnMergeChar + '1' });
        merges.push({ s: 'B3', e: columnMergeChar + '3' });
        merges.push({ s: 'B4', e: columnMergeChar + '4' });
        merges.push({ s: 'B5', e: columnMergeChar + '5' });
        merges.push({ s: 'B6', e: columnMergeChar + '6' });

        var columnInteger = 1, columnChar = '', rowInteger = 1, rowChar = '', rowCellNo = 9, rowChar1 = '', rowAryChar = '';
        for (i = 0; i < columnHeader.length; i++) {
          columnChar = getCellCharacterCodeFromInteger(columnInteger);
          XLSX.utils.sheet_add_aoa(worksheet, [columnHeader], { origin: "A8" });
          XLSX.utils.sheet_set_range_style(worksheet, columnChar + '8', { bold: true, name: "Cambria", sz: 11, auto: 1, alignment: { vertical: "middle", horizontal: "center" } });
          columnInteger++;
        }

        for (i = 0; i < rowAry.length; i++) {
          rowChar = getCellCharacterCodeFromInteger(rowInteger);
          rowChar1 = getCellCharacterCodeFromInteger(columnHeader.length);
          XLSX.utils.sheet_add_aoa(worksheet, [rowAry[i]], { origin: "A'" + rowCellNo + "'" });
          rowAryChar = getCellCharacterCodeFromInteger(rowAry[i].length + 1);
          XLSX.utils.sheet_add_aoa(worksheet, [rowAry1[i]], { origin: rowAryChar + rowCellNo });
          XLSX.utils.sheet_set_range_style(worksheet, rowChar + rowCellNo + ':' + rowChar1 + rowCellNo, { sz: 11, name: "Cambria", alignment: { vertical: "middle", horizontal: "center" } });
          rowCellNo++;
        }

        if (download) {
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
          var wbout = XLSX.write(workbook, { type: "array", bookType: 'xlsx', cellStyles: true });
          const buf2 = Buffer.from(wbout);
          return resolve(buf2);
        }

        if (!download) {
          var tempFilePath = tempfile('.xlsx');
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
          XLSX.writeFile(workbook, tempFilePath, { type: "file", bookType: 'xlsx', cellStyles: true });
          return resolve(tempFilePath);
        }

      }).catch(err => {
        console.log(' generateComparisonReportExcelFilein catch block1', err)
        return err;
      });
    } catch (err) {
      return reject(0);
    }
  });
}



/** SheetJS Library Integration...... consumption multinode location wise and groupwise report dynamically */
// checked checked
function generateLocationWiseExcelReportFile(req, session, download) {
  return new Promise((resolve, reject) => {
    try {
      let promiseAry = [];
      var readingDataObj = JSON.parse(req.body['requestActionData']);
      var reportType = req.body.reportType;
      var parameter = req.body.parameter;
      var reportDate = req.body.reportDate;
      var interval = req.body.interval;
      var postDataObj = req.body.postData;
      var company_name = session['company_name'];
      var type = req.body['reportType'];
      delete postDataObj['node'];
      delete postDataObj['nodeGroupObj'];
      delete postDataObj['nodeGroupIndexingObj'];
      promiseAry.push(getPostdataReadings(req, postDataObj));
      Promise.all(promiseAry).then(promiseResult => {
        let dateIndex = 1;
        let rowAry = [];
        let rowDataAry = [];
        if (interval == 'all') {
          for (var date in promiseResult[0]['data']) {
            var dataObj = {};
            dataObj['srno'] = dateIndex;
            dataObj['date'] = date;
            for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
              if ('timestamp' == nodeUniqueIdParamId) {
                continue;
              }
              var nodeId = nodeUniqueIdParamId.split('_');
              dataObj['r' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
            }
            rowDataAry = Object.values(dataObj);
            rowAry.push(rowDataAry);
            dateIndex++;

          }
        } else {
          for (var date in promiseResult[0]['data']) {
            var dataObj = {};
            dataObj['srno'] = dateIndex;
            dataObj['date'] = date;
            for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
              if ('timestamp' == nodeUniqueIdParamId) {
                continue;
              }
              var nodeId = nodeUniqueIdParamId.split('_');
              if (req.body.isinstantaneous == 0) {
                dataObj['s' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                dataObj['e' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['endReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                dataObj['d' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['difference']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
              }
              if (req.body.isinstantaneous == 1) {
                dataObj['mi' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['min']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                dataObj['ma' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['max']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                dataObj['a' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['average']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
              }
            }
            rowDataAry = Object.values(dataObj);
            rowAry.push(rowDataAry);
            dateIndex++;
          }
        }

        /** columnHeader array for headings */
        let columnHeader = [];
        let parentHeader = [];
        let parentHeader1 = [];
        let subHeader = [];
        let subHeader1 = [];

        for (var nodeGroupId in readingDataObj) {
          columnHeader.push(readingDataObj[nodeGroupId]['nodeGroup'], readingDataObj[nodeGroupId]['nodeGroupReading']);
        };
        var pColumnInteger = 1;
        readingDataObj[nodeGroupId]['nodeGroupTblParentCols'].forEach((pColumn, pColumnIndex) => {
          if (pColumnIndex < 2) {
            parentHeader.push(pColumn['header']);
            pColumnInteger++;

          }
          if (pColumnIndex >= 2) {
            nodeGroupEndColumnChar = getCellCharacterCodeFromInteger(pColumnInteger + 2);
            parentHeader.push(pColumn['header']);
            pColumnInteger = pColumnInteger + 3;

          }
        });
        readingDataObj[nodeGroupId]['nodeGroupTblCols'].forEach(column => {
          subHeader.push(column['header']);
        });
        var parentHeader2 = parentHeader.splice(0, 2);
        parentHeader1.push(parentHeader);
        subHeader1.push(subHeader);

        /** sheet_add_aoa for add column array and row array in sheet */
        var workbook = XLSX.utils.book_new();
        var worksheet = XLSX.utils.aoa_to_sheet([[company_name]]);
        XLSX.utils.sheet_set_range_style(worksheet, "A1:E1", { bold: true, sz: 12, name: "Cambria", alignment: { vertical: "middle", horizontal: "center" } });
        XLSX.utils.sheet_add_aoa(worksheet, [["Report", reportType], ["Parameter Name", parameter], ["Duration", reportDate], ["Interval", intervalObj[interval]]], { origin: "A3" });
        XLSX.utils.sheet_set_range_style(worksheet, "A3:A6", { bold: true, name: "Cambria", sz: 11, alignment: { vertical: "middle", horizontal: "center" } });
        if (type != 'Multi Node') {
          XLSX.utils.sheet_add_aoa(worksheet, [columnHeader], { origin: "A8" });
          XLSX.utils.sheet_set_range_style(worksheet, "A8:E8", { bold: true, name: "Cambria", sz: 11, auto: 1, alignment: { vertical: "middle", horizontal: "center" } });
        }
        var merges = worksheet['!merges'] = [];

        var firstsubHeader = '', mergeCount = 2, endCount = 2, startCount = 3, diffCount = '';
        var parentHeadercellNo = 10, subHeadercellNo = 11;

        subHeader.push(subHeader[2]);
        for (j = 2; j < subHeader.length; j++) {
          if (firstsubHeader == '') {
            firstsubHeader = subHeader[j];
            mergeCount++;
          }
          else {
            if (firstsubHeader == subHeader[j]) {
              endCount;
              endCount = mergeCount;
              mergeCount++;
              var varCnt = startCount;
              var startChar = getCellCharacterCodeFromInteger(startCount);
              var endChar = getCellCharacterCodeFromInteger(endCount);
              merges.push({ s: startChar + parentHeadercellNo, e: endChar + parentHeadercellNo });
              startCount = endCount + 1;
              var diffCnt = startCount;
              var diffCount = mergeCount - varCnt;
            }
            else {
              mergeCount++;
            }
          }
        }
        subHeader.pop();
        var cnt = 3;
        for (i = 0; i < parentHeader.length; i++) {
          var parentHeaderChar = getCellCharacterCodeFromInteger(cnt);
          XLSX.utils.sheet_add_aoa(worksheet, [[parentHeader[i]]], { origin: parentHeaderChar + '10' });
          XLSX.utils.sheet_set_range_style(worksheet, 'A' + parentHeadercellNo + ':' + parentHeaderChar + parentHeadercellNo, { bold: true, name: "Cambria", sz: 11, auto: 1, alignment: { vertical: "center", horizontal: "center" } });
          cnt = cnt + diffCount;
        }

        for (i = 0; i < subHeader1.length; i++) {
          var subHeaderChar = getCellCharacterCodeFromInteger(subHeader.length);
          XLSX.utils.sheet_add_aoa(worksheet, [subHeader1[i]], { origin: "A'" + subHeadercellNo + "'" });
          XLSX.utils.sheet_set_range_style(worksheet, 'A' + subHeadercellNo + ':' + subHeaderChar + subHeadercellNo, { bold: true, name: "Cambria", sz: 11, auto: 1, alignment: { vertical: "middle", horizontal: "center" } });
        }

        var rowCellNo = 12;
        for (i = 0; i < rowAry.length; i++) {
          rowChar = getCellCharacterCodeFromInteger(rowAry.length);
          XLSX.utils.sheet_add_aoa(worksheet, [rowAry[i]], { origin: "A'" + rowCellNo + "'" });
          XLSX.utils.sheet_set_range_style(worksheet, 'A' + rowCellNo + ':' + rowChar + rowCellNo, { name: "Cambria", sz: 11, alignment: { vertical: "middle", horizontal: "center" } });
          rowCellNo++;
        }

        merges.push({ s: 'A1', e: subHeaderChar + '1' });

        if (download) {
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
          var wbout = XLSX.write(workbook, { type: "array", bookType: 'xlsx', cellStyles: true });
          const buf2 = Buffer.from(wbout);

          return resolve(buf2);
        }

        if (!download) {
          var tempFilePath = tempfile('.xlsx');
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
          XLSX.writeFile(workbook, tempFilePath, { type: "file", bookType: 'xlsx', cellStyles: true });
          return resolve(tempFilePath);
        }

      }).catch(err => {
        return err;
      });
    } catch (err) {
      return reject(0);
    }
  });
}
//checked

function generateComparisonReportPDFFile(req, session, download) {
  return new Promise((resolve, reject) => {
    try {

      const postDataObj = req.body.postData;
      postDataObj[0]['reportType'] = (req.body.interval == 'tenmin') ? 'Ten Min Report' : req.body['reportType'];


      let promiseAry = [];
      var columnAry = JSON.parse(req.body.columns);
      var node = req.body.node;
      var reportDate = req.body.reportDate;
      var interval = req.body.interval;
      var chartImg = req.body.chartImg;



      var reqDataObj = postDataObj[0]//commulative
      var reqDataObj1 = postDataObj[1]//instan



      promiseAry.push(getPostdataReadings(req, reqDataObj));
      promiseAry.push(getPostdataReadings(req, reqDataObj1));

      Promise.all(promiseAry).then(promiseResult => {
        var dateIndex = 1;
        var rowAry = [];

        for (var currentperiod in promiseResult[0]['data']) {
          var dataObj = {};
          dataObj['srno'] = dateIndex;
          dataObj['currentperiod'] = currentperiod;
          for (var nodeUniqueIdParamId in promiseResult[0]['data'][currentperiod]) {
            if ('timestamp' == nodeUniqueIdParamId) {
              continue;
            }
            var nodeId = nodeUniqueIdParamId.split('_');
            dataObj['mi' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][currentperiod][nodeUniqueIdParamId]['min']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
            dataObj['ma' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][currentperiod][nodeUniqueIdParamId]['max']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
            dataObj['a' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][currentperiod][nodeUniqueIdParamId]['average']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
          }
          rowAry.push(dataObj);
          dateIndex++;
        }
        var rowAry1 = [];
        for (var comparisonperiod in promiseResult[1]['data']) {
          var dataObj = {};
          dataObj['comparisonperiod'] = comparisonperiod;

          for (var nodeUniqueIdParamId in promiseResult[1]['data'][comparisonperiod]) {
            if ('timestamp' == nodeUniqueIdParamId) {
              continue;
            }
            var nodeId = nodeUniqueIdParamId.split('_');
            dataObj['cmi' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[1]['data'][comparisonperiod][nodeUniqueIdParamId]['min']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
            dataObj['cma' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[1]['data'][comparisonperiod][nodeUniqueIdParamId]['max']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
            dataObj['ca' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[1]['data'][comparisonperiod][nodeUniqueIdParamId]['average']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
          }
          rowAry1.push(dataObj);
        }

        var mergeAry = rowAry.map((item, i) => Object.assign({}, item, rowAry1[i]));
        var pdfTblBody = [], pdfTblCols = [], pdfTblRowsObj = {};
        columnAry.forEach((column, columnIndex) => {
          pdfTblCols.push({ text: column['header'], style: 'clsTblHeader' });
          mergeAry.forEach((row, rowIndex) => {
            if ('undefined' == typeof pdfTblRowsObj[rowIndex]) {
              pdfTblRowsObj[rowIndex] = [];
            }
            pdfTblRowsObj[rowIndex].push(row[column['columnDef']]);
          });
        });
        pdfTblBody.push(pdfTblCols);
        for (var pdfTblRowIndex in pdfTblRowsObj) {
          pdfTblBody.push(pdfTblRowsObj[pdfTblRowIndex]);
        }
        var docDefinition = {
          footer: function (currentPage, pageCount) {
            return {
              margin: [40, 0, 0, 0],
              columns: [{
                fontSize: 8,
                text: [
                  {
                    text: 'Page ' + currentPage.toString() + ' / ' + pageCount,
                  }
                ],
              }]
            };
          },
          content: [
            { text: session['company_name'], style: 'clsHeader' },
            { text: 'Report : ' + postDataObj[0]['reportType'], style: 'clsSubHeader' },
            { text: 'Node Name : ' + node, style: 'clsSubHeader' },
            { text: 'Duration : ' + reportDate, style: 'clsSubHeader' },
            { text: 'Interval : ' + intervalObj[interval], style: 'clsSubHeader' },
            {
              image: chartImg,
              width: 530,
              height: 800,
              fit: [530, 600],
              pageBreak: 'after',
              style: 'clsImage'
            },
            {
              style: 'clsTable',
              table: {
                headerRows: 1,
                body: pdfTblBody,
              }
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
              margin: [0, 40, 0, 0]
            },
            clsTable: {
              fontSize: 8
            }
          },
          defaultStyle: {
            alignment: 'justify'
          }
        }
        var doc = printer.createPdfKitDocument(docDefinition);
        var chunks = [];
        doc.on('readable', function () {
          var chunk;
          while ((chunk = doc.read(9007199254740991)) !== null) {
            chunks.push(chunk);
          }
        });
        if (download) {
          doc.on('end', function () {
            var buffer = Buffer.concat(chunks);
            return resolve(buffer);
          });
          doc.end();
        }
        if (!download) {
          var tempFilePath = tempfile('.pdf');
          var wait;
          doc.pipe(wait = fs.createWriteStream(tempFilePath));
          doc.end();
          wait.on('finish', function () {
            return resolve(tempFilePath);
          });
        }
      }).catch(err => {
        return err;
      });
    } catch (err) {
      return reject(0);
    }
  });
}


// checked
function generateReportPDFFile(req, session, download) {
  return new Promise((resolve, reject) => {
    try {
      var postDataObj = req.body.postData;
      postDataObj['reportType'] = req.body['reportType'];
      var promiseAry = [];
      var columnAry = JSON.parse(req.body.columns);
      var reportType = req.body['reportType'];
      var node = req.body.node;
      var reportDate = req.body.reportDate;
      var interval = req.body.interval;
      var chartImg = req.body.chartImg;

      promiseAry.push(getPostdataReadings(req, postDataObj));
      Promise.all(promiseAry).then(promiseResult => {
        var dateIndex = 1;
        var rowAry = [];
        if (interval == 'all') {
          for (var date in promiseResult[0]['data']) {
            var dataObj = {};
            dataObj['srno'] = dateIndex;
            dataObj['date'] = date;
            for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
              if ('timestamp' == nodeUniqueIdParamId) {
                continue;
              }
              var nodeId = nodeUniqueIdParamId.split('_');
              dataObj['r' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
            }
            rowAry.push(dataObj);
            dateIndex++;
          }

        } else {
          for (var date in promiseResult[0]['data']) {
            var dataObj = {};
            dataObj['srno'] = dateIndex;
            dataObj['date'] = date;
            for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
              if ('timestamp' == nodeUniqueIdParamId) {
                continue;
              }
              var nodeId = nodeUniqueIdParamId.split('_');
              dataObj['mi' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['min']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
              dataObj['ma' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['max']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
              dataObj['a' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['average']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
            }
            rowAry.push(dataObj);
            dateIndex++;
          }
        }
        var pdfTblBody = [], pdfTblCols = [], pdfTblRowsObj = {};
        columnAry.forEach((column, columnIndex) => {
          pdfTblCols.push({ text: column['header'], style: 'clsTblHeader' });
          rowAry.forEach((row, rowIndex) => {
            if ('undefined' == typeof pdfTblRowsObj[rowIndex]) {
              pdfTblRowsObj[rowIndex] = [];
            }
            pdfTblRowsObj[rowIndex].push(row[column['columnDef']]);
          });
        });
        pdfTblBody.push(pdfTblCols);
        for (var pdfTblRowIndex in pdfTblRowsObj) {
          pdfTblBody.push(pdfTblRowsObj[pdfTblRowIndex]);
        }
        var docDefinition = {
          footer: function (currentPage, pageCount) {
            return {
              margin: [40, 0, 0, 0],
              columns: [{
                fontSize: 8,
                text: [
                  {
                    text: 'Page ' + currentPage.toString() + ' / ' + pageCount,
                  }
                ],
              }]
            };
          },
          content: [
            { text: session['company_name'], style: 'clsHeader' },
            { text: 'Report : ' + reportType, style: 'clsSubHeader' },
            { text: 'Node Name : ' + node, style: 'clsSubHeader' },
            { text: 'Duration : ' + reportDate, style: 'clsSubHeader' },
            { text: 'Interval : ' + intervalObj[interval], style: 'clsSubHeader' },
            {
              image: chartImg,
              width: 530,
              height: 800,
              fit: [530, 600],
              pageBreak: 'after',
              style: 'clsImage'
            },
            {
              style: 'clsTable',
              table: {
                headerRows: 1,
                body: pdfTblBody
              }
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
              margin: [0, 40, 0, 0]
            },
            clsTable: {
              fontSize: 8
            }
          },
          defaultStyle: {
            alignment: 'justify'
          }
        }
        var doc = printer.createPdfKitDocument(docDefinition);
        var chunks = [];
        doc.on('readable', function () {
          var chunk;
          while ((chunk = doc.read(9007199254740991)) !== null) {
            chunks.push(chunk);
          }
        });

        if (download) {
          doc.on('end', function () {
            var buffer = Buffer.concat(chunks);
            return resolve(buffer);
          });
          doc.end();
        }
        if (!download) {
          var tempFilePath = tempfile('.pdf');
          var wait;
          doc.pipe(wait = fs.createWriteStream(tempFilePath));
          doc.end();
          wait.on('finish', function () {
            return resolve(tempFilePath);
          });
        }
      }).catch(err => {
        return err;
      });
    } catch (err) {
      return reject(0);
    }
  });
}
// checked
function generateGroupReportPDFFile(req, session, download) {
  return new Promise((resolve, reject) => {
    try {
      var promiseAry = [];
      var rowAry = [];
      var reportType = req.body.reportType;
      var parameter = req.body.parameter;
      var reportDate = req.body.reportDate;
      var interval = req.body.interval;
      var postDataObj = req.body.postData;
      var chartImg = req.body.chartImg;
      var readingDataObj = JSON.parse(req.body['requestActionData']);
      delete postDataObj['node'];
      delete postDataObj['nodeGroupObj'];
      delete postDataObj['nodeGroupIndexingObj'];
      promiseAry.push(getPostdataReadings(req, postDataObj));
      Promise.all(promiseAry).then(promiseResult => {
        var dateIndex = 1;
        var rowAry = [];
        if (interval == 'all') {
          for (var date in promiseResult[0]['data']) {
            var dataObj = {};
            dataObj['srno'] = dateIndex;
            dataObj['date'] = date;

            for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
              if ('timestamp' == nodeUniqueIdParamId) {
                continue;
              }
              var nodeId = nodeUniqueIdParamId.split('_');
              dataObj['r' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
            }
            rowAry.push(dataObj);
            dateIndex++;
          }
        }
        else {
          for (var date in promiseResult[0]['data']) {

            var dataObj = {};
            dataObj['srno'] = dateIndex;
            dataObj['date'] = date;
            for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
              if ('timestamp' == nodeUniqueIdParamId) {
                continue;
              }
              var nodeId = nodeUniqueIdParamId.split('_');
              if (req.body.isinstantaneous == 0) {

                dataObj['s' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                dataObj['e' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['endReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                dataObj['d' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['difference']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
              }
              if (req.body.isinstantaneous == 1) {

                dataObj['mi' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['min']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                dataObj['ma' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['max']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                dataObj['a' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['average']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
              }
            }


            rowAry.push(dataObj);
            dateIndex++;
          }
        }
        var contentAry = [{ text: session['company_name'], style: 'clsHeader' },
        { text: 'Report : ' + reportType, style: 'clsSubHeader' },
        { text: 'Parameter Name : ' + parameter, style: 'clsSubHeader' },
        { text: 'Duration : ' + reportDate, style: 'clsSubHeader' },
        { text: 'Interval : ' + intervalObj[interval], style: 'clsSubHeader' },
        { image: chartImg, width: 530, height: 800, fit: [530, 600], pageBreak: 'after', style: 'clsImage' }];

        var index = 0;
        for (var nodeGroupId in readingDataObj) {
          var pdfParentTblCols = [], pdfTblCols = [], pdfTblRowsObj = {};

          /** to not shows total consumption of laction and group in multinode report start*/
          if (reportType != 'Multi Node') {

            if (index == 0) contentAry.push({ text: readingDataObj[nodeGroupId]['nodeGroup'] + ' : ' + readingDataObj[nodeGroupId]['nodeGroupReading'], style: 'clsSubHeader' });
            else contentAry.push({ text: readingDataObj[nodeGroupId]['nodeGroup'] + ' : ' + readingDataObj[nodeGroupId]['nodeGroupReading'], style: 'clsSubHeader', pageBreak: 'before' });
          }
          /** to not shows total consumption of laction and group in multinode report end*/

          var tableObj = { table: { headerRows: 2, body: [] } };
          readingDataObj[nodeGroupId]['nodeGroupTblParentCols'].forEach((pColumn, pColumnIndex) => {
            if (pColumnIndex < 2 || pColumnIndex >= 2 && interval == 'all') {
              pdfParentTblCols.push({ text: pColumn['header'], style: 'clsTblHeader' });
            }

            if (pColumnIndex >= 2 && interval != 'all') {
              pdfParentTblCols.push({ text: pColumn['header'], style: 'clsTblHeader', colSpan: 3 });
              pdfParentTblCols.push({});
              pdfParentTblCols.push({});
            }
          });
          readingDataObj[nodeGroupId]['nodeGroupTblCols'].forEach((column, columnIndex) => {
            pdfTblCols.push({ text: column['header'], style: 'clsTblHeader' });
            rowAry.forEach((row, rowIndex) => {
              if ('undefined' == typeof pdfTblRowsObj[rowIndex]) {
                pdfTblRowsObj[rowIndex] = [];
              }
              if ('undefined' != typeof row[column['columnDef']]) {
                pdfTblRowsObj[rowIndex].push(row[column['columnDef']]);
              }

              else {
                pdfTblRowsObj[rowIndex].push('-');
              }
            });
          });
          tableObj['table']['body'].push(pdfParentTblCols);
          tableObj['table']['body'].push(pdfTblCols);
          for (var pdfTblRowIndex in pdfTblRowsObj) {
            tableObj['table']['body'].push(pdfTblRowsObj[pdfTblRowIndex]);
          }


          contentAry.push(tableObj);
          index++;
        }
        var docDefinition = {
          footer: function (currentPage, pageCount) {
            return {
              margin: [40, 0, 0, 0],
              columns: [{
                fontSize: 8,
                text: [
                  {
                    text: 'Page ' + currentPage.toString() + ' / ' + pageCount,
                  }
                ],
              }]
            };
          },
          content: contentAry,
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
              margin: [0, 40, 0, 0]
            },
            clsTable: {
              fontSize: 8
            }
          },
          defaultStyle: {
            alignment: 'justify'
          }
        }

        var doc = printer.createPdfKitDocument(docDefinition);
        var chunks = [];
        doc.on('readable', function () {
          var chunk;
          while ((chunk = doc.read(9007199254740991)) !== null) {
            chunks.push(chunk);
          }
        });

        if (download) {
          doc.on('end', function () {
            var buffer = Buffer.concat(chunks);
            return resolve(buffer);
          });
          doc.end();
        }
        if (!download) {
          var tempFilePath = tempfile('.pdf');
          var wait;
          doc.pipe(wait = fs.createWriteStream(tempFilePath));
          doc.end();
          wait.on('finish', function () {
            return resolve(tempFilePath);
          });
        }
      }).catch(err => {
        return err;
      });
    } catch (err) {
      return reject(0);
    }
  });
}
// checked
function applyDecimalUnit(x, numberFormat, defaultSymbol = '') {
  if ('' == x || null == x) {
    return '-';
  }
  else {
    var readingAry = x.split(' ');
    var value = readingAry[0] * 100 / 100;
    let unit = ('' != readingAry[1]) ? readingAry[1] : defaultSymbol;
    return value.toLocaleString(numberFormat, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + unit;
  }
}
// checked
function getCellCharacterCodeFromInteger(number) {
  var baseChar = ("A").charCodeAt(0), letters = "";
  do {
    number -= 1;
    letters = String.fromCharCode(baseChar + (number % 26)) + letters;
    number = (number / 26) >> 0;
  } while (number > 0);
  return letters;
}
/* code change by kaveri- start*/
function generateSingleNodeReportPDFFile(req, session, download) {
  return new Promise((resolve, reject) => {
    try {
      const postDataObj = req.body.postData;
      postDataObj['reportType'] = req.body['reportType'];
      let promiseAry = [];
      var columnAry = JSON.parse(req.body.columns);
      var node = req.body.node;
      var reportDate = req.body.reportDate;
      var interval = req.body.interval;
      var chartImg = req.body.chartImg;
      var company_name = session['company_name'];

      var reqDataObj = postDataObj[0]//commulative
      var reqDataObj1 = postDataObj[1]//instan
      var parameters = req.session.passport.user.parameters;

      if (postDataObj.length == 2) {
        reqDataObj.parameterId = lodash.union(postDataObj[0].parameterId, lodash.get(postDataObj[1], ['parameterId']));
        reqDataObj1.parameterId = lodash.union(postDataObj[0].parameterId, lodash.get(postDataObj[1], ['parameterId']));

        promiseAry.push(getPostdataReadings(req, reqDataObj));
        promiseAry.push(getPostdataReadings(req, reqDataObj1));
      }

      else if (postDataObj.length == 1) {
        promiseAry.push(getPostdataReadings(req, postDataObj[0]));
      }
      else {
        return;
      }

      Promise.all(promiseAry).then(async promiseResult => {
        let dateIndex = 1;
        let rowDataAry = [];
        let rowAry = [];

        /* for both parameter of process data */
        if (promiseResult.length == 2) {
          /* For all interval */
          if (interval == 'all') {
            rowAry = [];
            rowDataAry = [];
            for (var date in promiseResult[0]['data']) {
              var dataObj = {};
              dataObj['srno'] = dateIndex;
              dataObj['date'] = date;
              postDataObj.map(item => {
                console.log(item, 'postDataObj');
                var timeF = date.split(' ')[1].substring(0, 5);
                var timeT = date.split(' ')[1].substring(0, 5);
                if ((timeF >= item['fTime']) && (timeT <= item['tTime'])) {

                  for (var nodeUniqueIdParamId in promiseResult[1]['data'][date]) {
                    if ('timestamp' == nodeUniqueIdParamId) {
                      continue;
                    }
                    var nodeId = nodeUniqueIdParamId.split('_');
                    if (parameters[nodeId[1]].parameter_type != 1) {
                      continue
                    }
                    else {
                      dataObj['r' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[1]['data'][date][nodeUniqueIdParamId]['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                    }
                  }

                  for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
                    if ('timestamp' == nodeUniqueIdParamId) {
                      continue;
                    }
                    var nodeId = nodeUniqueIdParamId.split('_');
                    if (parameters[nodeId[1]].parameter_type != 0) {
                      continue
                    }
                    else {
                      dataObj['r' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                    }
                  }

                  rowAry.push(dataObj);
                  dateIndex++;
                }
                else {
                  delete dataObj['srno'];
                  delete dataObj['date'];
                }
              })
            }
          }

          /* for process data */
          else {


            /********************* Added by Arjun - Start ***********************/

            InstAry = [];
            CumuAry = [];

            await columnAry.forEach(async column => {

              var temp = column.columnDef.split('_')

              if (temp.length == 2) {

                if (parameters[temp[1]].parameter_type == 1) {
                  var data = {
                    columnDef: column.columnDef,
                    header: column.header
                  }
                  InstAry.push(data)
                } else if (parameters[temp[1]].parameter_type == 0) {
                  var data = {
                    columnDef: column.columnDef,
                    header: column.header
                  }
                  CumuAry.push(data)
                }

              } else if (temp.length == 1) {
                var data = {
                  columnDef: column.columnDef,
                  header: column.header
                }
                InstAry.push(data)
              }

            })

            var temp = InstAry.concat(CumuAry)
            columnAry = temp

            /********************* Added by Arjun - End ***********************/


            for (let date in promiseResult[0]['data']) {
              let dataObj = {};
              dataObj['srno'] = dateIndex;
              dataObj['date'] = date;

              for (let nodeUniqueIdParamId in promiseResult[1]['data'][date]) {
                if ('timestamp' == nodeUniqueIdParamId) {
                  continue;
                }
                let nodeId = nodeUniqueIdParamId.split('_');
                if (parameters[nodeId[1]].parameter_type != 1) {
                  continue
                }
                else {
                  dataObj['mi' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[1]['data'][date][nodeUniqueIdParamId]['min']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                  dataObj['ma' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[1]['data'][date][nodeUniqueIdParamId]['max']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                  dataObj['a' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[1]['data'][date][nodeUniqueIdParamId]['average']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                }
              }

              for (let nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
                if ('timestamp' == nodeUniqueIdParamId) {
                  continue;
                }
                let nodeId = nodeUniqueIdParamId.split('_');
                if (parameters[nodeId[1]].parameter_type != 0) {
                  continue
                }
                else {
                  dataObj['s' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                  dataObj['e' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['endReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                  dataObj['d' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['difference']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                }
              }
              rowAry.push(dataObj);
              dateIndex++;
            }
          }
        }

        /* for single parameter */
        else if (promiseResult.length == 1) {
          /* for all interval */
          if (interval == 'all') {
            rowAry = [];
            rowDataAry = [];
            for (var date in promiseResult[0]['data']) {
              var dataObj = {};
              dataObj['srno'] = dateIndex;
              dataObj['date'] = date;
              postDataObj.map(item => {
                console.log(item, 'postDataObj');
                var timeF = date.split(' ')[1].substring(0, 5);
                var timeT = date.split(' ')[1].substring(0, 5);

                if ((timeF >= item['fTime']) && (timeT <= item['tTime'])) {

                  for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
                    if ('timestamp' == nodeUniqueIdParamId) {
                      continue;
                    }
                    var nodeId = nodeUniqueIdParamId.split('_');
                    dataObj['r' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                    rowAry.push(dataObj);
                    dateIndex++;
                  }
                }
                else {
                  delete dataObj['srno'];
                  delete dataObj['date'];
                }
              })
            }
          }

          /* for cumulative parameter of process data */
          else if (postDataObj[0].isinstantaneous == 0) {
            promiseAry = []
            rowAry = [];
            rowDataAry = [];
            for (var date in promiseResult[0]['data']) {
              var dataObj = {};
              dataObj['srno'] = dateIndex;
              dataObj['date'] = date;
              for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
                if ('timestamp' == nodeUniqueIdParamId) {
                  continue;
                }
                var nodeId = nodeUniqueIdParamId.split('_');
                dataObj['s' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                dataObj['e' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['endReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                dataObj['d' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['difference']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
              }
              rowAry.push(dataObj);
              dateIndex++;
            }

          }

          /* for instantanious parameter of process data */
          else if (postDataObj[0].isinstantaneous == 1) {
            promiseAry = []
            rowAry = [];
            rowDataAry = [];
            let last
            for (var date in promiseResult[0]['data']) {
              var dataObj = {};
              dataObj['srno'] = dateIndex;
              dataObj['date'] = date;

              postDataObj.map(item => {
                console.log(item, 'postDataObj');
                if ((item['interval'] == 'daily') || (item['interval'] == 'monthly') || (item['interval'] == 'weekly') || (item['interval'] == 'yearly')) {
                  for (let nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
                    if ('timestamp' == nodeUniqueIdParamId) {
                      continue;
                    }
                    let nodeId = nodeUniqueIdParamId.split('_');
                    dataObj['mi' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['min']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                    dataObj['ma' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['max']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                    dataObj['a' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['average']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                  }
                  // console.log(dataObj, 'dataObjdataObj');
                  rowAry.push(dataObj);
                }
                else if (((item['interval'] == 'hourly') || (item['interval'] == 'fifteen'))) {
                  if (((date.split(' ')[1]) >= item['fTime']) && (date.split(' ')[3] <= item['tTime'])) {

                    for (let nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
                      if ('timestamp' == nodeUniqueIdParamId) {
                        continue;
                      }
                      let nodeId = nodeUniqueIdParamId.split('_');
                      dataObj['mi' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['min']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                      dataObj['ma' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['max']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                      dataObj['a' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['average']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                    }
                    rowAry.push(dataObj);
                    dateIndex++;
                  }
                  else {
                    delete dataObj['srno'];
                    delete dataObj['date'];
                  }
                }
                else {
                  delete dataObj['srno'];
                  delete dataObj['date'];
                }
              })
              // rowAry.push(dataObj);
              // dateIndex++;
            }
          }
        }





        var pdfTblBody = [], pdfTblCols = [], pdfTblRowsObj = {};
        columnAry.forEach((column, columnIndex) => {
          pdfTblCols.push({ text: column['header'], style: 'clsTblHeader' });
          // console.log(pdfTblCols,'pdfTblCols');
          // if (rowAry != null || rowAry != {} || rowAry != '{}') {
          // console.log(rowAry, 'rowAryrowAry');

          rowAry.forEach((row, rowIndex) => {
            if ('undefined' == typeof pdfTblRowsObj[rowIndex]) {
              pdfTblRowsObj[rowIndex] = [];
            }
            pdfTblRowsObj[rowIndex].push(row[column['columnDef']]);
          });
          // }

          // console.log(pdfTblRowsObj, 'pdfTblRowsObj!!!!!!!!!!');
        });
        pdfTblBody.push(pdfTblCols);
        for (var pdfTblRowIndex in pdfTblRowsObj) {
          // console.log(pdfTblRowIndex,'pdfTblRowIndex----------');
          pdfTblBody.push(pdfTblRowsObj[pdfTblRowIndex]);
        }
        var docDefinition = {
          footer: function (currentPage, pageCount) {
            return {
              margin: [40, 0, 0, 0],
              columns: [{
                fontSize: 8,
                text: [
                  {
                    text: 'Page ' + currentPage.toString() + ' / ' + pageCount,
                  }
                ],
              }]
            };
          },
          content: [
            { text: session['company_name'], style: 'clsHeader' },
            { text: 'Report : ' + postDataObj['reportType'], style: 'clsSubHeader' },
            { text: 'Node Name : ' + node, style: 'clsSubHeader' },
            { text: 'Duration : ' + reportDate, style: 'clsSubHeader' },
            { text: 'Interval : ' + intervalObj[interval], style: 'clsSubHeader' },
            {
              image: chartImg,
              width: 530,
              height: 800,
              fit: [530, 600],
              pageBreak: 'after',
              style: 'clsImage'
            },
            {
              style: 'clsTable',
              table: {
                headerRows: 1,
                body: pdfTblBody
              }
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
              margin: [0, 40, 0, 0]
            },
            clsTable: {
              fontSize: 8
            }
          },
          defaultStyle: {
            alignment: 'justify'
          }
        }
        var doc = printer.createPdfKitDocument(docDefinition);
        var chunks = [];
        doc.on('readable', function () {
          var chunk;
          while ((chunk = doc.read(9007199254740991)) !== null) {
            chunks.push(chunk);
          }
        });

        if (download) {
          doc.on('end', function () {
            var buffer = Buffer.concat(chunks);
            return resolve(buffer);
          });
          doc.end();
        }
        if (!download) {
          var tempFilePath = tempfile('.pdf');
          var wait;
          doc.pipe(wait = fs.createWriteStream(tempFilePath));
          doc.end();
          wait.on('finish', function () {
            return resolve(tempFilePath);
          });
        }
      }).catch(err => {
        return err;
      });
    } catch (err) {
      return reject(0);
    }
  });
}
/* code change by kaveri- end*/
// checked
//10 min pdf
function generateSingleNodeConsumptionReportPDFFile(req, session, download) {
  return new Promise((resolve, reject) => {
    try {
      var postDataObj = req.body.postData;
      postDataObj['reportType'] = req.body['reportType'];
      var promiseAry = [];
      var columnAry = JSON.parse(req.body.columns);
      var node = req.body.node;
      var reportDate = req.body.reportDate;
      var interval = req.body.interval;
      var chartImg = req.body.chartImg;
      promiseAry.push(getPostdataReadings(req, postDataObj));
      Promise.all(promiseAry).then(promiseResult => {
        var dateIndex = 1;
        var rowAry = [];
        if (interval == 'all') {
          for (var date in promiseResult[0]['data']) {
            var dataObj = {};
            dataObj['srno'] = dateIndex;
            dataObj['date'] = date;
            for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
              if ('timestamp' == nodeUniqueIdParamId) {
                continue;
              }
              var nodeId = nodeUniqueIdParamId.split('_');
              dataObj['r' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
            }
            rowAry.push(dataObj);
            dateIndex++;
          }
        } else {
          for (var date in promiseResult[0]['data']) {
            var dataObj = {};
            dataObj['srno'] = dateIndex;
            dataObj['date'] = date;
            for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
              if ('timestamp' == nodeUniqueIdParamId) {
                continue;
              }
              var nodeId = nodeUniqueIdParamId.split('_');
              dataObj['s' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
              dataObj['e' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['endReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
              dataObj['d' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['difference']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
            }
            rowAry.push(dataObj);
            dateIndex++;
          }
        }
        var pdfTblBody = [], pdfTblCols = [], pdfTblRowsObj = {};
        columnAry.forEach((column, columnIndex) => {
          pdfTblCols.push({ text: column['header'], style: 'clsTblHeader' });
          rowAry.forEach((row, rowIndex) => {
            if ('undefined' == typeof pdfTblRowsObj[rowIndex]) {
              pdfTblRowsObj[rowIndex] = [];
            }
            pdfTblRowsObj[rowIndex].push(row[column['columnDef']]);
          });
        });
        pdfTblBody.push(pdfTblCols);
        for (var pdfTblRowIndex in pdfTblRowsObj) {
          pdfTblBody.push(pdfTblRowsObj[pdfTblRowIndex]);
        }
        var docDefinition = {
          footer: function (currentPage, pageCount) {
            return {
              margin: [40, 0, 0, 0],
              columns: [{
                fontSize: 8,
                text: [
                  {
                    text: 'Page ' + currentPage.toString() + ' / ' + pageCount,
                  }
                ],
              }]
            };
          },
          content: [
            { text: session['company_name'], style: 'clsHeader' },
            { text: 'Report : ' + postDataObj['reportType'], style: 'clsSubHeader' },
            { text: 'Node Name : ' + node, style: 'clsSubHeader' },
            { text: 'Duration : ' + reportDate, style: 'clsSubHeader' },
            { text: 'Interval : ' + intervalObj[interval], style: 'clsSubHeader' },
            {
              image: chartImg,
              width: 530,
              height: 800,
              fit: [530, 600],
              pageBreak: 'after',
              style: 'clsImage'
            },
            {
              style: 'clsTable',
              table: {
                headerRows: 1,
                body: pdfTblBody
              }
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
              margin: [0, 40, 0, 0]
            },
            clsTable: {
              fontSize: 8
            }
          },
          defaultStyle: {
            alignment: 'justify'
          }
        }
        var doc = printer.createPdfKitDocument(docDefinition);
        var chunks = [];
        doc.on('readable', function () {
          var chunk;
          while ((chunk = doc.read(9007199254740991)) !== null) {
            chunks.push(chunk);
          }
        });

        if (download) {
          doc.on('end', function () {
            var buffer = Buffer.concat(chunks);
            return resolve(buffer);
          });
          doc.end();
        }
        if (!download) {
          var tempFilePath = tempfile('.pdf');
          var wait;
          doc.pipe(wait = fs.createWriteStream(tempFilePath));
          doc.end();
          wait.on('finish', function () {
            return resolve(tempFilePath);
          });
        }
      }).catch(err => {
        return err;
      });
    } catch (err) {
      return reject(0);
    }
  });
}


function getPostdataReadings(req, postDataObj) {
  req.body = postDataObj;
  return new Promise((resolve, reject) => {
    try {
      var isInstantaneous = parseInt(req.body.isinstantaneous);
      var interval = ('proccessdata' == req.body.interval || 'all' == req.body.interval || 'realtime' == req.body.interval) ? req.body.interval : ((1 === isInstantaneous) ? 'instantaneous' + req.body.interval : 'cummulative' + req.body.interval);
      switch (interval) {

        case 'cummulativetenmin': common.getCummulativeTenMinutesData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'cummulativefifteen': common.getCummulativeFifteenMinutesData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'cummulativehourly': common.getCummulativeHourlyData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'cummulativedaily': common.getCummulativeDailyData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'cummulativeweekly': common.getCummulativeWeeklyData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'cummulativemonthly': common.getCummulativeMonthlyData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'cummulativeyearly': common.getCummulativeYearlyData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'instantaneoustenmin': common.getInstantaneousTenMinutesData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'instantaneousfifteen': common.getInstantaneousFifteenMinutesData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'instantaneoushourly': common.getInstantaneousHourlyData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'instantaneousdaily': common.getInstantaneousDailyData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'instantaneousweekly': common.getInstantaneousWeeklyData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'instantaneousmonthly': common.getInstantaneousMonthlyData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'instantaneousyearly': common.getInstantaneousYearlyData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'all': common.getRawData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;

        case 'realtime': common.getRealtimeData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'proccessdata': common.getProcessedRawData(req, function (error, result) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'default':
          if (error) {
            return reject(error);
          }
          return resolve(data);
      }
    } catch (exception) {
      return reject(exception);
    }
  });
}
// checked
function generateSingleNodeComparisonReportPdfFile(req, session, download) {
  return new Promise((resolve, reject) => {
    try {

      const postDataObj = req.body.postData;
      postDataObj['reportType'] = req.body['reportType'];
      let promiseAry = [];
      var columnAry = JSON.parse(req.body.columns);
      var node = req.body.node;
      var reportDate = req.body.reportDate;
      var interval = req.body.interval;
      var chartImg = req.body.chartImg;

      var reqDataObj = postDataObj[0]//commulative
      var reqDataObj1 = postDataObj[1]//instan

      promiseAry.push(getPostdataReadings(req, reqDataObj));
      promiseAry.push(getPostdataReadings(req, reqDataObj1));


      Promise.all(promiseAry).then(promiseResult => {
        var dateIndex = 1;
        var rowAry = [];
        for (var date in promiseResult[0]['data']) {
          var dataObj = {};
          dataObj['srno'] = dateIndex;
          dataObj['currentperiod'] = date;
          for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
            if ('timestamp' == nodeUniqueIdParamId) {
              continue;
            }
            var nodeId = nodeUniqueIdParamId.split('_');
            dataObj['s' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
            dataObj['e' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['endReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
            dataObj['d' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['difference']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
          }
          rowAry.push(dataObj);
          dateIndex++;
        }
        cdateIndex = 1;
        var rowAry1 = [];
        for (var date in promiseResult[1]['data']) {
          var dataObj = {};
          dataObj['srno'] = cdateIndex;
          dataObj['comparisonperiod'] = date;
          for (var nodeUniqueIdParamId in promiseResult[1]['data'][date]) {
            if ('timestamp' == nodeUniqueIdParamId) {
              continue;
            }
            var nodeId = nodeUniqueIdParamId.split('_');
            dataObj['cs' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[1]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
            dataObj['ce' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[1]['data'][date][nodeUniqueIdParamId]['endReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
            dataObj['cd' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[1]['data'][date][nodeUniqueIdParamId]['difference']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
          }
          rowAry1.push(dataObj);
          cdateIndex++;
        }

        var test = rowAry[0];


        var mergeAry = rowAry.map((item, i) => Object.assign({}, item, rowAry1[i]));

        var pdfTblBody = [], pdfTblCols = [], pdfTblRowsObj = {};

        columnAry.forEach((column, columnIndex) => {
          pdfTblCols.push({ text: column['header'], style: 'clsTblHeader' });
          mergeAry.forEach((row, rowIndex) => {
            if ('undefined' == typeof pdfTblRowsObj[rowIndex]) {
              pdfTblRowsObj[rowIndex] = [];
            }
            pdfTblRowsObj[rowIndex].push(row[column['columnDef']]);
          });
        });
        pdfTblBody.push(pdfTblCols);
        for (var pdfTblRowIndex in pdfTblRowsObj) {
          pdfTblBody.push(pdfTblRowsObj[pdfTblRowIndex]);
        }
        var docDefinition = {
          footer: function (currentPage, pageCount) {
            return {
              margin: [40, 0, 0, 0],
              columns: [{
                fontSize: 8,
                text: [
                  {
                    text: 'Page ' + currentPage.toString() + ' / ' + pageCount,
                  }
                ],
              }]
            };
          },
          content: [
            { text: session['company_name'], style: 'clsHeader' },
            { text: 'Report : ' + postDataObj['reportType'], style: 'clsSubHeader' },
            { text: 'Node Name : ' + node, style: 'clsSubHeader' },
            { text: 'Duration : ' + reportDate, style: 'clsSubHeader' },
            { text: 'Interval : ' + intervalObj[interval], style: 'clsSubHeader' },
            {
              image: chartImg,
              width: 530,
              height: 800,
              fit: [530, 600],
              pageBreak: 'after',
              style: 'clsImage'
            },
            {
              style: 'clsTable',
              table: {
                headerRows: 1,
                body: pdfTblBody
              }
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
              margin: [0, 40, 0, 0]
            },
            clsTable: {
              fontSize: 8
            }
          },
          defaultStyle: {
            alignment: 'justify'
          }
        }
        var doc = printer.createPdfKitDocument(docDefinition);
        var chunks = [];
        doc.on('readable', function () {
          var chunk;
          while ((chunk = doc.read(9007199254740991)) !== null) {
            chunks.push(chunk);
          }
        });

        if (download) {
          doc.on('end', function () {
            var buffer = Buffer.concat(chunks);
            return resolve(buffer);
          });
          doc.end();
        }
        if (!download) {
          var tempFilePath = tempfile('.pdf');
          var wait;
          doc.pipe(wait = fs.createWriteStream(tempFilePath));
          doc.end();
          wait.on('finish', function () {
            return resolve(tempFilePath);
          });
        }
      }).catch(err => {
        return err;
      });
    } catch (err) {
      return reject(0);
    }
  });
}

// function generateLocationWiseCsvReportFile(req, session, download) {
//   return new Promise((resolve, reject) => {
//     try {
//       var promiseAry = [];
//       var readingDataObj = JSON.parse(req.body['requestActionData']);
//       var reportType = req.body.reportType;
//       var parameter = req.body.parameter;
//       var reportDate = req.body.reportDate;
//       var interval = req.body.interval;
//       var postDataObj = req.body.postData;
//       var company_name = session['company_name'];
//       var type = req.body['reportType'];
//       delete postDataObj['node'];
//       delete postDataObj['nodeGroupObj'];
//       delete postDataObj['nodeGroupIndexingObj'];
//       promiseAry.push(getPostdataReadings(req, postDataObj));

//       Promise.all(promiseAry).then(promiseResult => {

//         var dateIndex = 1;
//         var rowAry = [];
//         var rowDataAry = [];
//         let parentHeader = [];
//         let subHeader = [];
//         let columnHeader = [];
//         for (var nodeGroupId in readingDataObj) {
//           columnHeader.push(readingDataObj[nodeGroupId]['nodeGroup'], readingDataObj[nodeGroupId]['nodeGroupReading']);
//         };
//         readingDataObj[nodeGroupId]['nodeGroupTblParentCols'].forEach((pColumn, pColumnIndex) => {
//           if (pColumnIndex < 2) {
//             parentHeader.push(null);
//           }
//           if (pColumnIndex >= 2) {
//             parentHeader.push('\"' + pColumn['header'] + '\"');
//             parentHeader.push(null, null);
//           }
//         });
//         readingDataObj[nodeGroupId]['nodeGroupTblCols'].forEach(column => {
//           subHeader.push('\"' + column['header'] + '\"');
//         });
//         rowAry.push(['\"' + company_name + '\"'].join())
//         rowAry.push(['"Report"', '\"' + reportType + '\"'].join())
//         rowAry.push(['"Parameter Name"', '\"' + parameter + '\"'].join())
//         rowAry.push(['"Duration"', '\"' + reportDate + '\"'].join())
//         rowAry.push(['"Interval"', '\"' + intervalObj[interval] + '\"'].join())
//         rowAry.push(parentHeader.join())
//         rowAry.push(subHeader.join())
//         if (interval == 'all') {
//           for (var date in promiseResult[0]['data']) {
//             var dataObj = {};
//             dataObj['srno'] = dateIndex;
//             dataObj['date'] = date;
//             for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
//               if ('timestamp' == nodeUniqueIdParamId) {
//                 continue;
//               }
//               var nodeId = nodeUniqueIdParamId.split('_');
//               dataObj['r' + nodeId[0]] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';


//             }
//             rowDataAry = Object.values(dataObj);
//             rowAry.push(rowDataAry.join());
//             dateIndex++;
//           }
//         } else {
//           for (var date in promiseResult[0]['data']) {
//             var dataObj = {};
//             dataObj['srno'] = dateIndex;
//             dataObj['date'] = date;
//             for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
//               if ('timestamp' == nodeUniqueIdParamId) {
//                 continue;
//               }
//               var nodeId = nodeUniqueIdParamId.split('_');

//               if (req.body.isinstantaneous == 0) {
//                 dataObj['s' + nodeId[0]] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
//                 dataObj['e' + nodeId[0]] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['endReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
//                 dataObj['d' + nodeId[0]] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['difference']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
//               }
//               if (req.body.isinstantaneous == 1) {
//                 dataObj['mi' + nodeId[0]] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['min']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
//                 dataObj['ma' + nodeId[0]] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['max']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
//                 dataObj['a' + nodeId[0]] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['average']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
//               }
//             }
//             rowDataAry = Object.values(dataObj);
//             rowAry.push(rowDataAry.join());
//             dateIndex++;
//           }
//         }

//         if (download) {
//           var tempFilePath = tempfile('.csv');
//           fs.writeFile(tempFilePath, rowAry.join(os.EOL), function (err) {
//             if (err) {
//               return reject(err)
//             }
//             const buffer = fs.readFileSync(tempFilePath);
//             const buf2 = Buffer.from(buffer);
//             setTimeout(() => {
//               fs.unlink(tempFilePath, function () { });
//             }, 5000);
//             return resolve(buf2);
//           });
//         }
//         if (!download) {
//           var tempFilePath = tempfile('.csv');
//           fs.writeFile(tempFilePath, rowAry.join(os.EOL), function (err) {
//             if (err) {
//               return reject(err)
//             }
//             return resolve(tempFilePath);
//           });
//         }
//       }).catch(err => {
//         console.log(' generateLocationWiseExcelReportFile excel err', err);
//         return err;
//       });
//     } catch (err) {
//       console.log(' generateLocationWiseExcelReportFile in catch err here', err);
//       return reject(0);
//     }
//   });
// }

/*code start by Soham */
function generateLocationWiseCsvReportFile(req, session, download) {
  return new Promise((resolve, reject) => {
    try {
      var promiseAry = [];
      // var columnAry = JSON.parse(req.body.columns);
      var readingDataObj = JSON.parse(req.body['requestActionData']);
      var reportType = req.body.reportType;
      var parameter = req.body.parameter;
      var reportDate = req.body.reportDate;
      var interval = req.body.interval;
      var postDataObj = req.body.postData;
      var company_name = session['company_name'];
      var reqDataObj = postDataObj[0]//commulative
      var reqDataObj1 = postDataObj[1]//instan
      var parameters = req.session.passport.user.parameters;
      var type = req.body['reportType'];
      delete postDataObj['node'];
      delete postDataObj['nodeGroupObj'];
      delete postDataObj['nodeGroupIndexingObj'];


      // // console.log(' Parameters list ', parameters)
      // promiseAry.push(getPostdataReadings(req, postDataObj));

      // // console.log(' Reading Data Obj', readingDataObj)


      if (postDataObj.length == 2) {
        // console.log("iff condition 2948");
        // console.log(postDataObj, "postDataObjpostDataObjpostDataObj 3312..!!!!");
        reqDataObj.parameterId = lodash.union(postDataObj[0].parameterId, lodash.get(postDataObj[1], ['parameterId']));
        reqDataObj1.parameterId = lodash.union(postDataObj[0].parameterId, lodash.get(postDataObj[1], ['parameterId']));

        promiseAry.push(getPostdataReadings(req, reqDataObj));
        promiseAry.push(getPostdataReadings(req, reqDataObj1));
      }
      else if (postDataObj.length == 1) {
        promiseAry.push(getPostdataReadings(req, postDataObj[0]));
        // promiseAry.push(getPostdataReadings(req, reqDataObj));
        // promiseAry.push(getPostdataReadings(req, reqDataObj1));

      }
      else {
        return;
      }

      Promise.all(promiseAry).then(promiseResult => {

        var dateIndex = 1;
        var rowAry = [];
        var rowDataAry = [];
        let parentHeader = [];
        let parentHeader1 = [];
        let childHeader = [];
        let subHeader = [];

        let columnHeader = [];
        let count = 0;
        var arrayTest = []
        var parentHeaderArray = [];
        for (var nodeGroupId in readingDataObj) {
          console.log("=====================================================================================");
          count = count + 1;
          arrayTest = [...arrayTest, ...readingDataObj[nodeGroupId]['nodeGroupTblChildCols']];
          parentHeaderArray = [...parentHeaderArray, ...readingDataObj[nodeGroupId]['nodeGroupTblParentCols']];
          // console.log(arrayTest, "pColumn['header']pColumn['header'] 3241...!!!");

          columnHeader.push(readingDataObj[nodeGroupId]['nodeGroup'], readingDataObj[nodeGroupId]['nodeGroupReading']);
        };
        if (count == 2) {
          readingDataObj[nodeGroupId]['nodeGroupTblParentCols'] = parentHeaderArray;
          readingDataObj[nodeGroupId]['nodeGroupTblChildCols'] = arrayTest;
        }

        readingDataObj[nodeGroupId]['nodeGroupTblParentCols'].forEach((pColumn, pColumnIndex) => {
          // // console.log(pColumnIndex,"pColumnIndexpColumnIndexpColumnIndexpColumnIndex 2983..!!");
          if (pColumnIndex < 2) {
            parentHeader.push(null);
          }
          if (pColumnIndex >= 2) {
            parentHeader.push('\"' + pColumn['header'] + '\"');
            interval == 'all' ? null : parentHeader.push(null);
          }
        });




        if (postDataObj.length == 2) {

          if (count == 2) {
            // console.log(count, "sffsdfsdfsdfdsfsdfsdfsdfsfd");
            // console.log(arrayTest, "sffsdfsdfsdfdsfsdfsdfsdfsfd");

          }



          // console.log(readingDataObj[nodeGroupId]['nodeGroupTblChildCols'], "dfjgasdfaydg 2994..!!!");
          var arrP0 = [];
          var arrP1 = [];
          var arrC0 = [];
          var arrC1 = [];
          readingDataObj[nodeGroupId]['nodeGroupTblChildCols'].forEach((pColumn, pColumnIndex) => {

            for (const key in parameters) {
              console.log("for loop parameters...!!!!!");
              // // console.log(pColumn['header'],"pColumn['header']pColumn['header'] 3002..!!");
              // // console.log(parameters[key].parameter_name,"parameters[key].parameter_name 3005..!!!");
              if (pColumn['header'] == parameters[key].parameter_name) {
                // // console.log(pColumn['header'], "pColumn['header']pColumn['header']pColumn['header'] 3007");
                // // console.log(parameters[key].parameter_type, "parameter_type 3261");
                if (parameters[key].parameter_type == 0) {
                  arrP0.push({ header: pColumn['header'] });
                  arrC0.push({ header: "Start Reading" });
                  arrC0.push({ header: "End Reading" });
                  arrC0.push({ header: "Difference" });
                }
                else {
                  arrP1.push({ header: pColumn['header'] });
                  arrC1.push({ header: "Min" });
                  arrC1.push({ header: "Max" });
                  arrC1.push({ header: "Average" });
                }

              }
            }
          });


          readingDataObj[nodeGroupId]['nodeGroupTblChildCols'] = [{ header: '' },
          { header: '' }, ...arrP1, ...arrP0]

          readingDataObj[nodeGroupId]['nodeGroupTblCols'] = [{ header: 'Sr. No' },
          { header: 'Date' }, ...arrC1, ...arrC0]
        }

        //   for (var nodeGroupId in readingDataObj) {
        //     console.log("=====================================================================================");
        //     count = count +1;
        //     console.log(count,"counttt test####");

        //     arrayTest = [... arrayTest, ... readingDataObj[nodeGroupId]['nodeGroupTblChildCols']];
        //     parentHeaderArray = [... parentHeaderArray, ... readingDataObj[nodeGroupId]['nodeGroupTblParentCols']];
        //     console.log(arrayTest,"pColumn['header']pColumn['header'] 3111...!!!");

        //     columnHeader.push(readingDataObj[nodeGroupId]['nodeGroup'], readingDataObj[nodeGroupId]['nodeGroupReading']);
        //   };

        //   readingDataObj[nodeGroupId]['nodeGroupTblParentCols'].forEach((pColumn, pColumnIndex) => {
        //     // // console.log(pColumnIndex,"pColumnIndexpColumnIndexpColumnIndexpColumnIndex 2983..!!");
        //     if (pColumnIndex < 2) {
        //       parentHeader.push(null);
        //     }
        //     if (pColumnIndex >= 2) {
        //       parentHeader.push('\"' + pColumn['header'] + '\"');
        //       interval == 'all' ? null : parentHeader.push(null);
        //     }
        //   });
        //   console.log(readingDataObj[nodeGroupId]['nodeGroupTblParentCols'],"pColumn['header']pColumn['header'] 324322221...!!!");




        //   if (count == 1) {
        //     // readingDataObj[nodeGroupId]['nodeGroupTblParentCols'] = parentHeaderArray;
        //     readingDataObj[nodeGroupId]['nodeGroupTblChildCols'] = arrayTest;
        //   }

        //   if (postDataObj.length == 1) {

        //     if (count == 1) {
        //       console.log(count, "sffsdfsdfsdfdsfsdfsdfsdfsfd");
        //       console.log(arrayTest, "sffsdfsdfsdfdsfsdfsdfsdfsfd");

        //     }





        //     // console.log(readingDataObj[nodeGroupId]['nodeGroupTblChildCols'], "dfjgasdfaydg 2994..!!!");
        //     var arrP0 = [];
        //     var arrP1 = [];
        //     var arrC0 = [];
        //     var arrC1 = [];
        //     readingDataObj[nodeGroupId]['nodeGroupTblChildCols'].forEach((pColumn, pColumnIndex) => {
        //     // // console.log(readingDataObj[nodeGroupId]['nodeGroupTblChildCols'], "dfjgasdfaydg 3000..!!!");

        //       for (const key in parameters) {
        //         // // // console.log("for loop parameters...!!!!!");
        //         // // console.log(pColumn['header'],"pColumn['header']pColumn['header'] 3002..!!");
        //         // // console.log(parameters[key].parameter_name,"parameters[key].parameter_name 3005..!!!");
        //         if (pColumn['header'] == parameters[key].parameter_name) {
        //           // // console.log(pColumn['header'], "pColumn['header']pColumn['header']pColumn['header'] 3007");
        //           // // console.log(parameters[key].parameter_type, "parameter_type 3261");
        //           if (parameters[key].parameter_type == 0) {
        //             arrP0.push({ header: pColumn['header'] });
        //             arrC0.push({ header: "Start Reading" });
        //             arrC0.push({ header: "End Reading" });
        //             arrC0.push({ header: "Difference" });
        //           }
        //           else {
        //             arrP1.push({ header: pColumn['header'] });
        //             arrC1.push({ header: "Min" });
        //             arrC1.push({ header: "Max" });
        //             arrC1.push({ header: "Average" });
        //           }

        //         }
        //       }
        //     });
        //     // // console.log(arrC1, "dfjsdjfghhjfgjhdgsjdsfjkgsdjfghsdg", arrC0);
        //     // // console.log(readingDataObj[nodeGroupId]['nodeGroupTblChildCols'], "readingDataObj[nodeGroupId]['nodeGroupTblChildCols'] 3022");


        //     readingDataObj[nodeGroupId]['nodeGroupTblChildCols'] = [{ header: '' },
        //     { header: '' }, ...arrP1, ...arrP0]

        //     // readingDataObj[nodeGroupId]['nodeGroupTblChildCols'] = [{ header: '' },
        //     // { header: '' }, ...arrP1, ...arrP0]

        //     readingDataObj[nodeGroupId]['nodeGroupTblCols'] = [{ header: 'Sr. No' },
        //     { header: 'Date' }, ...arrC1, ...arrC0]
        // }



        readingDataObj[nodeGroupId]['nodeGroupTblChildCols'].forEach((pColumn, pColumnIndex) => {
          // // console.log("readingDataObj[nodeGroupId]['nodeGroupTblChildCols'] 3040", readingDataObj[nodeGroupId]['nodeGroupTblChildCols'])
          if (pColumnIndex < 2) {
            childHeader.push(null);
            // childHeader++;

          }
          if (pColumnIndex >= 2) {
            // // console.log(pColumn['header'], "pColumn['header']pColumn['header'] 3241...!!!");
            childHeader.push('\"' + pColumn['header'] + '\"');
            // // console.log(childHeader, "childHeaderchildHeader 3259..11");
            interval == 'all' ? null : childHeader.push(null, null);
          }
        });





        if (postDataObj.length == 2) {

          try {
            var array1 = [];

            for (let date in promiseResult[0]['data']) {
              for (let nodeUniqueIdParamId in promiseResult[1]['data'][date]) {

                if ('timestamp' == nodeUniqueIdParamId) {
                  continue;
                }
                let nodeId = nodeUniqueIdParamId.split('_');

                if (parameters[nodeId[1]].parameter_type != 1) {
                  continue
                }
                else {
                  // // console.log(nodeId, "{nodeIdnodeIdnodeIdnodeIdnodeIdnodeIdnodeId}")
                  if (parentHeader1.length == 0) {
                    parentHeader1.push(null)
                    parentHeader1.push(null)
                    array1.push(nodeId);
                    if (reqDataObj.nodeName != undefined) {
                      let index = reqDataObj.nodeId.findIndex(item => item == nodeId[0])
                      parentHeader1.push(reqDataObj.nodeName[index])
                    }
                    else {
                      for (const key in reqDataObj.nodeGroupObj) {
                        for (const item in reqDataObj.nodeGroupObj[key]) {
                          if (item != 'name') {
                            for (const obj in reqDataObj.nodeGroupObj[key][item]) {
                              if (reqDataObj.nodeGroupObj[key][item][obj].nodeUniqueId == nodeId[0]) {
                                parentHeader1.push(reqDataObj.nodeGroupObj[key][item][obj].name)
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                  else {
                    if (array1.length < (parameter.length * reqDataObj.nodeId.length)) {

                      array1.push(nodeId);
                      parentHeader1.push(null)
                      parentHeader1.push(null)

                      if (reqDataObj.nodeName != undefined) {
                        let index = reqDataObj.nodeId.findIndex(item => item == nodeId[0])
                        parentHeader1.push(reqDataObj.nodeName[index])
                      }
                      else {
                        for (const key in reqDataObj.nodeGroupObj) {
                          for (const item in reqDataObj.nodeGroupObj[key]) {
                            if (item != 'name') {
                              for (const obj in reqDataObj.nodeGroupObj[key][item]) {
                                if (reqDataObj.nodeGroupObj[key][item][obj].nodeUniqueId == nodeId[0]) {
                                  parentHeader1.push(reqDataObj.nodeGroupObj[key][item][obj].name)
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }

              for (let nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
                if ('timestamp' == nodeUniqueIdParamId) {
                  continue;
                }
                let nodeId = nodeUniqueIdParamId.split('_');
                if (parameters[nodeId[1]].parameter_type != 0) {
                  continue
                }
                else {
                  // // console.log(nodeId, "{nodeIdnodeIdnodeIdnodeIdnodeIdnodeIdnodeId}")
                  if (parentHeader1.length == 0) {
                    parentHeader1.push(null)
                    parentHeader1.push(null)
                    array1.push(nodeId);
                    // array2.push(nodeId);
                    if (reqDataObj.nodeName != undefined) {
                      let index = reqDataObj.nodeId.findIndex(item => item == nodeId[0])
                      // console.log(reqDataObj.nodeName,"reqDataObj.nodeNamereqDataObj.nodeName 3199..!!!");
                      parentHeader1.push(reqDataObj.nodeName[index])
                    }
                    else {
                      for (const key in reqDataObj.nodeGroupObj) {
                        for (const item in reqDataObj.nodeGroupObj[key]) {
                          if (item != 'name') {
                            for (const obj in reqDataObj.nodeGroupObj[key][item]) {
                              if (reqDataObj.nodeGroupObj[key][item][obj].nodeUniqueId == nodeId[0]) {
                                parentHeader1.push(reqDataObj.nodeGroupObj[key][item][obj].name)
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                  else {
                    if (array1.length < (parameter.length * reqDataObj.nodeId.length)) {
                      array1.push(nodeId);
                      parentHeader1.push(null)
                      parentHeader1.push(null)
                      if (reqDataObj.nodeName != undefined) {
                        let index = reqDataObj.nodeId.findIndex(item => item == nodeId[0])
                        parentHeader1.push(reqDataObj.nodeName[index])
                      }
                      else {
                        for (const key in reqDataObj.nodeGroupObj) {
                          for (const item in reqDataObj.nodeGroupObj[key]) {
                            if (item != 'name') {
                              for (const obj in reqDataObj.nodeGroupObj[key][item]) {
                                if (reqDataObj.nodeGroupObj[key][item][obj].nodeUniqueId == nodeId[0]) {
                                  parentHeader1.push(reqDataObj.nodeGroupObj[key][item][obj].name)
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }

            // console.log(array1, "arrayarrayarrayarrayarrayarray");
            // // console.log(array2,"array2array2array2array2array2array2array2array2 3244");

          } catch (error) {
            // console.log(error,"errorerrorerrorerrorerrorerror 3232");
          }

        }
        else if (postDataObj.length == 1) {
          parentHeader1 = [...parentHeader];
        }

        // // // console.log(parentHeader, "sdfsdfsdfsdfsdfsdfsdfsdf");
        // // // console.log(parentHeader1, "parentHeader1parentHeader1parentHeader1parentHeader1 3271..!!!!");




        readingDataObj[nodeGroupId]['nodeGroupTblCols'].forEach(column => {
          // // console.log(column, "columncolumncolumncolumn 3277");
          subHeader.push('\"' + column['header'] + '\"');
          // console.log(subHeader, column['header'],"headerer", "subHeadersubHeadersubHeadersubHeader 3268 Test@@@..!!!");

        });
        rowAry.push(['\"' + company_name + '\"'].join())
        rowAry.push(['"Report"', '\"' + reportType + '\"'].join())
        rowAry.push(['"Parameter Name"', '\"' + parameter + '\"'].join())
        rowAry.push(['"Duration"', '\"' + reportDate + '\"'].join())
        rowAry.push(['"Interval"', '\"' + intervalObj[interval] + '\"'].join())
        // rowAry.push(parentHeader1.join())
        // rowAry.push(childHeader.join())
        // rowAry.push(subHeader.join())
        // subHeader++;
        // childHeader++;

        var nodeArray = [];
        if (reqDataObj.nodeName == undefined) {
          for (const key in reqDataObj.nodeGroupObj) {
            for (const item in reqDataObj.nodeGroupObj[key].nodeObj) {
              nodeArray.push(reqDataObj.nodeGroupObj[key].nodeObj[item])
            }
          }
        }

        if (interval == 'all') {
          for (var date in promiseResult[0]['data']) {
            var dataObj = {};
            dataObj['srno'] = '\"' + dateIndex + '\"';
            dataObj['date'] = '\"' + date + '\"';
            for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
              if ('timestamp' == nodeUniqueIdParamId) {
                console.log(nodeUniqueIdParamId, "nodeUniqueIdParamIdnodeUniqueIdParamId --- 3364");
                continue;
              }
              var nodeId = nodeUniqueIdParamId.split('_');
              dataObj['r' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['unitReading'], session.number_format, session.parameters[nodeId[1]].symbol) + '\"'

              // dataObj['r' + nodeUniqueIdParamId] = promiseResult[0]['data'][date][nodeUniqueIdParamId]['unitReading']
            }
            rowDataAry = Object.values(dataObj);
            rowAry.push(rowDataAry.join());
            dateIndex++;
          }
        }
        else {

          if (postDataObj.length == 1) {

            // console.log(promiseResult,"promiseResultpromiseResult 3398");
            // console.log(JSON.stringify(promiseResult[0]['data']),"promiseResult[0]['data']promiseResult[0]['data'] 3397");

            var nodeNameArray = [];
            var paramNameArray = [];
            var headingNameArray = ['Sr. No', 'Date'];
            var counter = 0;

            for (var date in promiseResult[0]['data']) {
              var dataObj = {};
              dataObj['srno'] = '\"' + dateIndex + '\"';
              dataObj['date'] = '\"' + date + '\"';


              console.log(date, "datedatedate");
              // console.log(date.split(' ')[0] + ' ' + date.split(' ')[1] + ' ' + '-' + postDataObj['tTime'], '))))');


              counter = counter + 1;
              for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
                if ('timestamp' == nodeUniqueIdParamId) {
                  continue;
                }
                var nodeId = nodeUniqueIdParamId.split('_');

                if (counter == 1) {
                  nodeNameArray.push(null);
                  nodeNameArray.push(null);

                  if (reqDataObj.nodeName == undefined) {
                    nodeNameArray.push(nodeArray.find(item => item.nodeUniqueId == nodeId[0]).name);
                  } else {
                    let index = reqDataObj.nodeId.findIndex(item => item == nodeId[0])
                    nodeNameArray.push(reqDataObj.nodeName[index]);
                  }
                }

                // console.log(req.body,"req.bodyreq.bodyreq.body 3407..!!");
                if (req.body.isinstantaneous == 0) {

                  if (counter == 1) {
                    paramNameArray.push(null);
                    paramNameArray.push(null);
                    for (const key in parameters) {
                      if (nodeId[1] == key) {
                        paramNameArray.push(parameters[key].parameter_name);
                      }
                    }

                    headingNameArray.push("Start Reading");
                    headingNameArray.push("End Reading");
                    headingNameArray.push("Difference");

                  }

                  console.log(nodeUniqueIdParamId, "nodeUniqueIdParamId@@@@ 3411");
                  console.log(promiseResult[0]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'], "readingggggggggggg@@@@ 3411");

                  dataObj['s' + nodeId[0] + nodeId[1]] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'], session.number_format, session.parameters[nodeId[1]].symbol) + '\"';
                  dataObj['e' + nodeId[0] + nodeId[1]] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['endReading']['unitReading'], session.number_format, session.parameters[nodeId[1]].symbol) + '\"';
                  dataObj['d' + nodeId[0] + nodeId[1]] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['difference']['unitReading'], session.number_format, session.parameters[nodeId[1]].symbol) + '\"';
                }
                if (req.body.isinstantaneous == 1) {
                  postDataObj.map(item => {
                    console.log(item['interval'], 'postDataObj');

                    if ((item['interval'] == 'daily') || (item['interval'] == 'monthly') || (item['interval'] == 'weekly') || (item['interval'] == 'yearly')) {
                      if (counter == 1) {
                        paramNameArray.push(null);
                        paramNameArray.push(null);
                        for (const key in parameters) {
                          if (nodeId[1] == key) {
                            paramNameArray.push(parameters[key].parameter_name);
                          }
                        }
                        headingNameArray.push("Min");
                        headingNameArray.push("Max");
                        headingNameArray.push("Average");

                      }
                      dataObj['mi' + nodeId[0] + nodeId[1]] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['min']['unitReading'], session.number_format, session.parameters[nodeId[1]].symbol) + '\"';
                      dataObj['ma' + nodeId[0] + nodeId[1]] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['max']['unitReading'], session.number_format, session.parameters[nodeId[1]].symbol) + '\"';
                      dataObj['a' + nodeId[0] + nodeId[1]] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['average']['unitReading'], session.number_format, session.parameters[nodeId[1]].symbol) + '\"';
                    }
                    else if ((item['interval'] == 'fifteen') || (item['interval'] == 'hourly')) {
                      if (((date.split(' ')[1]) >= item['fTime']) && (date.split(' ')[3] <= item['tTime'])) {
                        if (counter == 1) {
                          paramNameArray.push(null);
                          paramNameArray.push(null);
                          for (const key in parameters) {
                            if (nodeId[1] == key) {
                              paramNameArray.push(parameters[key].parameter_name);
                            }
                          }

                          headingNameArray.push("Min");
                          headingNameArray.push("Max");
                          headingNameArray.push("Average");

                        }
                        dataObj['mi' + nodeId[0] + nodeId[1]] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['min']['unitReading'], session.number_format, session.parameters[nodeId[1]].symbol) + '\"';
                        dataObj['ma' + nodeId[0] + nodeId[1]] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['max']['unitReading'], session.number_format, session.parameters[nodeId[1]].symbol) + '\"';
                        dataObj['a' + nodeId[0] + nodeId[1]] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['average']['unitReading'], session.number_format, session.parameters[nodeId[1]].symbol) + '\"';
                      }
                      else {
                        delete dataObj['srno'];
                        delete dataObj['date'];
                      }
                    }
                    else {
                      delete dataObj['srno'];
                      delete dataObj['date'];
                    }
                  })
                }


              }

              rowDataAry = Object.values(dataObj);
              if (counter == 1) {
                rowAry.push(nodeNameArray.join());
                rowAry.push(paramNameArray.join());
                rowAry.push(headingNameArray.join());
              }
              rowAry.push(rowDataAry.join());
              // subHeader++; 
              dateIndex++;
            }

          }
          else if (postDataObj.length == 2) {
            /* For all interval */
            var nodeNameArray = [];
            var paramNameArray = [];
            var headingNameArray = ['Sr. No', 'Date'];
            var counter = 0;
            for (let date in promiseResult[0]['data']) {
              let dataObj = {};
              dataObj['srno'] = dateIndex;
              dataObj['date'] = date;
              counter = counter + 1;



              for (let nodeUniqueIdParamId in promiseResult[1]['data'][date]) {
                if ('timestamp' == nodeUniqueIdParamId) {
                  continue;
                }
                let nodeId = nodeUniqueIdParamId.split('_');



                if (parameters[nodeId[1]].parameter_type != 1) {
                  continue
                }
                else {

                  if (counter == 1) {
                    nodeNameArray.push(null);
                    nodeNameArray.push(null);
                    if (reqDataObj.nodeName == undefined) {
                      nodeNameArray.push(nodeArray.find(item => item.nodeUniqueId == nodeId[0]).name);
                    } else {
                      let index = reqDataObj.nodeId.findIndex(item => item == nodeId[0])
                      nodeNameArray.push(reqDataObj.nodeName[index]);
                    }
                  }

                  if (counter == 1) {
                    paramNameArray.push(null);
                    paramNameArray.push(null);
                    for (const key in parameters) {
                      if (nodeId[1] == key) {
                        paramNameArray.push(parameters[key].parameter_name);

                      }
                    }

                    headingNameArray.push("Min");
                    headingNameArray.push("Max");
                    headingNameArray.push("Average");

                  }

                  dataObj['mi' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[1]['data'][date][nodeUniqueIdParamId]['min']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
                  dataObj['ma' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[1]['data'][date][nodeUniqueIdParamId]['max']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
                  dataObj['a' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[1]['data'][date][nodeUniqueIdParamId]['average']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
                  // dataObj['mi' + nodeUniqueIdParamId] = promiseResult[1]['data'][date][nodeUniqueIdParamId]['min']['unitReading'];
                  // dataObj['ma' + nodeUniqueIdParamId] = promiseResult[1]['data'][date][nodeUniqueIdParamId]['max']['unitReading'];
                  // dataObj['a' + nodeUniqueIdParamId] = promiseResult[1]['data'][date][nodeUniqueIdParamId]['average']['unitReading'];
                }
              }

              for (let nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
                // // // console.log(nodeUniqueIdParamId,"nodeUniqueIdParamIdnodeUniqueIdParamIdnodeUniqueIdParamId 2893..!!");
                if ('timestamp' == nodeUniqueIdParamId) {
                  continue;
                }
                let nodeId = nodeUniqueIdParamId.split('_');



                if (parameters[nodeId[1]].parameter_type != 0) {
                  continue
                }
                else {
                  if (counter == 1) {
                    nodeNameArray.push(null);
                    nodeNameArray.push(null);
                    if (reqDataObj.nodeName == undefined) {
                      nodeNameArray.push(nodeArray.find(item => item.nodeUniqueId == nodeId[0]).name);
                    } else {
                      let index = reqDataObj.nodeId.findIndex(item => item == nodeId[0])
                      nodeNameArray.push(reqDataObj.nodeName[index]);
                    }
                  }

                  if (counter == 1) {
                    paramNameArray.push(null);
                    paramNameArray.push(null);
                    for (const key in parameters) {
                      if (nodeId[1] == key) {
                        paramNameArray.push(parameters[key].parameter_name);
                      }
                    }

                    headingNameArray.push("Start Reading");
                    headingNameArray.push("End Reading");
                    headingNameArray.push("Difference");

                  }
                  dataObj['s' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
                  dataObj['e' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['endReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
                  dataObj['d' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['difference']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
                  // dataObj['s' + nodeUniqueIdParamId] = promiseResult[0]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'];
                  // dataObj['e' + nodeUniqueIdParamId] = promiseResult[0]['data'][date][nodeUniqueIdParamId]['endReading']['unitReading'];
                  // dataObj['d' + nodeUniqueIdParamId] = promiseResult[0]['data'][date][nodeUniqueIdParamId]['difference']['unitReading'];
                }
              }
              rowDataAry = Object.values(dataObj);
              if (counter == 1) {
                rowAry.push(nodeNameArray.join());
                rowAry.push(paramNameArray.join());
                rowAry.push(headingNameArray.join());
              }
              rowAry.push(rowDataAry.join());
              // subHeader++;  
              // childHeader++;
              dateIndex++;

            }

          }


        }



        if (download) {
          var tempFilePath = tempfile('.csv');
          fs.writeFile(tempFilePath, rowAry.join(os.EOL), function (err) {
            if (err) {
              return reject(err)
            }
            const buffer = fs.readFileSync(tempFilePath);
            const buf2 = Buffer.from(buffer);
            setTimeout(() => {
              fs.unlink(tempFilePath, function () { });
            }, 5000);
            return resolve(buf2);
          });
        }
        if (!download) {
          var tempFilePath = tempfile('.csv');
          fs.writeFile(tempFilePath, rowAry.join(os.EOL), function (err) {
            if (err) {
              return reject(err)
            }
            return resolve(tempFilePath);
          });
        }
      }).catch(err => {
        // // console.log(' generateLocationWiseExcelReportFile excel err', err);
        return err;
      });
    } catch (err) {
      // // console.log(' generateLocationWiseExcelReportFile in catch err here', err);
      return reject(0);
    }
  });
}
/*code end by Soham */

function generateSingleNodeReportCsvFile(req, session, download) {
  return new Promise((resolve, reject) => {
    try {
      const postDataObj = req.body.postData;
      postDataObj[0]['reportType'] = (req.body.interval == 'tenmin') ? 'Ten Min Report' : req.body['reportType'];
      let promiseAry = [];
      var columnAry = JSON.parse(req.body.columns);
      var node = req.body.node;
      var reportDate = req.body.reportDate;
      var interval = req.body.interval;
      var company_name = session['company_name'];
      var reqDataObj = postDataObj[0]//commulative
      var reqDataObj1 = postDataObj[1]//instan
      var parameters = req.session.passport.user.parameters;

      if (postDataObj.length == 2) {
        reqDataObj.parameterId = lodash.union(postDataObj[0].parameterId, lodash.get(postDataObj[1], ['parameterId']));
        reqDataObj1.parameterId = lodash.union(postDataObj[0].parameterId, lodash.get(postDataObj[1], ['parameterId']));

        promiseAry.push(getPostdataReadings(req, reqDataObj));
        promiseAry.push(getPostdataReadings(req, reqDataObj1));
      }
      else if (postDataObj.length == 1) {
        promiseAry.push(getPostdataReadings(req, postDataObj[0]));
      }
      else {
        return;
      }

      Promise.all(promiseAry).then(async promiseResult => {
        let dateIndex = 1;
        let rowDataAry = [];
        let rowAry = [];
        let headers = []

        /********************* Added by Arjun - Start ***********************/
        if (promiseResult.length == 2) {
          InstAry = [];
          CumuAry = [];

          await columnAry.forEach(async column => {

            var temp = column.columnDef.split('_')

            if (temp.length == 2) {

              if (parameters[temp[1]].parameter_type == 1) {
                var data = {
                  columnDef: column.columnDef,
                  header: column.header
                }
                InstAry.push(data)
              } else if (parameters[temp[1]].parameter_type == 0) {
                var data = {
                  columnDef: column.columnDef,
                  header: column.header
                }
                CumuAry.push(data)
              }

            } else if (temp.length == 1) {
              var data = {
                columnDef: column.columnDef,
                header: column.header
              }
              InstAry.push(data)
            }

          })

          var temp = InstAry.concat(CumuAry)
          columnAry = temp

        }
        /********************* Added by Arjun - End ***********************/


        let columnHeader = [];
        columnAry.forEach(column => {
          columnHeader.push('\"' + column['header'] + '\"');
        });
        headers.push(['\"' + company_name + '\"'].join())
        headers.push(['"Report"', '\"' + postDataObj[0]['reportType'] + '\"'].join())
        headers.push(['"Node Name"', '\"' + node + '\"'].join())
        headers.push(['"Duration"', '\"' + reportDate + '\"'].join())
        headers.push(['"Interval"', '\"' + intervalObj[interval] + '\"'].join())
        headers.push(columnHeader.join());
        /* for both parameter of process data */
        if (promiseResult.length == 2) {
          /* For all interval */
          if (interval == 'all') {
            rowAry = [];
            rowDataAry = [];
            for (var date in promiseResult[0]['data']) {
              var dataObj = {};
              dataObj['srno'] = dateIndex;
              dataObj['date'] = date;

              for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
                if ('timestamp' == nodeUniqueIdParamId) {
                  continue;
                }
                var nodeId = nodeUniqueIdParamId.split('_');
                if (parameters[nodeId[1]].parameter_type != 1) {
                  continue
                }
                else {

                  dataObj['r' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['unitReading'], session.number_format, session.parameters[nodeId[1]].symbol) + '\"'
                }
              }

              for (var nodeUniqueIdParamId in promiseResult[1]['data'][date]) {
                if ('timestamp' == nodeUniqueIdParamId) {
                  continue;
                }
                var nodeId = nodeUniqueIdParamId.split('_');
                if (parameters[nodeId[1]].parameter_type != 0) {
                  continue
                }
                else {

                  dataObj['r' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['reading'], session.number_format, session.parameters[nodeId[1]].symbol) + '\"'
                }
              }
              rowDataAry = Object.values(dataObj);
              rowAry.push(rowDataAry.join());
              dateIndex++;
            }
          }
          /* for process data */
          else {
            for (let date in promiseResult[0]['data']) {
              let dataObj = {};
              dataObj['srno'] = dateIndex;
              dataObj['date'] = date;

              for (let nodeUniqueIdParamId in promiseResult[1]['data'][date]) {
                if ('timestamp' == nodeUniqueIdParamId) {
                  continue;
                }
                let nodeId = nodeUniqueIdParamId.split('_');
                if (parameters[nodeId[1]].parameter_type != 1) {
                  continue
                }
                else {
                  dataObj['mi' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[1]['data'][date][nodeUniqueIdParamId]['min']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
                  dataObj['ma' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[1]['data'][date][nodeUniqueIdParamId]['max']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
                  dataObj['a' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[1]['data'][date][nodeUniqueIdParamId]['average']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';

                }
              }

              for (let nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
                if ('timestamp' == nodeUniqueIdParamId) {
                  continue;
                }
                let nodeId = nodeUniqueIdParamId.split('_');
                if (parameters[nodeId[1]].parameter_type != 0) {
                  continue
                }
                else {
                  dataObj['s' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
                  dataObj['e' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['endReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
                  dataObj['d' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['difference']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';

                }
              }
              rowDataAry = Object.values(dataObj);
              rowAry.push(rowDataAry.join());
              dateIndex++;
            }
          }
        }

        /* for single parameter */
        else if (promiseResult.length == 1) {

          /* for all interval */
          if (interval == 'all') {
            rowAry = [];
            rowDataAry = [];
            for (var date in promiseResult[0]['data']) {
              var dataObj = {};
              dataObj['srno'] = dateIndex;
              dataObj['date'] = date;
              postDataObj.map(item => {
                console.log(item, 'postDataObj');
                var timeF = date.split(' ')[1].substring(0, 5);
                var timeT = date.split(' ')[1].substring(0, 5);

                if ((timeF >= item['fTime']) && (timeT <= item['tTime'])) {

                  for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
                    if ('timestamp' == nodeUniqueIdParamId) {
                      continue;
                    }
                    var nodeId = nodeUniqueIdParamId.split('_');
                    dataObj['r' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['unitReading'], session.number_format, session.parameters[nodeId[1]].symbol) + '\"'

                    rowDataAry = Object.values(dataObj);
                    rowAry.push(rowDataAry.join());
                    dateIndex++;
                  }
                }
              })
            }
          }

          /* for cumulative parameter of process data */
          else if (postDataObj[0].isinstantaneous == 0) {

            promiseAry = []
            rowAry = [];
            rowDataAry = [];
            for (var date in promiseResult[0]['data']) {
              var dataObj = {};
              dataObj['srno'] = dateIndex;
              dataObj['date'] = date;
              for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
                if ('timestamp' == nodeUniqueIdParamId) {
                  continue;
                }
                var nodeId = nodeUniqueIdParamId.split('_');
                dataObj['s' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
                dataObj['e' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['endReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
                dataObj['d' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['difference']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
              }
              rowDataAry = Object.values(dataObj);
              rowAry.push(rowDataAry.join());
              dateIndex++;
            }

          }
          else if (postDataObj[0].isinstantaneous == 1) {


            promiseAry = []
            rowAry = [];
            rowDataAry = [];
            for (var date in promiseResult[0]['data']) {
              var dataObj = {};
              dataObj['srno'] = dateIndex;
              dataObj['date'] = date;
              postDataObj.map(item => {
                console.log(item, 'postDataObj');

                if ((item['interval'] == 'daily') || (item['interval'] == 'monthly') || (item['interval'] == 'weekly') || (item['interval'] == 'yearly')) {
                  for (let nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
                    if ('timestamp' == nodeUniqueIdParamId) {
                      continue;
                    }
                    let nodeId = nodeUniqueIdParamId.split('_');
                    dataObj['mi' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['min']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
                    dataObj['ma' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['max']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
                    dataObj['a' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['average']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
                  }
                }
                else
                  if (((date.split(' ')[1]) >= item['fTime']) && (date.split(' ')[3] <= item['tTime']) && (item['interval'] == 'fifteen') || (item['interval'] == 'hourly')) {
                    for (let nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
                      if ('timestamp' == nodeUniqueIdParamId) {
                        continue;
                      }
                      let nodeId = nodeUniqueIdParamId.split('_');
                      dataObj['mi' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['min']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
                      dataObj['ma' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['max']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
                      dataObj['a' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['average']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
                    }
                  }
                  else {
                    delete dataObj['srno'];
                    delete dataObj['date'];
                  }
              })
              // console.log(dataObj,'dataObj dataObj');
              rowDataAry = Object.values(dataObj);
              rowAry.push(rowDataAry.join());
              dateIndex++;
            }

          }
        }


        rowAry.unshift(columnHeader.join());
        rowAry.unshift(['"Interval"', '\"' + intervalObj[interval] + '\"'].join())
        rowAry.unshift(['"Duration"', '\"' + reportDate + '\"'].join())
        rowAry.unshift(['"Node Name"', '\"' + node + '\"'].join())
        rowAry.unshift(['"Report"', '\"' + postDataObj[0]['reportType'] + '\"'].join())
        rowAry.unshift(['\"' + company_name + '\"'].join())


        if (download) {
          var tempFilePath = tempfile('.csv');
          fs.writeFile(tempFilePath, rowAry.join(os.EOL), function (err) {
            if (err) {
              return reject(err)
            }
            const buffer = fs.readFileSync(tempFilePath);
            const buf2 = Buffer.from(buffer);
            setTimeout(() => {
              fs.unlink(tempFilePath, function () { });
            }, 5000);
            return resolve(buf2);
          });
        }
        if (!download) {
          var tempFilePath = tempfile('.csv');
          fs.writeFile(tempFilePath, rowAry.join(os.EOL), function (err) {
            if (err) {
              return reject(err)
            }
            return resolve(tempFilePath);
          });
        }
      })
        .catch(err => {
          return err;
        });
    }
    catch (err) {
      return reject(0);
    }
  });
}




function generateSingleNodeComparisionReportCsvFile(req, session, download) {
  return new Promise((resolve, reject) => {
    try {
      var postDataObj = req.body.postData;
      postDataObj[0]['reportType'] = (req.body.interval == 'tenmin') ? 'Ten Min Report' : req.body['reportType'];
      var promiseAry = [];
      var columnAry = JSON.parse(req.body.columns);
      var node = req.body.node;
      var reportDate = req.body.reportDate;
      var interval = req.body.interval;
      var company_name = session['company_name'];
      var reqDataObj = postDataObj[0]//commulative
      var reqDataObj1 = postDataObj[1]//instan

      promiseAry.push(getPostdataReadings(req, reqDataObj));
      promiseAry.push(getPostdataReadings(req, reqDataObj1));

      Promise.all(promiseAry).then(promiseResult => {
        var dateIndex = 1;
        var rowAry = [];
        var rowDataAry = [];
        let headers = []

        let columnHeader = [];
        columnAry.forEach(column => {
          columnHeader.push('\"' + column['header'] + '\"');
        });
        headers.push(['\"' + company_name + '\"'].join())
        headers.push(['"Report"', '\"' + postDataObj[0]['reportType'] + '\"'].join())
        headers.push(['"Node Name"', '\"' + node + '\"'].join())
        headers.push(['"Duration"', '\"' + reportDate + '\"'].join())
        headers.push(['"Interval"', '\"' + intervalObj[interval] + '\"'].join())
        headers.push(columnHeader.join());

        var rowAry1 = [];
        var rowAry2 = [];
        var rowAry3 = [];



        for (var date in promiseResult[0]['data']) {
          var dataObj = {};
          dataObj['srno'] = dateIndex;
          dataObj['currentperiod'] = date;
          for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
            if ('timestamp' == nodeUniqueIdParamId) {
              continue;
            }
            var nodeId = nodeUniqueIdParamId.split('_');
            dataObj['s' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
            dataObj['e' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['endReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
            dataObj['d' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['difference']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
          }
          rowDataAry = Object.values(dataObj);
          rowAry1.push(rowDataAry);
          dateIndex++;
        }

        var rowDataAry1 = [];

        for (var date in promiseResult[1]['data']) {
          var dataObj = {};
          dataObj['comparisonperiod'] = date;
          for (var nodeUniqueIdParamId in promiseResult[1]['data'][date]) {
            if ('timestamp' == nodeUniqueIdParamId) {
              continue;
            }
            var nodeId = nodeUniqueIdParamId.split('_');
            dataObj['cs' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[1]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
            dataObj['ce' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[1]['data'][date][nodeUniqueIdParamId]['endReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
            dataObj['cd' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[1]['data'][date][nodeUniqueIdParamId]['difference']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
          }
          rowDataAry1 = Object.values(dataObj);
          rowAry2.push(rowDataAry1);
        }

        for (var x = 0; x < rowAry2.length; x++) {
          var count = x + 1;
          rowAry3.push(count + ',' + rowAry1[x] + ',' + rowAry2[x]);
        }

        rowAry3.unshift(columnHeader.join());
        rowAry3.unshift(['"Interval"', '\"' + intervalObj[interval] + '\"'].join())
        rowAry3.unshift(['"Duration"', '\"' + reportDate + '\"'].join())
        rowAry3.unshift(['"Node Name"', '\"' + node + '\"'].join())
        rowAry3.unshift(['"Report"', '\"' + postDataObj[0]['reportType'] + '\"'].join())
        rowAry3.unshift(['\"' + company_name + '\"'].join())


        if (download) {
          var tempFilePath = tempfile('.csv');
          fs.writeFile(tempFilePath, rowAry3.join(os.EOL), function (err) {
            if (err) {
              return reject(err)
            }
            const buffer = fs.readFileSync(tempFilePath);
            const buf2 = Buffer.from(buffer);
            setTimeout(() => {
              fs.unlink(tempFilePath, function () { });
            }, 5000);
            return resolve(buf2);
          });
        }
        if (!download) {
          var tempFilePath = tempfile('.csv');
          fs.writeFile(tempFilePath, rowAry3.join(os.EOL), function (err) {
            if (err) {
              return reject(err)
            }
            return resolve(tempFilePath);
          });
        }
      })
        .catch(err => {
          return err;
        });
    }
    catch (err) {
      return reject(0);
    }
  });
}



function generateTrendComparisionReportCsvFile(req, session, download) {

  return new Promise((resolve, reject) => {
    try {
      var postDataObj = req.body.postData;
      postDataObj[0]['reportType'] = (req.body.interval == 'tenmin') ? 'Ten Min Report' : req.body['reportType'];
      var promiseAry = [];
      var columnAry = JSON.parse(req.body.columns);
      var node = req.body.node;
      var reportDate = req.body.reportDate;
      var interval = req.body.interval;
      var company_name = session['company_name'];
      var reqDataObj = postDataObj[0]//commulative
      var reqDataObj1 = postDataObj[1]//instan
      promiseAry.push(getPostdataReadings(req, reqDataObj));
      promiseAry.push(getPostdataReadings(req, reqDataObj1));

      Promise.all(promiseAry).then(promiseResult => {
        var dateIndex = 1;
        var rowDataAry = [];
        let headers = [];

        let columnHeader = [];
        columnAry.forEach(column => {
          columnHeader.push('\"' + column['header'] + '\"');
        });
        headers.push(['\"' + company_name + '\"'].join())
        headers.push(['"Report"', '\"' + postDataObj[0]['reportType'] + '\"'].join())
        headers.push(['"Node Name"', '\"' + node + '\"'].join())
        headers.push(['"Duration"', '\"' + reportDate + '\"'].join())
        headers.push(['"Interval"', '\"' + intervalObj[interval] + '\"'].join())
        headers.push(columnHeader.join());


        var rowAry1 = [];
        var rowAry2 = [];
        var rowAry3 = [];


        for (var currentperiod in promiseResult[0]['data']) {
          var dataObj = {};
          dataObj['currentperiod'] = ' ' + currentperiod;


          for (var nodeUniqueIdParamId in promiseResult[0]['data'][currentperiod]) {
            if ('timestamp' == nodeUniqueIdParamId) {
              continue;
            }
            var nodeId = nodeUniqueIdParamId.split('_');
            dataObj['mi' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[0]['data'][currentperiod][nodeUniqueIdParamId]['min']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
            dataObj['ma' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[0]['data'][currentperiod][nodeUniqueIdParamId]['max']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
            dataObj['a' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[0]['data'][currentperiod][nodeUniqueIdParamId]['average']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';

          }
          rowDataAry = Object.values(dataObj);
          rowAry1.push(rowDataAry.join());
          dateIndex++;
        }

        var rowDataAry1 = [];

        for (var comparisonperiod in promiseResult[1]['data']) {
          var dataObj = {};
          dataObj['comparisonperiod'] = ' ' + comparisonperiod;
          for (var nodeUniqueIdParamId in promiseResult[1]['data'][comparisonperiod]) {
            if ('timestamp' == nodeUniqueIdParamId) {
              continue;
            }
            var nodeId = nodeUniqueIdParamId.split('_');
            dataObj['cmi' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[1]['data'][comparisonperiod][nodeUniqueIdParamId]['min']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
            dataObj['cma' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[1]['data'][comparisonperiod][nodeUniqueIdParamId]['max']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
            dataObj['ca' + nodeUniqueIdParamId] = '\"' + applyDecimalUnit(promiseResult[1]['data'][comparisonperiod][nodeUniqueIdParamId]['average']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol) + '\"';
          }
          rowDataAry1 = Object.values(dataObj);
          rowAry2.push(rowDataAry1.join());
        }

        for (var x = 0; x < rowAry2.length; x++) {
          var count = x + 1;
          rowAry3.push(count + ',' + rowAry1[x] + ',' + rowAry2[x]);
        }


        rowAry3.unshift(columnHeader.join());
        rowAry3.unshift(['"Interval"', '\"' + intervalObj[interval] + '\"'].join())
        rowAry3.unshift(['"Duration"', '\"' + reportDate + '\"'].join())
        rowAry3.unshift(['"Node Name"', '\"' + node + '\"'].join())
        rowAry3.unshift(['"Report"', '\"' + postDataObj[0]['reportType'] + '\"'].join())
        rowAry3.unshift(['\"' + company_name + '\"'].join())

        if (download) {
          var tempFilePath = tempfile('.csv');
          fs.writeFile(tempFilePath, rowAry3.join(os.EOL), function (err) {
            if (err) {
              return reject(err)
            }
            const buffer = fs.readFileSync(tempFilePath);
            const buf2 = Buffer.from(buffer);
            setTimeout(() => {
              fs.unlink(tempFilePath, function () { });
            }, 5000);
            return resolve(buf2);
          });
        }
        if (!download) {
          var tempFilePath = tempfile('.csv');
          fs.writeFile(tempFilePath, rowAry3.join(os.EOL), function (err) {
            if (err) {
              return reject(err)
            }
            return resolve(tempFilePath);
          });

        }
      })
        .catch(err => {
          return err;
        });
    }
    // )}
    catch (err) {
      console.log('err');
      return reject(0);
    }
  });
}


module.exports = router;

