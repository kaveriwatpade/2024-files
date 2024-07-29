var express = require('express');
var router = express.Router();
var analytics = require('../../models').analytics;
var authenticationHelpers = require('../authentication-helpers');
var common = require(__base + 'routes/common');
var fs = require('fs');
var multer = require('multer');
var excelFilePath = __base + 'uploads/excel-report/';
var Promise = require('promise');
var Excel = require('exceljs');
var momentTimezone = require('moment-timezone');
var lodash = require('lodash');
var scadaImagePath = __base + 'uploads/scada/';
var storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, scadaImagePath)
  },
  filename: function (req, file, callback) {
    callback(null, file.originalname)
  }
});
var excelStorage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, excelFilePath)
  },
  filename: function (req, file, callback) {
    callback(null, file.originalname)
  }
});

router.post('/nodedata', authenticationHelpers.isClientAuth, function (req, res, next) {
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
    res.json({ error: true, reason: "Error: Unable to get data. Please try again!" });
    res.end();
    return res;
  }
});

router.post('/processedRawData', authenticationHelpers.isClientAuth, function (req, res, next) {
  common.getProcessedRawData(req, function (error, result) {
    res.json(result);
    res.end();
    return res;
  });
});

router.post('/nodeFifteenMinDailyData', authenticationHelpers.isClientAuth, function (req, res, next) {
  common.getNodeFifteenMinDailyData(req, function (error, result) {
    res.json(result);
    res.end();
    return res;
  });
});

router.post('/timeSliceList', authenticationHelpers.isClientAuth, function (req, res, next) {
  analytics.timeSliceList(req.session.passport.user, function (err, result) {
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

router.post('/nodeSettings', authenticationHelpers.isClientAuth, function (req, res) {
  analytics.nodeSettings(req.body, function (err) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Node setting saved successfully." });
    res.end();
    return res;
  });
});

router.post('/parameterSettings', authenticationHelpers.isClientAuth, function (req, res) {
  analytics.parameterSettings(req.body, function (err) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Parameter setting saved successfully." });
    res.end();
    return res;
  });
});

router.post('/communicationSettings', authenticationHelpers.isClientAuth, function (req, res) {
  analytics.communicationSettings(req.body, function (err) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Communication saved successfully." });
    res.end();
    return res;
  });
});

router.post('/deleteTimeSliceReport', authenticationHelpers.isClientAuth, function (req, res) {
  analytics.deleteTimeSliceReport(req.body.id, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Time slice deleted successfully." });
    res.end();
    return res;
  });
});

router.post('/reportSettings', authenticationHelpers.isClientAuth, function (req, res) {
  analytics.reportSettings(req.body, function (err) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Report setting saved successfully." });
    res.end();
    return res;
  });
});

router.post('/getScadaList', authenticationHelpers.isClientAuth, function (req, res, next) {
  analytics.getScadaList(req.session.passport.user.company_id, function (err, result) {
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

router.post('/deleteScadaWidget', authenticationHelpers.isClientAuth, function (req, res) {
  analytics.deleteScadaWidget(req.body.id, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    if (0 < req.body.scadaImageAry.length) {
      var isError = 0;
      req.body.scadaImageAry.forEach(function (element) {
        fs.unlink(scadaImagePath + element, function (err) {
          if (err) isError = 1;
        });
      }, this);
      if (isError) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
    }
    res.json({ "error": false, "reason": "SCADA deleted successfully." });
    res.end();
    return res;
  });
});

router.post('/saveImgFileInUploads', authenticationHelpers.isClientAuth, function (req, res) {
  var upload = multer({
    storage: storage
  }).single('svg')
  upload(req, res, function (err) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false });
    res.end();
    return res;
  })
});

router.post('/scadaSettings', authenticationHelpers.isClientAuth, function (req, res) {
  analytics.scadaSettings(req.body, function (err) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    var scadaSettingObj = req.body.scadaDataObj ? JSON.parse(req.body.scadaDataObj) : {};
    var tabsDeleteRenameImgObj = req.body.tabsDeleteRenameImgObj;
    if (0 == Object.keys(tabsDeleteRenameImgObj).length) {
      res.json({ "error": false, "reason": "SCADA setting saved successfully." });
      res.end();
      return res;
    }
    if (Object.keys(tabsDeleteRenameImgObj).length > 0) {
      var newIndex = 0, isError = 0, toIndex = 0, fromIndex = 0, isFileRenamed = 0;
      var deletePromiseAry = [];
      var appId = req.body.appId.replace(/-/g, "");
      for (var fileIndex in tabsDeleteRenameImgObj) {
        toIndex = fileIndex;
        newIndex = parseInt(fileIndex);
        var fileExtension = tabsDeleteRenameImgObj[fileIndex].split('.');
        for (fromIndex = newIndex + 1; fromIndex <= Object.keys(scadaSettingObj).length; fromIndex++) {
          isFileRenamed = 1;
          var renameFileFrom = scadaImagePath + appId + fromIndex + '.' + fileExtension[1];
          var renameFileTo = scadaImagePath + appId + toIndex + '.' + fileExtension[1];
          fs.rename(renameFileFrom, renameFileTo, function (err) {
            if (err) isError = 1;
          });
          toIndex = parseInt(toIndex);
          toIndex++;
        }
        if (!isError && !isFileRenamed) {
          deletePromiseAry.push(deleteFilesFromServer(scadaImagePath + appId + fileIndex + '.' + fileExtension[1]));
        }
      }
      if (0 < req.body.nodeParameterDeleteImgAry.length) {
        req.body.nodeParameterDeleteImgAry.forEach(element => {
          deletePromiseAry.push(deleteFilesFromServer(scadaImagePath + element));
        });
      }
      if (isError) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      Promise.all(deletePromiseAry).then(function (results) {
        if (results) {
          res.json({ "error": false, "reason": "SCADA setting saved successfully." });
          res.end();
          return res;
        }
      }).catch(err => {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      });
    }
  });
});

router.post('/scadaNodeParameterSettings', authenticationHelpers.isClientAuth, function (req, res) {
  analytics.scadaNodeParameterSettings(req.body, function (err) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    if ('' != req.body.deleteImageName) {
      fs.unlink(scadaImagePath + req.body.deleteImageName, function (err) {
        if (err) {
          res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
          return res;
        }
      });
    }
    res.json({ "error": false, "reason": "Node parameter setting saved successfully." });
    res.end();
    return res;
  });
});

router.post('/excelReportList', authenticationHelpers.isClientAuth, function (req, res, next) {
  analytics.excelReportList(req.session.passport.user.company_id, function (err, result) {
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

router.post('/excelReportSettings', authenticationHelpers.isClientAuth, function (req, res) {
  analytics.excelReportSettings(req.body, function (err) {
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
        deletePromiseAry.push(deleteFilesFromServer(excelFilePath + deleteExcelFilesObj[fileIndex]));
      }
    }
    Promise.all(deletePromiseAry).then(function (result) {
      if (Object.keys(deleteExcelFilesObj).length == result.length) {
        if (Object.keys(excelReportSettingObj).length > 0 && Object.keys(req.body.nodesObj).length > 0) {
          for (var excelReportIndex in excelReportSettingObj) {
            if (excelReportSettingObj[excelReportIndex]['uploadPath'] && (JSON.stringify(dbExcelReportSettingObj[excelReportIndex]) != JSON.stringify(excelReportSettingObj[excelReportIndex]))) {
              promiseAry.push(generateExcelFile(excelReportSettingObj[excelReportIndex], excelReportIndex, req.body, req.session.passport.user, 0, 0));
            }
            if (!excelReportSettingObj[excelReportIndex]['uploadPath']) {
              promiseAry.push(generateExcelFile(excelReportSettingObj[excelReportIndex], excelReportIndex, req.body, req.session.passport.user, 0, 1));
              var filename = req.body.id + excelReportIndex;
              filename = filename.replace(/-/g, "");
              excelReportSettingObj[excelReportIndex]['uploadPath'] = filename + '.xlsx';
            }
          }
        }
        Promise.all(promiseAry).then(function (results) {
          if (results.indexOf(0) > -1) {
            res.json({ "error": true, "reason": "Error: Default excel template not uploaded!" });
            return res;
          }
          req.body.data = JSON.stringify(excelReportSettingObj);
          analytics.excelReportSettings(req.body, function (err) {
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
  return new Promise((resolve, reject) => {
    if ('undefined' == typeof excelReportData) {
      return reject(0);
    }
    try {
      var filename = data.id + excelReportIndex;
      filename = filename.replace(/-/g, "");
      filename = excelFilePath + filename + '.xlsx';
      var workbook = new Excel.Workbook();
      if (newFile) {
        var worksheet = workbook.addWorksheet('Excel Report');
        worksheet = writeExcelFile(worksheet, filename, excelReportData, excelReportIndex, data, session, download);
        if (!download) {
          workbook.xlsx.writeFile(filename).then(function () {
            return resolve(1);
          });
        }
        if (download) {
          workbook.xlsx.writeBuffer().then(function (data) {
            return resolve(data);
          });
        }
      }
      else {
        workbook.xlsx.readFile(filename).then(function () {
          workbook.removeWorksheet('Excel Report');
          var worksheet = workbook.addWorksheet('Excel Report');
          workbook.eachSheet(function (worksheet, sheetId) {
            if (worksheet.name == 'Excel Report') {
              worksheet.orderNo = 0;
            }
          });
          worksheet = writeExcelFile(worksheet, filename, excelReportData, excelReportIndex, data, session, download);
          if (!download) {
            workbook.xlsx.writeFile(filename).then(function () {
              return resolve(1);
            });
          }
          if (download) {
            workbook.xlsx.writeBuffer().then(function (data) {
              return resolve(data);
            });
          }
        });
      }
    } catch (err) {
      return reject(0);
    }
  });
}

writeExcelFile = function (worksheet, filename, excelReportData, excelReportIndex, data, session, download) {
  var intervalWiseObj = {};
  if (excelReportData['interval'] == 'hourly') {
    var yesterday = momentTimezone.tz(session['timezone']).subtract(1, 'd').format('YYYY-MM-DD');
    for (var hour = 0; hour < 24; hour++) {
      var startTime = momentTimezone.tz(session['timezone']).startOf('month').add(hour, 'hour').format('HH:mm');
      var endTime = momentTimezone(startTime, 'HH:mm').add(60, 'minutes').format('HH:mm');
      endTime = endTime == '00:00' ? '23:59' : endTime;
      var dateString = yesterday + ' ' + startTime + ' - ' + endTime;
      intervalWiseObj[hour] = dateString;
    }
  }
  if (excelReportData['interval'] == 'daily') {
    var daysInMonth = momentTimezone.tz(session['timezone']).daysInMonth();
    for (var dayCount = 0; dayCount < daysInMonth; dayCount++) {
      var monthDate = momentTimezone.tz(session['timezone']).startOf('month').add(dayCount, 'd').format('DD-MM-YYYY');
      intervalWiseObj[dayCount] = monthDate;
    }
  }
  if (excelReportData['interval'] == 'weekly') {
    var currentYear = momentTimezone().tz(session['timezone']).startOf('isoweek').format('YYYY');
    for (var weekNumber = 0; weekNumber < 53; weekNumber++) {
      var startDateOfWeek = momentTimezone(currentYear, 'YYYY').add(weekNumber, 'week').startOf('isoweek').format('DD-MM-YYYY');
      var endDateOfWeek = momentTimezone(currentYear, 'YYYY').add(weekNumber, 'week').endOf('isoweek').format('DD-MM-YYYY');
      intervalWiseObj[weekNumber] = startDateOfWeek + ' - ' + endDateOfWeek;
    }
  }
  if (excelReportData['interval'] == 'monthly') {
    var startDate = momentTimezone().startOf('year').tz(session['timezone']).format('YYYY-MM-DD 00:00:00' + session['timezone_offset']);
    for (var monthCount = 0; monthCount < 12; monthCount++) {
      var month = momentTimezone(startDate).tz(session['timezone']).add(monthCount, 'month').format('MMM YYYY');
      intervalWiseObj[monthCount] = month;
    }
  }
  if (Object.keys(intervalWiseObj).length == 0) return;

  var nodesObj = data.nodesObj;
  var valuesObj = { 0: { startReading: 'Start Reading', endReading: 'End Reading', difference: 'Difference' }, 1: { min: 'Min', max: 'Max', average: 'Average' } };
  var parameterCount = excelReportData['parameter'].length;
  var parameterValueObj = { 0: { parameter: [], values: [], valuesCnt: 0 }, 1: { parameter: [], values: [], valuesCnt: 0 } };
  excelReportData['parameter'].forEach((parameterId, paramIndex) => {
    if (session['parameters'][parameterId]['parameter_type'] == 1) {
      parameterValueObj[session['parameters'][parameterId]['parameter_type']]['parameter'].push(parameterId);
      parameterValueObj[session['parameters'][parameterId]['parameter_type']]['values'] = lodash.intersection(excelReportData['values'], Object.keys(valuesObj[1]));
    }
    else if (session['parameters'][parameterId]['parameter_type'] == 0) {
      parameterValueObj[session['parameters'][parameterId]['parameter_type']]['parameter'].push(parameterId);
      parameterValueObj[session['parameters'][parameterId]['parameter_type']]['values'] = lodash.intersection(excelReportData['values'], Object.keys(valuesObj[0]));
    }
  });

  var parameterCountC = parameterValueObj[0]['parameter'].length;
  var parameterCountI = parameterValueObj[1]['parameter'].length;
  var selectedValuesCountC = parameterValueObj[0]['valuesCnt'] = parameterValueObj[0]['values'].length;
  var selectedValuesCountI = parameterValueObj[1]['valuesCnt'] = parameterValueObj[1]['values'].length;
  var selectedValuesCount = excelReportData['parameterType'] == 'all' ? (selectedValuesCountC * parameterCountC) + (selectedValuesCountI * parameterCountI) : (selectedValuesCountC + selectedValuesCountI) * parameterCount;

  worksheet.mergeCells('A1:Z1');
  worksheet.getCell('A1:Z1').value = session['company_name'];
  worksheet.getCell('A1:Z1').font = { bold: true, size: 14 };
  worksheet.getCell('A1:Z1').alignment = { vertical: 'middle', horizontal: 'center' };

  if (excelReportData['transpose'] == true) {
    worksheet.getCell('A3').value = 'Node : Secondary Name';
    worksheet.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getCell('B3').value = 'Parameter';
    worksheet.getCell('B3').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getCell('C3').value = 'Value';
    worksheet.getCell('C3').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(3).font = { bold: true };
    var dateStartCharInteger = 4, dateMergeCellIndex = '', nodeMergeCellStartIndex = 4, nodeMergeCellEndIndex = '', parameterMergeCellStartIndex = 4, parameterMergeCellEndIndex = '', valueCellIndex = 4;
    for (var intervalIndex in intervalWiseObj) {
      dateMergeCellIndex = getCellCharacterCodeFromInteger((dateStartCharInteger - 1));
      dateStartChar = getCellCharacterCodeFromInteger(dateStartCharInteger);
      worksheet.getCell(dateStartChar + '3').value = intervalWiseObj[intervalIndex];
      worksheet.getCell(dateStartChar + '3').alignment = { vertical: 'center', horizontal: 'center' };
      dateStartCharInteger++;
    }
    excelReportData['node'].forEach((node, nodeIndex) => {
      if ('undefined' != typeof nodesObj[node]) {
        nodeMergeCellEndIndex = (nodeMergeCellStartIndex - 1) + (selectedValuesCount);
        worksheet.mergeCells('A' + nodeMergeCellStartIndex + ':A' + nodeMergeCellEndIndex);
        worksheet.getCell('A' + nodeMergeCellStartIndex + ':A' + nodeMergeCellEndIndex).value = nodesObj[node]['nodeName'] + (nodesObj[node]['secondaryName'] ? ' : '+nodesObj[node]['secondaryName'] : '');
        worksheet.getCell('A' + nodeMergeCellStartIndex + ':A' + nodeMergeCellEndIndex).alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getCell('A' + valueCellIndex).font = { bold: true };
        for (var parameterValueIndex in parameterValueObj) {
          parameterValueObj[parameterValueIndex]['parameter'].forEach((parameterId, paramIndex) => {
            parameterMergeCellEndIndex = (parameterMergeCellStartIndex - 1) + (parameterValueObj[parameterValueIndex]['valuesCnt']);
            worksheet.mergeCells('B' + parameterMergeCellStartIndex + ':B' + parameterMergeCellEndIndex);
            worksheet.getCell('B' + parameterMergeCellStartIndex + ':B' + parameterMergeCellEndIndex).value = session['parameters'][parameterId]['parameter_name'];
            worksheet.getCell('B' + parameterMergeCellStartIndex + ':B' + parameterMergeCellEndIndex).alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getCell('B' + valueCellIndex).font = { bold: true };
            parameterMergeCellStartIndex = parameterMergeCellStartIndex + parameterValueObj[parameterValueIndex]['valuesCnt'];
            parameterValueObj[parameterValueIndex]['values'].forEach((value, valuesIndex) => {
              worksheet.mergeCells('C' + valueCellIndex);
              worksheet.getCell('C' + valueCellIndex).value = valuesObj[parameterValueIndex][value];
              worksheet.getCell('C' + valueCellIndex).alignment = { vertical: 'middle', horizontal: 'center' };
              worksheet.getCell('C' + valueCellIndex).font = { bold: true };
              valueCellIndex++;
            });
          });
        }
        nodeMergeCellStartIndex = (nodeMergeCellStartIndex + (selectedValuesCount));
      }
    });
  }
  if (excelReportData['transpose'] == false) {
    worksheet.mergeCells('A3:A5');
    worksheet.getCell('A3:A5').value = 'Node : Secondary Name';
    worksheet.getCell('A3:A5').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(3).font = { bold: true };
    worksheet.getRow(4).font = { bold: true };
    worksheet.getRow(5).font = { bold: true };
    var dateStartCharInteger = 2, parameterCharInteger = 2, valuesCharInterger = 2, dateStartChar = '', parameterStartChar = '', valuesStartChar = '', dateMergeCellIndex = '';
    for (var intervalIndex in intervalWiseObj) {
      dateMergeCellIndex = getCellCharacterCodeFromInteger((dateStartCharInteger - 1) + (selectedValuesCount));
      dateStartChar = getCellCharacterCodeFromInteger(dateStartCharInteger);
      worksheet.mergeCells(dateStartChar + '3:' + dateMergeCellIndex + '3');
      worksheet.getCell(dateStartChar + '3:' + dateMergeCellIndex + '3').value = intervalWiseObj[intervalIndex];
      worksheet.getCell(dateStartChar + '3:' + dateMergeCellIndex + '3').alignment = { vertical: 'center', horizontal: 'center' };
      for (var parameterValueIndex in parameterValueObj) {
        parameterValueObj[parameterValueIndex]['parameter'].forEach((parameterId, paramIndex) => {
          var paramMergeCellIndex = getCellCharacterCodeFromInteger((parameterCharInteger - 1) + (parameterValueObj[parameterValueIndex]['valuesCnt']));
          parameterStartChar = getCellCharacterCodeFromInteger(parameterCharInteger);
          worksheet.mergeCells(parameterStartChar + '4:' + paramMergeCellIndex + '4');
          worksheet.getCell(parameterStartChar + '4:' + paramMergeCellIndex + '4').value = session['parameters'][parameterId]['parameter_name'];
          worksheet.getCell(parameterStartChar + '4:' + paramMergeCellIndex + '4').alignment = { vertical: 'middle', horizontal: 'center' };
          parameterCharInteger = parameterCharInteger + parameterValueObj[parameterValueIndex]['valuesCnt'];
          parameterValueObj[parameterValueIndex]['values'].forEach((value, valuesIndex) => {
            valuesStartChar = getCellCharacterCodeFromInteger(valuesCharInterger);
            worksheet.getCell(valuesStartChar + '5').value = valuesObj[parameterValueIndex][value];
            worksheet.getCell(valuesStartChar + '5').alignment = { vertical: 'middle', horizontal: 'center' };
            valuesCharInterger++;
          });
        });
      }
      dateStartCharInteger = (dateStartCharInteger + (selectedValuesCount));
    }
    excelReportData['node'].forEach((node, index) => {
      if ('undefined' != typeof nodesObj[node]) worksheet.addRow([nodesObj[node]['nodeName'] + (nodesObj[node]['secondaryName'] ? ' : '+nodesObj[node]['secondaryName'] : '')]);
    });
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
  analytics.excelReportReportSettings(req.body, function (err) {
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
  analytics.deleteExcelReport(req.body.id, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    var deleteExcelFilesObj = req.body.deleteUploadedFileObj;
    if (Object.keys(deleteExcelFilesObj).length > 0) {
      var isError = 0;
      for (var fileIndex in deleteExcelFilesObj) {
        fs.unlink(excelFilePath + deleteExcelFilesObj[fileIndex], function (err) {
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