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
  if (req.body['format'] == 'xls') {
    switch (req.body['reportType']) {
      case 'SingleNodeConsumption':
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

      // case 'TenMinReport':
      //   promiseAry.push(generateReportExcelFile(req, req.session.passport.user, 1));
      //   break;
    }
  }
  if (req.body['format'] == 'csv') {
    switch (req.body['reportType']) {
      case 'SingleNodeConsumption':
        promiseAry.push(generateSingleNodeReportCsvFile(req, req.session.passport.user, 1));
        break;

      // case 'SingleNodeComparison':
      //   promiseAry.push(generateSingleNodeComparisonReportExcelFile(req, req.session.passport.user, 1));
      //   break;

      // case 'Location Wise Consumption':
      //   promiseAry.push(generateLocationWiseExcelReportFile(req, req.session.passport.user, 1));
      //   break;

      // case 'Group Wise Consumption':
      //   promiseAry.push(generateLocationWiseExcelReportFile(req, req.session.passport.user, 1));
      //   break;

      case 'Multi Node':
        promiseAry.push(generateLocationWiseCsvReportFile(req, req.session.passport.user, 1));
        break;

      case 'Trend':
        promiseAry.push(generateReportCsvFile(req, req.session.passport.user, 1));
        break;

      // case 'Trend Comparison':
      //   promiseAry.push(generateComparisonReportExcelFile(req, req.session.passport.user, 1));
      //   break;
    }
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
    }
  }
  Promise.all(promiseAry).then(function (result) {
    if (!result[0]) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "File downloaded successfully!", "data": result[0] });
    res.end();
    return res;
  }).catch(err => {
    console.log("catch", err)
    res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
    return res;
  });
});

/** function promise call to call the functions based on their report types to email pdf or xcel file after getting callbacks from called functions set mail body here and send the mail to respective ones  */
router.post('/emailReportFile', authenticationHelpers.isClientAuth, function (req, res) {
  var promiseAry = [];
  var filename = '', contentType = '', subject;
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
    }
  }
  if (req.body['format'] == 'csv') {
    filename = req.body['reportType'].toLowerCase() + '-report.csv';
    contentType = 'text/csv';
    switch (req.body['reportType']) {
      case 'SingleNodeConsumption':
        promiseAry.push(generateSingleNodeReportCsvFile(req, req.session.passport.user, 0));
        break;

      // case 'SingleNodeComparison':
      //   promiseAry.push(generateSingleNodeComparisonReportExcelFile(req, req.session.passport.user, 0));
      //   break;

      // case 'Location Wise Consumption':
      //   promiseAry.push(generateLocationWiseExcelReportFile(req, req.session.passport.user, 0));
      //   break;

      // case 'Group Wise Consumption':
      //   promiseAry.push(generateLocationWiseExcelReportFile(req, req.session.passport.user, 0));
      //   break;

      case 'Multi Node':
        promiseAry.push(generateLocationWiseCsvReportFile(req, req.session.passport.user, 0));
        break;

      case 'Trend':
        promiseAry.push(generateReportCsvFile(req, req.session.passport.user, 0));
        break;

      // case 'Trend Comparison':
      //   promiseAry.push(generateComparisonReportExcelFile(req, req.session.passport.user, 0));
      //   break;
    }
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
    }
  }
  Promise.all(promiseAry).then(function (result) {
    if (!result[0]) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
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
        to: req.body['emailAddress'],
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
    console.log('in catch', err)
    res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
    return res;
  });
});

/** SheetJS Library Integration...... consumption singlenode report  style done dynamically */
function generateSingleNodeReportExcelFile(req, session, download) {
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

/** SheetJS Library Integration...... consumption singlenode comparison report style done dynamically */
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
        console.log(' generateSingleNodeComparisonReportExcelFileexcel err', err)
        return err;
      })
    } catch (err) {
      console.log(" generateSingleNodeComparisonReportExcelFile catch try", err)
      return reject(0);
    }
  })
}

/** SheetJS Library Integration...... trend report style done dynamically */
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
        console.log('generateReportExcelFile in catch block1', err)
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
// function generateLocationWiseExcelReportFile(req, session, download) {
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
//               dataObj['r' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
//             }
//             rowDataAry = Object.values(dataObj);
//             rowAry.push(rowDataAry);
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
//                 dataObj['s' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
//                 dataObj['e' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['endReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
//                 dataObj['d' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['difference']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
//               }
//               if (req.body.isinstantaneous == 1) {
//                 dataObj['mi' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['min']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
//                 dataObj['ma' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['max']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
//                 dataObj['a' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['average']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
//               }
//             }
//             rowDataAry = Object.values(dataObj);
//             rowAry.push(rowDataAry);
//             dateIndex++;
//           }
//         }
//         // /** columnHeader array for headings */
//         let columnHeader = [];
//         let parentHeader = [];
//         let parentHeader1 = [];
//         let subHeader = [];
//         let subHeader1 = [];

//         for (var nodeGroupId in readingDataObj) {
//           columnHeader.push(readingDataObj[nodeGroupId]['nodeGroup'], readingDataObj[nodeGroupId]['nodeGroupReading']);
//         };
//         var pColumnInteger = 1;
//         readingDataObj[nodeGroupId]['nodeGroupTblParentCols'].forEach((pColumn, pColumnIndex) => {
//           if (pColumnIndex < 2) {
//             parentHeader.push(pColumn['header']);
//             pColumnInteger++;
//           }
//           if (pColumnIndex >= 2) {
//             nodeGroupEndColumnChar = getCellCharacterCodeFromInteger(pColumnInteger + 2);
//             parentHeader.push(pColumn['header']);
//             pColumnInteger = pColumnInteger + 3;
//           }
//         });

//         readingDataObj[nodeGroupId]['nodeGroupTblCols'].forEach(column => {
//           subHeader.push(column['header']);
//         });

//         var parentHeader2 = parentHeader.splice(0, 2);
//         parentHeader1.push(parentHeader);
//         subHeader1.push(subHeader);

//         /** sheet_add_aoa for add column array and row array in sheet */
//         var workbook = XLSX.utils.book_new();
//         var worksheet = XLSX.utils.aoa_to_sheet([[company_name]]);
//         XLSX.utils.sheet_set_range_style(worksheet, "A1:E1", { bold: true, sz: 12, name: "Cambria", alignment: { vertical: "middle", horizontal: "center" } });
//         XLSX.utils.sheet_add_aoa(worksheet, [["Report", reportType], ["Parameter Name", parameter], ["Duration", reportDate], ["Interval", intervalObj[interval]]], { origin: "A3" });
//         XLSX.utils.sheet_set_range_style(worksheet, "A3:A6", { bold: true, name: "Cambria", sz: 11, alignment: { vertical: "middle", horizontal: "center" } });
//         if (type != 'Multi Node') {
//           XLSX.utils.sheet_add_aoa(worksheet, [columnHeader], { origin: "A8" });
//           XLSX.utils.sheet_set_range_style(worksheet, "A8:E8", { bold: true, name: "Cambria", sz: 11, auto: 1, alignment: { vertical: "middle", horizontal: "center" } });
//         }
//         var merges = worksheet['!merges'] = [];

//         var firstsubHeader = '', mergeCount = 2, endCount = 2, startCount = 3, diffCount = '';
//         var parentHeadercellNo = 10, subHeadercellNo = 11;

//         subHeader.push(subHeader[2]);
//         for (j = 2; j < subHeader.length; j++) {
//           if (firstsubHeader == '') {
//             firstsubHeader = subHeader[j];
//             mergeCount++;
//           }
//           else {
//             if (firstsubHeader == subHeader[j]) {
//               endCount;
//               endCount = mergeCount;
//               mergeCount++;
//               var varCnt = startCount;
//               var startChar = getCellCharacterCodeFromInteger(startCount);
//               var endChar = getCellCharacterCodeFromInteger(endCount);
//               merges.push({ s: startChar + parentHeadercellNo, e: endChar + parentHeadercellNo });
//               startCount = endCount + 1;
//               var diffCnt = startCount;
//               var diffCount = mergeCount - varCnt;
//             }
//             else {
//               mergeCount++;
//             }
//           }
//         }
//         subHeader.pop();
//         var cnt = 3;
//         for (i = 0; i < parentHeader.length; i++) {
//           var parentHeaderChar = getCellCharacterCodeFromInteger(cnt);
//           XLSX.utils.sheet_add_aoa(worksheet, [[parentHeader[i]]], { origin: parentHeaderChar + '10' });
//           XLSX.utils.sheet_set_range_style(worksheet, 'A' + parentHeadercellNo + ':' + parentHeaderChar + parentHeadercellNo, { bold: true, name: "Cambria", sz: 11, auto: 1, alignment: { vertical: "center", horizontal: "center" } });
//           cnt = cnt + diffCount;
//         }

//         for (i = 0; i < subHeader1.length; i++) {
//           var subHeaderChar = getCellCharacterCodeFromInteger(subHeader.length);
//           XLSX.utils.sheet_add_aoa(worksheet, [subHeader1[i]], { origin: "A'" + subHeadercellNo + "'" });
//           XLSX.utils.sheet_set_range_style(worksheet, 'A' + subHeadercellNo + ':' + subHeaderChar + subHeadercellNo, { bold: true, name: "Cambria", sz: 11, auto: 1, alignment: { vertical: "middle", horizontal: "center" } });
//         }
//         // console.log('---------till this point-----', rowAry)
//         var rowCellNo = 12;
//         for (i = 0; i < rowAry.length; i++) {
//           rowChar = getCellCharacterCodeFromInteger(rowAry.length);
//           XLSX.utils.sheet_add_aoa(worksheet, [rowAry[i]], { origin: "A'" + rowCellNo + "'" });
//           XLSX.utils.sheet_set_range_style(worksheet, 'A' + rowCellNo + ':' + rowChar + rowCellNo, { name: "Cambria", sz: 11, alignment: { vertical: "middle", horizontal: "center" } });
//           rowCellNo++;
//         }
//         const used1 = process.memoryUsage().heapUsed / 1024 / 1024;
//         // console.log(`882 The script uses approximately before empty ${Math.round(used1 * 100) / 100} MB`);
//         // merges.push({ s: 'A1', e: subHeaderChar + '1' });
//         rowAry = [];
//         // var filename = __base + 'uploads/sheets/testMultiNode.xlsx';
//         // XLSX.writeFile(workbook, filename);
//         console.log('done wrtiting')
//         // return;
//         if (download) {
//           // return;
//           // XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
//           // console.log(workbook,'----');
//           var wbout = XLSX.write(workbook, { type: "array", bookType: 'xlsx', cellStyles: true });
//           const buf2 = Buffer.from(wbout);
//           console.log(buf2, '--')
//           wbout = '';
//           const used = process.memoryUsage().heapUsed / 1024 / 1024;
//           console.log(`The script uses approximately after buff ${Math.round(used * 100) / 100} MB`);
//           return
//           // return resolve(buf2);
//         }

//         if (!download) {
//           var tempFilePath = tempfile('.xlsx');
//           XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
//           XLSX.writeFile(workbook, tempFilePath, { type: "file", bookType: 'xlsx', cellStyles: true });
//           return resolve(tempFilePath);
//         }

//       }).catch(err => {
//         console.log(' generateLocationWiseExcelReportFile excel err', err);
//         return err;
//       });
//       // }
//     } catch (err) {
//       console.log(' generateLocationWiseExcelReportFile in catch err here', err);
//       return reject(0);
//     }
//   });
// }

function generateLocationWiseExcelReportFile(req, session, download) {
  return new Promise((resolve, reject) => {
    try {
      var promiseAry = [];
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
        // for (var date in promiseResult[0]['data']) {
        //   var dataObj = {};
        //   dataObj['srno'] = dateIndex;
        //   dataObj['date'] = date;
        //   console.log('-----------------------------------1234',promiseResult[0]['data'][date]);
        //   for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
        //     if ('timestamp' == nodeUniqueIdParamId) {
        //       continue;
        //     }
        //     var nodeId = nodeUniqueIdParamId.split('_');
        //     if (req.body.isinstantaneous == 0) {
        //       dataObj['s' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
        //       dataObj['e' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['endReading']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
        //       dataObj['d' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['difference']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
        //     }
        //     if (req.body.isinstantaneous == 1) {
        //       dataObj['mi' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['min']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
        //       dataObj['ma' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['max']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
        //       dataObj['a' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['average']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
        //     }
        //   }
        //   rowDataAry = Object.values(dataObj);
        //   rowAry.push(rowDataAry);
        //   dateIndex++;
        // }

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
        console.log(' generateLocationWiseExcelReportFile excel err', err);
        return err;
      });
    } catch (err) {
      console.log(' generateLocationWiseExcelReportFile in catch err here', err);
      return reject(0);
    }
  });
}

function generateComparisonReportPDFFile(req, session, download) {
  return new Promise((resolve, reject) => {
    try {
      var postDataObj = req.body.postData;
      var reportType = req.body['reportType'];
      var promiseAry = [];
      var columnAry = JSON.parse(req.body.columns);
      var node = req.body.node;
      var reportDate = req.body.reportDate;
      var interval = req.body.interval;
      var chartImg = req.body.chartImg;
      promiseAry.push(getPostdataReadings(req, postDataObj[0]));
      promiseAry.push(getPostdataReadings(req, postDataObj[1]));

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
        var cdateIndex = 1;
        var rowAry1 = [];
        for (var comparisonperiod in promiseResult[1]['data']) {
          var dataObj = {};
          dataObj['srno'] = cdateIndex;
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
          cdateIndex++;
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
        console.log(' generateComparisonReportPDFFile in catch block1', err)
        return err;
      });
    } catch (err) {
      console.log(" generateComparisonReportPDFFile catch try", err)
      return reject(0);
    }
  });
}

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
            // rowDataAry = Object.values(dataObj);
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
        console.log(' generateReportPDFFile in catch block1', err)
        return err;
      });
    } catch (err) {
      console.log(" generateReportPDFFile catch try", err)
      return reject(0);
    }
  });
}

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
              dataObj['readingValue' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
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
        console.log(' generateGroupReportPDFFile in catch block1frrbnjy', err)
        return err;
      });
    } catch (err) {
      console.log(" generateGroupReportPDFFile catch try", err)
      return reject(0);
    }
  });
}

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

function getCellCharacterCodeFromInteger(number) {
  var baseChar = ("A").charCodeAt(0), letters = "";
  do {
    number -= 1;
    letters = String.fromCharCode(baseChar + (number % 26)) + letters;
    number = (number / 26) >> 0;
  } while (number > 0);
  return letters;
}

function generateSingleNodeReportPDFFile(req, session, download) {
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
        console.log('in catch block1', err)
        return err;
      });
    } catch (err) {
      console.log("catch try", err)
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
      console.log('exception here', exception)
      return reject(exception);
    }
  });
}

function generateSingleNodeComparisonReportPdfFile(req, session, download) {
  return new Promise((resolve, reject) => {
    try {
      var promiseAry = [];
      var columnAry = JSON.parse(req.body.columns);
      var reportType = req.body['reportType'];
      var node = req.body.node;
      var reportDate = req.body.reportDate;
      var interval = req.body.interval;
      var chartImg = req.body.chartImg;
      var postData1 = req.body.postData[0];
      var postData2 = req.body.postData[1];
      delete postData1['range'];
      delete postData2['range'];
      promiseAry.push(getPostdataReadings(req, postData1));
      promiseAry.push(getPostdataReadings(req, postData2));
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
        console.log(' generateSingleNodeComparisonReportPdfFile comparison pdf err', err);
        return err;
      });
    } catch (err) {
      console.log(" generateSingleNodeComparisonReportPdfFile catch try", err)
      return reject(0);
    }
  });
}

function generateSingleNodeReportCsvFile(req, session, download) {
  return new Promise((resolve, reject) => {
    try {
      var postDataObj = req.body.postData;
      postDataObj['reportType'] = req.body['reportType'];
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
        let columnHeader = [];
        columnAry.forEach(column => {
          columnHeader.push(column['header']);
        });
        rowAry.push([company_name].join())
        rowAry.push(['Report', postDataObj['reportType']].join())
        rowAry.push(["Node Name", node].join())
        rowAry.push(["Duration", reportDate].join())
        rowAry.push(["Interval", intervalObj[interval]].join())
        rowAry.push(columnHeader.join());
        if (interval == 'all') {
          for (var date in promiseResult[0]['data']) {
            var dataObj = {};
            dataObj['srno'] = dateIndex;
            dataObj['date'] = date;
            for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
              if ('timestamp' == nodeUniqueIdParamId) {
                continue;
              }
              dataObj['r' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);

              // dataObj['r' + nodeUniqueIdParamId] = promiseResult[0]['data'][date][nodeUniqueIdParamId]['unitReading']
            }
            rowDataAry = Object.values(dataObj);
            rowAry.push(rowDataAry.join());
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
              // dataObj['s' + nodeUniqueIdParamId] = promiseResult[0]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'];
              // dataObj['e' + nodeUniqueIdParamId] = promiseResult[0]['data'][date][nodeUniqueIdParamId]['endReading']['unitReading']
              // dataObj['d' + nodeUniqueIdParamId] = promiseResult[0]['data'][date][nodeUniqueIdParamId]['difference']['unitReading']
            }
            rowDataAry = Object.values(dataObj);
            rowAry.push(rowDataAry.join());
            dateIndex++;
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
        console.log(' generateSingleNodeReportCsvFilein catch block1', err)
        return err;
      });
    } catch (err) {
      console.log(' generateSingleNodeReportCsvFile excel err', err)
      return reject(0);
    }
  });
}

function generateReportCsvFile(req, session, download) {
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
      var company_name = session['company_name'];



      promiseAry.push(getPostdataReadings(req, postDataObj));
      Promise.all(promiseAry).then(promiseResult => {
        var dateIndex = 1;
        var rowAry = [];
        var rowDataAry = [];
        let columnHeader = [];
        columnAry.forEach(column => {
          columnHeader.push(column['header']);
        });
        rowAry.push([company_name].join())
        rowAry.push(['Report', postDataObj['reportType']].join())
        rowAry.push(["Node Name", node].join())
        rowAry.push(["Duration", reportDate].join())
        rowAry.push(["Interval", intervalObj[interval]].join())
        rowAry.push(columnHeader.join());

        if (interval == 'all') {
          for (var date in promiseResult[0]['data']) {
            var dataObj = {};
            dataObj['srno'] = dateIndex;
            dataObj['date'] = date;
            for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
              if ('timestamp' == nodeUniqueIdParamId) {
                continue;
              }
              dataObj['r' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);

              // dataObj['r' + nodeUniqueIdParamId] = promiseResult[0]['data'][date][nodeUniqueIdParamId]['unitReading'];
            }
            rowDataAry = Object.values(dataObj);
            rowAry.push(rowDataAry.join());
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

              // dataObj['mi' + nodeUniqueIdParamId] = promiseResult[0]['data'][date][nodeUniqueIdParamId]['min']['unitReading'];
              // dataObj['ma' + nodeUniqueIdParamId] = promiseResult[0]['data'][date][nodeUniqueIdParamId]['max']['unitReading'];
              // dataObj['a' + nodeUniqueIdParamId] = promiseResult[0]['data'][date][nodeUniqueIdParamId]['average']['unitReading'];
            }
            rowDataAry = Object.values(dataObj);
            rowAry.push(rowDataAry.join());
            dateIndex++;
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
        console.log('generateReportExcelFile in catch block1', err)
        return err;
      });

    } catch (err) {
      return reject(0);
    }
  });
}

function generateLocationWiseCsvReportFile(req, session, download) {
  return new Promise((resolve, reject) => {
    try {
      var promiseAry = [];
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

        var dateIndex = 1;
        var rowAry = [];
        var rowDataAry = [];
        let parentHeader = [];
        let subHeader = [];
        let columnHeader = [];
        for (var nodeGroupId in readingDataObj) {
          columnHeader.push(readingDataObj[nodeGroupId]['nodeGroup'], readingDataObj[nodeGroupId]['nodeGroupReading']);
        };
        readingDataObj[nodeGroupId]['nodeGroupTblParentCols'].forEach((pColumn, pColumnIndex) => {
          if (pColumnIndex < 2) {
            parentHeader.push(null);
          }
          if (pColumnIndex >= 2) {
            parentHeader.push('\"' + pColumn['header'] + '\"');
            interval == 'all' ? null : parentHeader.push(null, null);
          }
        });
        readingDataObj[nodeGroupId]['nodeGroupTblCols'].forEach(column => {
          subHeader.push('\"' + column['header'] + '\"');
        });
        rowAry.push(['\"' + company_name + '\"'].join())
        rowAry.push(['"Report"', '\"' + reportType + '\"'].join())
        rowAry.push(['"Parameter Name"', '\"' + parameter + '\"'].join())
        rowAry.push(['"Duration"', '\"' + reportDate + '\"'].join())
        rowAry.push(['"Interval"', '\"' + intervalObj[interval] + '\"'].join())
        rowAry.push(parentHeader.join())
        rowAry.push(subHeader.join())
        if (interval == 'all') {
          for (var date in promiseResult[0]['data']) {
            var dataObj = {};
            dataObj['srno'] = '\"' + dateIndex + '\"';
            dataObj['date'] = '\"' + date + '\"';
            for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
              if ('timestamp' == nodeUniqueIdParamId) {
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
          for (var date in promiseResult[0]['data']) {
            var dataObj = {};
            dataObj['srno'] = '\"' + dateIndex + '\"';
            dataObj['date'] = '\"' + date + '\"';
            for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
              if ('timestamp' == nodeUniqueIdParamId) {
                continue;
              }
              var nodeId = nodeUniqueIdParamId.split('_');
              if (req.body.isinstantaneous == 0) {
                dataObj['s' + nodeId[0]] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'], session.number_format, session.parameters[nodeId[1]].symbol) + '\"';
                dataObj['e' + nodeId[0]] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['endReading']['unitReading'], session.number_format, session.parameters[nodeId[1]].symbol) + '\"';
                dataObj['d' + nodeId[0]] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['difference']['unitReading'], session.number_format, session.parameters[nodeId[1]].symbol) + '\"';
              }
              if (req.body.isinstantaneous == 1) {
                dataObj['mi' + nodeId[0]] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['min']['unitReading'], session.number_format, session.parameters[nodeId[1]].symbol) + '\"';
                dataObj['ma' + nodeId[0]] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['max']['unitReading'], session.number_format, session.parameters[nodeId[1]].symbol) + '\"';
                dataObj['a' + nodeId[0]] = '\"' + applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['average']['unitReading'], session.number_format, session.parameters[nodeId[1]].symbol) + '\"';
              }
              // if (req.body.isinstantaneous == 0) {
              //   dataObj['s' + nodeId[0]] = promiseResult[0]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'];
              //   dataObj['e' + nodeId[0]] = promiseResult[0]['data'][date][nodeUniqueIdParamId]['endReading']['unitReading'];
              //   dataObj['d' + nodeId[0]] = promiseResult[0]['data'][date][nodeUniqueIdParamId]['difference']['unitReading'];
              // }
              // if (req.body.isinstantaneous == 1) {
              //   dataObj['mi' + nodeId[0]] = promiseResult[0]['data'][date][nodeUniqueIdParamId]['min']['unitReading'];
              //   dataObj['ma' + nodeId[0]] = promiseResult[0]['data'][date][nodeUniqueIdParamId]['max']['unitReading'];
              //   dataObj['a' + nodeId[0]] = promiseResult[0]['data'][date][nodeUniqueIdParamId]['average']['unitReading'];
              // }
            }
            rowDataAry = Object.values(dataObj);
            rowAry.push(rowDataAry.join());
            dateIndex++;
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
        console.log(' generateLocationWiseExcelReportFile excel err', err);
        return err;
      });
    } catch (err) {
      console.log(' generateLocationWiseExcelReportFile in catch err here', err);
      return reject(0);
    }
  });
}
/* function generateLocationWiseCsvReportFile(req, session, download) {
  return new Promise((resolve, reject) => {
    try {
      var promiseAry = [];
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

        var dateIndex = 1;
        var rowAry = [];
        var rowDataAry = [];
        let parentHeader = [];
        let subHeader = [];
        let columnHeader = [];
        for (var nodeGroupId in readingDataObj) {
          columnHeader.push(readingDataObj[nodeGroupId]['nodeGroup'], readingDataObj[nodeGroupId]['nodeGroupReading']);
        };
        readingDataObj[nodeGroupId]['nodeGroupTblParentCols'].forEach((pColumn, pColumnIndex) => {
          if (pColumnIndex < 2) {
            parentHeader.push(null);
          }
          if (pColumnIndex >= 2) {
            parentHeader.push(pColumn['header']);
            interval == 'all'? null:parentHeader.push(null, null);
          }
        });
        readingDataObj[nodeGroupId]['nodeGroupTblCols'].forEach(column => {
          subHeader.push(column['header']);
        });
        rowAry.push([company_name].join(';'))
        rowAry.push(['Report', reportType].join(';'))
        rowAry.push(["Parameter Name", parameter].join(';'))
        rowAry.push(["Duration", reportDate].join(';'))
        rowAry.push(["Interval", intervalObj[interval]].join(';'))
        rowAry.push(parentHeader.join(';'))
        rowAry.push(subHeader.join(';'))
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
              dataObj['r' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol)

              // dataObj['r' + nodeUniqueIdParamId] = promiseResult[0]['data'][date][nodeUniqueIdParamId]['unitReading']
            }
            rowDataAry = Object.values(dataObj);
            rowAry.push(rowDataAry.join(';'));
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
              // if (req.body.isinstantaneous == 0) {
              //   dataObj['s' + nodeId[0]] = promiseResult[0]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'];
              //   dataObj['e' + nodeId[0]] = promiseResult[0]['data'][date][nodeUniqueIdParamId]['endReading']['unitReading'];
              //   dataObj['d' + nodeId[0]] = promiseResult[0]['data'][date][nodeUniqueIdParamId]['difference']['unitReading'];
              // }
              // if (req.body.isinstantaneous == 1) {
              //   dataObj['mi' + nodeId[0]] = promiseResult[0]['data'][date][nodeUniqueIdParamId]['min']['unitReading'];
              //   dataObj['ma' + nodeId[0]] = promiseResult[0]['data'][date][nodeUniqueIdParamId]['max']['unitReading'];
              //   dataObj['a' + nodeId[0]] = promiseResult[0]['data'][date][nodeUniqueIdParamId]['average']['unitReading'];
              // }
            }
            rowDataAry = Object.values(dataObj);
            rowAry.push(rowDataAry.join(';'));
            dateIndex++;
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
        console.log(' generateLocationWiseExcelReportFile excel err', err);
        return err;
      });
    } catch (err) {
      console.log(' generateLocationWiseExcelReportFile in catch err here', err);
      return reject(0);
    }
  });
} */

module.exports = router;

