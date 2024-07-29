var express = require('express');
var router = express.Router();
var excelreport = require('../../models').excelreport;
var commonfunction = require('../../models').commonfunction;
var authenticationHelpers = require('../authentication-helpers');
var fs = require('fs');
var multer = require('multer');
var excelFilePath = __base + 'uploads/excel-report/';
var excelFilePath1 = __base + 'uploads/sheets/';
var Promise = require('promise');
var XLSX = require('@sheet/edit');
var momentTimezone = require('moment-timezone');
var lodash = require('lodash');

// var storage = multer.diskStorage({
//     destination: function (req, file, callback) {
//         callback(null, scadaImagePath)
//     },
//     filename: function (req, file, callback) {
//         callback(null, file.originalname)
//     }
// });
var excelStorage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, excelFilePath)
  },
  filename: function (req, file, callback) {
    callback(null, file.originalname)
  }
});

router.post('/excelReportList', authenticationHelpers.isClientAuth, function (req, res, next) {
  excelreport.excelReportList(req.session.passport.user.company_id, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    if (!result) {
      res.json({ "error": true, "reason": "No records found." });
      return res;
    }
    commonfunction.AllappList(req.session.passport.user, result, 'excelreport', function (err, data) {
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
})

router.post('/excelReportSettings', authenticationHelpers.isClientAuth, function (req, res) {
  req.body.userId = req.session.passport.user.user_id;
  excelreport.excelReportSettings(req.body, function (err) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    var excelReportSettingObj = req.body.data ? JSON.parse(req.body.data) : {};
    var dbExcelReportSettingObj = req.body.dbExcelReportData;
    var promiseAry = [];
    var deleteExcelFilesObj = req.body.deleteUploadedFileObj;
    var deletePromiseAry = [];
    if (Object.keys(deleteExcelFilesObj).length > 0) {
      for (var fileIndex in deleteExcelFilesObj) {
        deletePromiseAry.push(deleteFilesFromServer(excelFilePath1 + deleteExcelFilesObj[fileIndex]));
      }
    }
    Promise.all(deletePromiseAry).then(function (result) {
      if (Object.keys(deleteExcelFilesObj).length == result.length) {
        if (Object.keys(excelReportSettingObj).length > 0 && Object.keys(req.body.nodesObj).length > 0) {
          try {
            for (var excelReportIndex in excelReportSettingObj) {
              if (excelReportSettingObj[excelReportIndex]['uploadPath'] && !dbExcelReportSettingObj[excelReportIndex]) {
                console.log('82---in if');
                promiseAry.push(generateExcelFile(excelReportSettingObj[excelReportIndex], excelReportIndex, req.body, req.session.passport.user, 0, 0));
              }
              else if (excelReportSettingObj[excelReportIndex]['uploadPath'] && (JSON.stringify(dbExcelReportSettingObj[excelReportIndex]['node']) != JSON.stringify(excelReportSettingObj[excelReportIndex]['node']))) {
                console.log('82---in else if');
                promiseAry.push(generateExcelFile(excelReportSettingObj[excelReportIndex], excelReportIndex, req.body, req.session.passport.user, 0, 0));
              }
              else { console.log('89 ---in else'); }
            }
          } catch (e) { console.log(e) };

        }
        Promise.all(promiseAry).then(function (results) {
          if (results.indexOf(0) > -1) {
            res.json({ "error": true, "reason": "Error: Default excel template not uploaded!" });
            return res;
          }
          req.body.data = JSON.stringify(excelReportSettingObj);
          excelreport.excelReportSettings(req.body, function (err) {
            if (err) {
              res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
              return res;
            }
            res.json({ "error": false, "reason": "Excel Report settings saved successfully." });
            res.end();
            return res;
          });
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

function deleteFilesFromServer(filename) {
  return new Promise((resolve, reject) => {
    if (filename == '') {
      return reject(0);
    }
    try {
      fs.unlink(filename, function (err) {
        if (err) {
          return reject(0);
        }
        return resolve(1);
      });
    } catch (err) {
      return reject(0);
    }
  });
}


function generateExcelFile(excelReportData, excelReportIndex, data, session, download, newFile) {
  newFile = 1;
  download = 1;
  return new Promise((resolve, reject) => {
    if ('undefined' == typeof excelReportData) {
      return reject(0);
    }
    try {
      var id = data.id.replace(/-/g, "");
      var filename = excelFilePath1 + id + excelReportIndex;
      filename = filename + '.xlsx';
      var retainStyleObj = { cellFormula: true, cellStyles: true, sheetStubs: true, cellNF: true, bookDeps: true, template: true };
      var workbook = XLSX.readFile(excelFilePath + 'Summary_Master_Report.xlsx', retainStyleObj);
      workbook.Workbook.CalcPr.fullCalcOnLoad = true
      var worksheet = {};
      if (newFile) {
        if (download) {
          workbook.SheetNames.forEach((sheetName, sheetIndex) => {
            worksheet = workbook.Sheets[sheetName];
            worksheet = writeExcelFile(workbook, worksheet, filename, excelReportData, excelReportIndex, data, session, download, sheetName, sheetIndex);
          })
          for (var j = excelReportData['node'].length + 1; j <= 20; j++) {
            XLSX.utils.template_book_delete_sheet(workbook, 'Sheet' + j);
          }
          XLSX.writeFile(workbook, filename, retainStyleObj);
          return resolve(1);
        }
      }
      else {
        var workbookOriginal = XLSX.readFile(filename, { cellStyles: true });
        delete workbookOriginal.Sheets['Excel Report'];
        workbookOriginal.SheetNames.splice(0, 1);
        worksheet = writeExcelFile(worksheet, filename, excelReportData, excelReportIndex, data, session, download);
        workbookOriginal.Sheets['Excel Report'] = worksheet;
        workbookOriginal.SheetNames.splice(0, 0, 'Excel Report');
        if (!download) { //existing file and existing data
          return resolve(1);
        }
        if (download) {
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Excel Report');
          var wbout = XLSX.write(workbook, { type: "array", bookType: 'xlsx', cellStyles: true });
          const buf2 = Buffer.from(wbout);
          return resolve(buf2);
        }
      }
    } catch (err) {
      console.log(err)
      return reject(0);
    }
  });
}

writeExcelFile = function (workbook, worksheet, filename, excelReportData, excelReportIndex, data, session, download, sheetName, sheetIndex) {
  var company_name = session['company_name'];
  var intervalWiseObj = {};
  var multipleIntervalAry = [];
  var nodeAry = [];
  var yesterday = momentTimezone.tz(session['timezone']).subtract(1, 'd').format('YYYY-MM-DD');
  var today = momentTimezone.tz(session['timezone']).format('YYYY-MM-DD')

  if (sheetName == 'Progressive Report') {
    var daysInMonth = momentTimezone.tz(session['timezone']).daysInMonth();
    var Count = 0
    for (var dayCount = 0; dayCount < daysInMonth; dayCount++) {
      var monthDate = momentTimezone.tz(session['timezone']).startOf('month').add(dayCount, 'd').format('DD-MM-YYYY');
      var singleInterval = [];
      singleInterval.push(monthDate);
      multipleIntervalAry.push(singleInterval);
      intervalWiseObj[dayCount] = monthDate;
      Count++
    }
    if (Object.keys(intervalWiseObj).length == 0) return;
    var nodesObj = data.nodesObj;
    var intervalAry = Object.values(intervalWiseObj);
    var nodeObj = {};
    excelReportData['node'].forEach((node, index) => {
      if ('undefined' != typeof nodesObj[node])
        nodeAry.push([nodesObj[node]['nodeName']]);
      nodeObj[index] = nodesObj[node]['nodeName'];
    });
    XLSX.utils.template_set_aoa(workbook, sheetName, 'B2' + ':' + 'B2', [[company_name]]);
    var intCharacter = getCellCharacterCodeFromInteger(intervalAry.length + 3);
    XLSX.utils.template_set_aoa(workbook, sheetName, 'D4' + ':' + intCharacter + '4', [intervalAry]);
    /** row array for selected node in report */
    var rowCellNo = 5, nodeCount = 2, nodeCellNo = 5;
    for (i = 0; i < nodeAry.length; i++) {
      var nodeCharacter = getCellCharacterCodeFromInteger(nodeCount);
      XLSX.utils.template_set_aoa(workbook, sheetName, 'C' + nodeCellNo + ':' + 'C' + nodeCellNo, [[{ t: 'n', f: 'SUM(' + 'D' + rowCellNo + ':' + intCharacter + rowCellNo + ')' }]]);
      var nodeCellCount1 = rowCellNo;
      XLSX.utils.template_set_aoa(workbook, sheetName, nodeCharacter + nodeCellNo + ':' + nodeCharacter + nodeCellNo, [nodeAry[i]]);
      rowCellNo++
      nodeCellNo = rowCellNo;
    }
  }
  else if (sheetName == 'Summary Report') {
    var nodesObj = data.nodesObj;
    XLSX.utils.template_set_aoa(workbook, sheetName, 'D4' + ':' + 'D4', [[company_name]]);
    XLSX.utils.template_set_aoa(workbook, sheetName, 'E7' + ':' + 'E7', [[yesterday]]);
    XLSX.utils.template_set_aoa(workbook, sheetName, 'H7' + ':' + 'H7', [[today]]);
    XLSX.utils.template_set_aoa(workbook, sheetName, "E9:E9", [[{ t: "n", f: "Sheet1!D6" }]]);

    var obj = {};
    excelReportData['node'].forEach((node, index) => {
      if ('undefined' != typeof nodesObj[node])
        nodeAry.push([nodesObj[node]['nodeName']]);
      obj[index] = nodesObj[node]['nodeName']
    });
    /** row array for selected node in report */
    var rowCellNo = 9, nodeCount = 4, nodeCellNo = 9;
    for (i = 0; i < nodeAry.length; i++) {
      var nodeCharacter = getCellCharacterCodeFromInteger(nodeCount);
      var nodeCellCount1 = rowCellNo;
      XLSX.utils.template_set_aoa(workbook, sheetName, nodeCharacter + nodeCellNo + ':' + nodeCharacter + nodeCellCount1, [[obj[i]]]);
      var j = i + 1;
      XLSX.utils.template_set_aoa(workbook, sheetName, "E" + rowCellNo + ":H" + rowCellNo, [[{ t: "n", f: "Sheet" + j + "!H5" }, { t: "n", f: "Sheet" + j + "!H6" }, { t: "n", f: "Sheet" + j + "!H7" }, { t: "n", f: "Sheet" + j + "!H8" }]])//for max,min,avg and total

      XLSX.utils.sheet_set_range_style(worksheet, nodeCharacter + nodeCellNo + ':' + nodeCharacter + nodeCellCount1, { bold: true, sz: 11, name: "Cambria", alignment: { vertical: "center", horizontal: "center" } });
      rowCellNo++
      nodeCellNo = rowCellNo;
    }
  }
  return worksheet;
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

router.post('/uploadCustomExcel', authenticationHelpers.isClientAuth, function (req, res) {
  var upload = multer({
    storage: excelStorage
  }).single('xlsx')
  upload(req, res, function (err) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, 'filename': req.file.filename });
    res.end();
    return res;
  })
});

router.post('/excelReportReportSettings', authenticationHelpers.isClientAuth, function (req, res) {
  req.body.userId = req.session.passport.user.user_id;
  excelreport.excelReportReportSettings(req.body, function (err) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Report setting saved successfully." });
    res.end();
    return res;
  });
});

router.post('/deleteExcelReport', authenticationHelpers.isClientAuth, function (req, res) {
  excelreport.deleteExcelReport(req.body.id, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    var deleteExcelFilesObj = req.body.deleteUploadedFileObj;
    if (Object.keys(deleteExcelFilesObj).length > 0) {
      var isError = 0;
      for (var fileIndex in deleteExcelFilesObj) {
        fs.unlink(excelFilePath1 + deleteExcelFilesObj[fileIndex], function (err) {
          if (err) isError = 1;
        });
      }
      if (isError) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
    }
    res.json({ "error": false, "reason": "Excel report deleted successfully." });
    res.end();
    return res;
  });
});

router.post('/downloadDefaultExcelTemplate', authenticationHelpers.isClientAuth, function (req, res) {
  Promise.all([generateExcelFile(req.body.data, req.body.index, req.body, req.session.passport.user, 1, 1)]).then(function (results) {
    if (!results[0]) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Default excel template!", "data": results[0] });
    res.end();
    return res;
  }).catch(err => {
    res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
    return res;
  });
});

module.exports = router;