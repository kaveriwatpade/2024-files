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
var intervalObj = { 'fifteen': '15min', 'hourly': 'Hourly', 'daily': 'Daily', 'weekly': 'Weekly', 'monthly': 'Monthly', 'yearly': 'Yearly', 'all': 'All' };
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
    res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
    return res;
  });
});

/** function promise call to call the functions based on their report types to email pdf or xcel file after getting callbacks from called functions set mail body here and send the mail to respective ones  */
router.post('/emailReportFile', authenticationHelpers.isClientAuth, function (req, res) {
  var emailAdds = req.body['emailAddress'];
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
    res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
    return res;
  });
});

/** SheetJS Library Integration...... consumption singlenode report  style done dynamically */
/* code change by kaveri- start*/ // for consumption
function generateSingleNodeReportExcelFile(req, session, download) {
  return new Promise((resolve, reject) => {
    try {
      const postDataObj = req.body.postData;
      postDataObj['reportType'] = req.body['reportType'];
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

      Promise.all(promiseAry).then(promiseResult => {
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
              for (let nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
                if ('timestamp' == nodeUniqueIdParamId) {
                  continue;
                }
                let nodeId = nodeUniqueIdParamId.split('_');
                dataObj['mi' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['min']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                dataObj['ma' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['max']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                dataObj['a' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['average']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
              }
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
//checked
function generateComparisonReportExcelFile(req, session, download) {
  return new Promise((resolve, reject) => {
    try {
      const postDataObj = req.body.postData;
      var reportType = req.body['reportType'];
      let promiseAry = [];
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

      Promise.all(promiseAry).then(promiseResult => {
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
              // rowDataAry = Object.values(dataObj);
              rowAry.push(dataObj);
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
              for (let nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
                if ('timestamp' == nodeUniqueIdParamId) {
                  continue;
                }
                let nodeId = nodeUniqueIdParamId.split('_');
                dataObj['mi' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['min']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                dataObj['ma' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['max']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
                dataObj['a' + nodeUniqueIdParamId] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['average']['unitReading'], req.body.numberFormat, session.parameters[nodeId[1]].symbol);
              }
              // rowDataAry = Object.values(dataObj);
              rowAry.push(dataObj);
              dateIndex++;
            }
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
/* code change by kaveri- end*/
// checked
function getPostdataReadings(req, postDataObj) {
  req.body = postDataObj;
  return new Promise((resolve, reject) => {
    try {
      var isInstantaneous = parseInt(req.body.isinstantaneous);
      var interval = ('proccessdata' == req.body.interval || 'all' == req.body.interval || 'realtime' == req.body.interval) ? req.body.interval : ((1 === isInstantaneous) ? 'instantaneous' + req.body.interval : 'cummulative' + req.body.interval);
      switch (interval) {
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
        return err;
      });
    } catch (err) {
      return reject(0);
    }
  });
}

function test(req, session, download) {
  return new Promise((resolve, reject) => {
    try {
      var postDataObj = req.body.postData;
      var readingDataObj = JSON.parse(req.body['requestActionData']);
      var reportType = req.body.reportType;
      var parameter = req.body.parameter;
      var reportDate = req.body.reportDate;
      var interval = req.body.interval;
      var reqDataObj = lodash.cloneDeep(req.body.postData);
      delete reqDataObj['node'];
      delete reqDataObj['nodeGroupObj'];
      delete reqDataObj['nodeGroupIndexingObj'];
      delete reqDataObj['reportName'];
      delete reqDataObj['reportType'];
      // delete reqDataObj['chartType'];
      reqDataObj['nodeId'] = [];
      var nodeIdAry = [];
      var index = 1;
      var totalIndex = postDataObj['nodeId'].length - 1;
      var observableAry = [];
      postDataObj['nodeId'].forEach((nodeId, nodeIndex) => {
        nodeIdAry.push(nodeId);
        if (10 == index || nodeIndex == totalIndex) {
          index = 1;
          var reqPostDataObj = lodash.cloneDeep(reqDataObj);
          reqPostDataObj['nodeId'] = nodeIdAry.slice(0);
          observableAry.push(getPostdataReadings(req, reqPostDataObj));
          nodeIdAry = [];
        } else {
          index++;
        }
      });

      Promise.all(observableAry).then(promiseResult => {
        var dateIndex = 1;
        var rowAry = [];
        for (var date in promiseResult[0]['data']) {
          var dataObj = {};
          dataObj['srno'] = dateIndex;
          dataObj['date'] = date;
          for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
            if ('timestamp' == nodeUniqueIdParamId) {
              continue;
            }
            var nodeId = nodeUniqueIdParamId.split('_');
            dataObj['s' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'], req.body.numberFormat);
            dataObj['e' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['endReading']['unitReading'], req.body.numberFormat);
            dataObj['d' + nodeId[0]] = applyDecimalUnit(promiseResult[0]['data'][date][nodeUniqueIdParamId]['difference']['unitReading'], req.body.numberFormat);
          }
          rowAry.push(dataObj);
          dateIndex++;
        }
        var workbook = new Excel.Workbook();
        var worksheet = workbook.addWorksheet('Report');
        worksheet.mergeCells('A1:Z1');
        worksheet.getCell('A1:Z1').value = session['company_name'];
        worksheet.getCell('A1:Z1').font = { bold: true, size: 12 };
        worksheet.getCell('A1:Z1').alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getCell('A3').value = 'Report';
        worksheet.getCell('A3').font = { bold: true, size: 11 };
        worksheet.getCell('A4').value = 'Parameter Name';
        worksheet.getCell('A4').font = { bold: true, size: 11 };
        worksheet.getCell('A5').value = 'Duration';
        worksheet.getCell('A5').font = { bold: true, size: 11 };
        worksheet.getCell('A6').value = 'Interval';
        worksheet.getCell('A6').font = { bold: true, size: 11 };
        worksheet.mergeCells('B3:Z3');
        worksheet.getCell('B3:Z3').value = reportType;
        worksheet.getCell('B3:Z3').font = { size: 11 };
        worksheet.mergeCells('B4:Z4');
        worksheet.getCell('B4:Z4').value = parameter;
        worksheet.getCell('B4:Z4').font = { size: 11 };
        worksheet.mergeCells('B5:Z5');
        worksheet.getCell('B5:Z5').value = reportDate;
        worksheet.getCell('B5:Z5').font = { size: 11 };
        worksheet.mergeCells('B6:Z6');
        worksheet.getCell('B6:Z6').value = intervalObj[interval];
        worksheet.getCell('B6:Z6').font = { size: 11 };
        var groupColumnInterger = 8, nodeGroupColumnInteger = 1, nodeGroupStartColumnChar = '', nodeGroupEndColumnChar = '';
        for (var nodeGroupId in readingDataObj) {
          var pColumnInteger = 1, columnInteger = 1, columnChar = '', rowInteger = 1, rowChar = '';
          worksheet.getCell('A' + groupColumnInterger).value = readingDataObj[nodeGroupId]['nodeGroup'];
          worksheet.getCell('A' + groupColumnInterger).font = { bold: true, size: 11 };
          worksheet.getCell('B' + groupColumnInterger).value = readingDataObj[nodeGroupId]['nodeGroupReading'];
          worksheet.getCell('B' + groupColumnInterger).font = { bold: true, size: 11 };
          var nodeGroupColumnInteger = groupColumnInterger + 2;
          readingDataObj[nodeGroupId]['nodeGroupTblParentCols'].forEach((pColumn, pColumnIndex) => {
            nodeGroupStartColumnChar = getCellCharacterCodeFromInteger(pColumnInteger);
            if (pColumnIndex < 2) {
              worksheet.getCell('A' + nodeGroupColumnInteger).value = pColumn['header'];
              worksheet.getCell('B' + nodeGroupColumnInteger).value = pColumn['header'];
              pColumnInteger++;
            }
            if (pColumnIndex >= 2) {
              nodeGroupEndColumnChar = getCellCharacterCodeFromInteger(pColumnInteger + 2);
              worksheet.mergeCells(nodeGroupStartColumnChar + nodeGroupColumnInteger + ':' + nodeGroupEndColumnChar + nodeGroupColumnInteger);
              worksheet.getCell(nodeGroupStartColumnChar + nodeGroupColumnInteger + ':' + nodeGroupEndColumnChar + nodeGroupColumnInteger).value = pColumn['header'];
              worksheet.getCell(nodeGroupStartColumnChar + nodeGroupColumnInteger + ':' + nodeGroupEndColumnChar + nodeGroupColumnInteger).font = { bold: true, size: 11 };
              pColumnInteger = pColumnInteger + 3;
            }
          });

          var nodeColumnInteger = groupColumnInterger + 3;
          readingDataObj[nodeGroupId]['nodeGroupTblCols'].forEach(column => {
            columnChar = getCellCharacterCodeFromInteger(columnInteger);
            worksheet.getCell(columnChar + nodeColumnInteger).value = column['header'];
            worksheet.getCell(columnChar + nodeColumnInteger).font = { bold: true, size: 11 };
            var valueInteger = nodeColumnInteger + 1;
            rowAry.forEach(row => {
              rowChar = getCellCharacterCodeFromInteger(rowInteger);
              worksheet.getCell(rowChar + valueInteger).value = row[column['columnDef']];
              valueInteger++;
            });
            rowInteger++;
            columnInteger++;
          });
          groupColumnInterger = groupColumnInterger + (rowAry.length + 5);
        }
        if (download) {
          workbook.xlsx.writeBuffer().then(function (data) {
            return resolve(data);
          });
        }
        if (!download) {
          var tempFilePath = tempfile('.xlsx');
          workbook.xlsx.writeFile(tempFilePath).then(function () {
            return resolve(tempFilePath);
          });
        }
      });
    } catch (err) {

    }
  })
}

module.exports = router;

