var express = require('express');
var router = express.Router();
var analytics = require('../../models').analytics;
var commonfunction = require('../../models').commonfunction;
var authenticationHelpers = require('../authentication-helpers');
var common = require(__base + 'routes/common');
var fs = require('fs');
var multer = require('multer');
var excelFilePath = __base + 'uploads/excel-report/';
var TimeSliceExcelFilePath = __base + 'uploads/time-slice/';
var Promise = require('promise');
var XLSX = require('@sheet/edit');
var Excel = require('exceljs'); //added 
var momentTimezone = require('moment-timezone');
var lodash = require('lodash');
var scadaImagePath = __base + 'uploads/scada/';
const tempfile = require('tempfile');
const { Console } = require('console');

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
//code by soham start
var TimeSliceStorage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, TimeSliceExcelFilePath)
  },
  filename: function (req, file, callback) {
    callback(null, file.originalname)
  }

});//code by soham start


router.post('/nodedata', authenticationHelpers.isClientAuth, function (req, res, next) {

  try {

    console.log('Request Body Data !!!! ',req.body)
    
    
    var isInstantaneous = parseInt(req.body.isinstantaneous);
    var interval = ('proccessdata' == req.body.interval || 'all' == req.body.interval || 'realtime' == req.body.interval) ? req.body.interval : ((1 === isInstantaneous) ? 'instantaneous' + req.body.interval : 'cummulative' + req.body.interval);
    
    console.log('Request Body interval Data !!!! ',interval)

    switch (interval) {
      case 'cummulativetenmin': common.getCummulativeTenMinutesData(req, function (error, data) {
        res.json(data);
        res.end();
        return res;
      });
        break;
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
      case 'cummulativedaily':

      console.log(' Analytics Test $#$#$ 1')
      common.getCummulativeDailyData(req, function (error, data) {
        console.log(' Analytics Test $#$#$ 2')
        res.json(data);
        res.end();
        console.log(' Analytics Test $#$#$ 3')
        return res;
        });
        break;
      case 'cummulativeweekly':

        /***** Added by Arjun - Start ******/
        if (req.body.widget_type) {

          req.body.interval = 'daily';

          common.getCummulativeDailyData(req, function (error, data) {

            req.body.interval = 'weekly';
            req.body.dailyData = data;

            common.getCummulativeAvg(req, function (err, avgData) {

              res.json(avgData);
              res.end();
              return res;

            });


          });



        }
        else {
          common.getCummulativeWeeklyData(req, function (error, data) {
            res.json(data);
            res.end();
            return res;
          });
        }

        /***** Added by Arjun - End ******/

        break;
      case 'cummulativemonthly':

        /***** Added by Arjun - Start ******/
        if (req.body.widget_type) {

          req.body.interval = 'daily';

          common.getCummulativeDailyData(req, function (error, data) {

            req.body.interval = 'monthly';
            req.body.dailyData = data;

            common.getCummulativeAvg(req, function (err, avgData) {

              res.json(avgData);
              res.end();
              return res;

            });


          });



        }
        else {
          common.getCummulativeMonthlyData(req, function (error, data) {
            res.json(data);
            res.end();
            return res;
          });
        }

        /***** Added by Arjun - End ******/

        break;
      case 'cummulativeyearly': common.getCummulativeYearlyData(req, function (error, data) {
        res.json(data);
        res.end();
        return res;
      });
        break;
      case 'instantaneoustenmin': common.getInstantaneousTenMinutesData(req, function (error, data) {
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
      case 'instantaneousdaily':
      
      common.getInstantaneousDailyData(req, function (error, data) {
        res.json(data);
        res.end();
        return res;
      });
        break;
      case 'instantaneousweekly':

        /***** Added by Arjun - Start ******/
        if (req.body.widget_type) {

          req.body.interval = 'daily';

          common.getInstantaneousDailyData(req, function (error, data) {

            req.body.interval = 'weekly';
            req.body.dailyData = data;

            common.getInstantaneousAvg(req, function (err, avgData) {

              res.json(avgData);
              res.end();
              return res;

            });


          });


        }

        else {
          common.getInstantaneousWeeklyData(req, function (error, data) {
            res.json(data);
            res.end();
            return res;
          });
        }
        /***** Added by Arjun - End ******/

        break;
      case 'instantaneousmonthly':

        /***** Added by Arjun - Start ******/
        if (req.body.widget_type) {

          req.body.interval = 'daily';

          common.getInstantaneousDailyData(req, function (error, data) {

            req.body.interval = 'monthly';
            req.body.dailyData = data;

            common.getInstantaneousAvg(req, function (err, avgData) {

              res.json(avgData);
              res.end();
              return res;

            });

          });

        }
        else {
          common.getInstantaneousMonthlyData(req, function (error, data) {
            res.json(data);
            res.end();
            return res;
          });
        }

        /***** Added by Arjun - End ******/

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
    console.log(exception,'exception');
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

    commonfunction.AllappList(req.session.passport.user, result, 'timeSlice', function (err, data) {
      // if (err) {
      //   res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      //   return res;
      // }
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

// router.post('/communicationSettings', authenticationHelpers.isClientAuth, function (req, res) {
//   analytics.communicationSettings(req.body, function (err) {
//     if (err) {
//       res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
//       return res;
//     }
//     res.json({ "error": false, "reason": "Communication saved successfully." });
//     res.end();
//     return res;
//   });
// });


//Generate excel timeslice change added by Soham start
router.post('/communicationSettings', authenticationHelpers.isClientAuth, function (req, res) {


  try {
    analytics.communicationSettings(req.body, function (err) {
      // analytics.excelReportSettings(req.body, function (err) {
      if (err) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      var CommunicationSettingsObj = req.body.data ? JSON.parse(req.body.data) : {};
      var dbCommunicationSettingsObj = req.body.dbCommunicationSettingsData;
      var promiseAry = [];
      //var deleteExcelFilesObj = {} // req.body.deleteUploadedFileObj?req.body.deleteUploadedFileObj:{};
      var deleteTimeSliceFilesObj = {} // req.body.deleteUploadedFileObj?req.body.deleteUploadedFileObj:{};
      var deletePromiseAry = [];
      if (Object.keys(deleteTimeSliceFilesObj).length > 0) {

        for (var fileIndex in deleteExcelFilesObj) {
          deletePromiseAry.push(deleteTimeSliceFromServer(TimeSliceExcelFilePath + deleteTimeSliceFilesObj[fileIndex]));

        }
      }
      Promise.all(deletePromiseAry).then(function (result) {
        if (Object.keys(deleteTimeSliceFilesObj).length == result.length) {
          if (Object.keys(CommunicationSettingsObj).length > 0) {
            for (var TimeSliceReportIndex in CommunicationSettingsObj) {

              if (CommunicationSettingsObj[TimeSliceReportIndex]['uploadPath'] && (JSON.stringify(dbCommunicationSettingsObj[TimeSliceReportIndex]) != JSON.stringify(CommunicationSettingsObj[TimeSliceReportIndex]))) {
                promiseAry.push(TimeSliceExcel(CommunicationSettingsObj[TimeSliceReportIndex], TimeSliceReportIndex, req.body, req.session.passport.user, 0, 0));
              }
              if (!CommunicationSettingsObj[TimeSliceReportIndex]['uploadPath']) {
                try {
                  promiseAry.push(TimeSliceExcel(CommunicationSettingsObj[TimeSliceReportIndex], TimeSliceReportIndex, req.body, req.session.passport.user, 0, 1));

                } catch (e) {

                }

                var filename = req.body.id;
                filename = filename.replace(/-/g, "");
                if (CommunicationSettingsObj[TimeSliceReportIndex]['filename'] != undefined) {
                  CommunicationSettingsObj[TimeSliceReportIndex]['uploadPath'] = CommunicationSettingsObj[TimeSliceReportIndex]['filename'];
                }
                else {
                  CommunicationSettingsObj[TimeSliceReportIndex]['uploadPath'] = filename + CommunicationSettingsObj[0].frequency + '.xlsx';
                }
              }
            }
          }
          Promise.all(promiseAry).then(function (results) {
            if (results.indexOf(0) > -1) {
              res.json({ "error": true, "reason": "Error: Default excel template not uploaded!" });
              return res;
            }
            req.body.data = JSON.stringify(CommunicationSettingsObj);

            analytics.communicationSettings(req.body, function (err) {

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
  } catch (error) {

  }
});

function TimeSliceExcel(abc, reportSettingObject, data, session, download, newFile) {

  try {
    var parameterName = session.parameters[JSON.parse(data.data)[0].parameter].parameter_name //added by soham  
    // var parameterName =JSON.parse(data.data)[0].parameter
    var frequency = JSON.parse(data.data)[0].frequency //added by soham for generating shifts data
    var timezone = 'Asia/Kolkata';
    var timezoneOffset = '+0530';
    var companyName = session.company_name // added by soham
    var timeSliceDetails = [];
    var shiftArray = Object.values(data.excelReportdata[0]); //added by soham for generating shifts
    var workbook
    // var workbook = XLSX.utils.book_new(); // declared globally
    // var workbook = new Excel.Workbook();  //declared globally



    if (frequency == "EOS") {
      workbook = XLSX.utils.book_new();
      let columnInteger = 2;
      var columnMergeChar = getCellCharacterCodeFromInteger(columnInteger);
      // var workbook = XLSX.utils.book_new(); 
      var worksheet = XLSX.utils.aoa_to_sheet([[companyName]]);
      XLSX.utils.sheet_set_range_style(worksheet, 'A1:' + columnMergeChar + '1', { bold: true, sz: 14, name: "Cambria", alignment: { vertical: "middle", horizontal: "center" } });
      XLSX.utils.sheet_add_aoa(worksheet, [["Time Slice Report : ", 'End of Shift'], ['Time Slice : ', ''], ["Report Generation Date : ", momentTimezone().tz(timezone).format('DD-MM-YYYY')], ['Parameter : ', parameterName]], { origin: "A3" });
      XLSX.utils.sheet_set_range_style(worksheet, "A3:A6", { bold: true, name: "Cambria", sz: 12, alignment: { vertical: "middle", horizontal: "center" } });
      XLSX.utils.sheet_add_aoa(worksheet, [['Node', '']], { origin: "A8" });
      XLSX.utils.sheet_set_range_style(worksheet, 'A8:' + columnMergeChar + '8', { bold: true, name: "Cambria", sz: 12, alignment: { vertical: "middle", horizontal: "center" }, top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } });

      var merges = worksheet['!merges'] = [];
      merges.push({ s: 'A1', e: 'B1' });
      var rows = [];
      var index = 0;
      data.excelReportdata[1].forEach(element => {
        if ('undefined' == typeof rows[index]) {
          rows[index] = ['', '-'];
        }
        rows[index][0] = data.nodeNameObj[element].node_name;
        index++;
      });
      var columnInteger1 = 2, rowCellNo = 9, rowChar1 = '', lastRowInteger = '';
      for (i = 0; i < rows.length; i++) {
        rowChar1 = getCellCharacterCodeFromInteger(columnInteger);
        XLSX.utils.sheet_add_aoa(worksheet, [rows[i]], { origin: "A" + rowCellNo });
        XLSX.utils.sheet_set_range_style(worksheet, 'A' + rowCellNo + ':' + rowChar1 + rowCellNo, { sz: 11, name: "Cambria", alignment: { vertical: "middle", horizontal: "center" }, top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } });
        rowCellNo++;
        lastRowInteger = rowCellNo;

      }
      var columnMergeChar1 = getCellCharacterCodeFromInteger(columnInteger1);
      var totalRowCount = lastRowInteger + 2;
      // merges.push({ s: 'A' + totalRowCount, e: columnMergeChar1 + totalRowCount });
      XLSX.utils.sheet_add_aoa(worksheet, [["** Note : This report is based on 15 mins data."]], { origin: "A'" + totalRowCount + "'" });
      XLSX.utils.sheet_set_range_style(worksheet, 'A' + totalRowCount, { bold: true, sz: 10, color: { rgb: 'FF0000' }, name: "Cambria", alignment: { vertical: "middle", horizontal: "left" } });

      // XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
      // var tempFilePath = tempfile('.xlsx');
      // XLSX.writeFile(workbook, tempFilePath, { type: "file", bookType: 'xlsx', cellStyles: true });
    }
    else {

      // workbook = new Excel.Workbook();
      var promiseAry = [];
      var columns = [[], [], []];
      columns[0][0] = 'Node';
      columns[1][0] = '';
      columns[2][0] = '';
      var columnCount = 1;
      shiftArray.forEach(function (eodReportObj) {
        columns[0][columnCount] = eodReportObj['shiftName'];
        columns[1][columnCount] = momentTimezone.tz(timezone).format('DD-MM-YYYY') + ' ' + eodReportObj.fromTime + ' to ' + momentTimezone.tz(timezone).format('DD-MM-YYYY') + ' ' + eodReportObj.toTime;     //added by soham

        columns[2][columnCount++] = '-';
        //  eodReportObj['nodeId'] = requestBodyParameters['nodeUniqueId'];
        // var request = { body: eodReportObj, fromDifferentApi: 'cron', companyId: timeSliceDetails.company_id };
        // promiseAry.push(getReadingData(request));
      });

      // Promise.all(promiseAry).then(function (readingsData) {

      columns[0][columnCount] = 'Total';
      columns[1][columnCount] = '';
      columns[2][columnCount] = '-';

      //processAndSendEODMail(readingsData, eodReportSettingsObject, companyName, parameterName, requestBodyParameters['nodesData'], EODEmailAry, columns);
      // });




      // var workbook = new Excel.Workbook();
      workbook = new Excel.Workbook();

      var worksheet = workbook.addWorksheet('Time Slice Report');
      var columnCount = columns[2].length;
      var totalIndex = columnCount - 1;
      var mergeCellIndex = String.fromCharCode(65 + totalIndex);    //65 declared as ASCII value 

      worksheet.mergeCells('A1:' + mergeCellIndex + '1');
      worksheet.getCell('A1:' + mergeCellIndex + '1').value = companyName;
      worksheet.getCell('A1:' + mergeCellIndex + '1').font = { bold: true, size: 14 };
      worksheet.getCell('A1:' + mergeCellIndex + '1').alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.addRow(['', '']);
      worksheet.addRow(['Time Slice Report : ', 'End of Day']);
      worksheet.getCell('A3').font = { bold: true };
      worksheet.addRow(['Report Generation Date : ', momentTimezone().tz(timezone).format('DD-MM-YYYY')]);
      worksheet.getCell('A4').font = { bold: true };
      worksheet.addRow(['Parameter : ', parameterName]);
      worksheet.getCell('A5').font = { bold: true };
      worksheet.addRow(['', '']);
      worksheet.addRow(columns[0]);
      worksheet.getRow(7).font = { bold: true };
      worksheet.addRow(columns[1]);
      worksheet.getRow(8).font = { bold: true };
      worksheet.mergeCells('A7:A8');
      worksheet.getCell('A7:A8').alignment = { vertical: 'middle' };
      worksheet.mergeCells(mergeCellIndex + '7:' + mergeCellIndex + '8');
      worksheet.getCell(mergeCellIndex + '7:' + mergeCellIndex + '8').alignment = { vertical: 'middle' };
      // var rows = [];
      // if (0 == rows.length) {
      //   var index = 0;
      //   for (var nodeUniqueId in objectNodes) {
      //     if ('undefined' == typeof rows[index]) {
      //       var newTimeSliceDataAry = columns[2].slice();
      //       rows[index] = newTimeSliceDataAry;
      //     }
      //     rows[index][0] = objectNodes[nodeUniqueId].node_name;
      //     index++;
      //   }
      // }

      var rows = [];
      var index = 0;
      data.excelReportdata[1].forEach(element => {
        if ('undefined' == typeof rows[index]) {
          rows[index] = ['', '-'];
        }
        rows[index][0] = data.nodeNameObj[element].node_name;
        index++;
      });


      worksheet.addRows(rows);
      var cellIndex = 7;
      var char = 65;
      var cellName = '';
      for (var i = 1; i <= rows.length + 2; i++) {
        char = 65;
        for (var j = 1; j <= columnCount; j++) {
          cellName = String.fromCharCode(char) + cellIndex;
          char++;
          worksheet.getCell(cellName).border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        }
        cellIndex++;
      }

      var totalRowCount = cellIndex + 2;
      worksheet.mergeCells('A' + totalRowCount + ':D' + totalRowCount);
      worksheet.getCell('A' + totalRowCount + ':D' + totalRowCount).value = '** Note : This report is based on 15 mins data.';
      worksheet.getRow(totalRowCount).font = { size: 10, color: { argb: 'FFFF0000' }, bold: true };

    }




    var filename = data.id;
    filename = filename.replace(/-/g, "");

    if (newFile) {

      try {
        if (!download) { // default download
          if (frequency == "EOS") {
            filename = TimeSliceExcelFilePath + filename + 'EOS.xlsx';
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Time Slice Report');
            XLSX.writeFile(workbook, filename, { type: "array", bookType: 'xlsx', cellStyles: true });
          }
          else {
            filename = TimeSliceExcelFilePath + filename + 'EOD.xlsx';
            workbook.xlsx.writeFile(filename).then(function () {

            });

          }




        }
      } catch (error) {

      }



      if (download) {
        if (frequency == "EOS") {
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Time Slice Report');
          var wbout = XLSX.write(workbook, { type: "array", bookType: 'xlsx', cellStyles: true });
          const buf2 = Buffer.from(wbout);
          return buf2;
        }
        else {
          const buf2 = workbook.xlsx.writeBuffer();// Buffer.from(buffer);
          return buf2
        }







        // XLSX.utils.book_append_sheet(workbook, worksheet, 'Time Slice Excel Report');
        // var wbout = XLSX.write(workbook, { type: "array", bookType: 'xlsx', cellStyles: true });
        // const buf2 = Buffer.from(wbout);
        // return resolve(buf2);
      }
    }
    else {
      var workbookOriginal = XLSX.readFile(filename, { cellStyles: true });
      delete workbookOriginal.Sheets['Time Slice Report'];
      workbookOriginal.SheetNames.splice(0, 1);
      // worksheet = writeTimeSliceExcelFile(worksheet, filename, TimeSliceReportData, TimeSliceReportIndex, data, session, download);
      workbookOriginal.Sheets['Time Slice Report'] = worksheet;
      workbookOriginal.SheetNames.splice(0, 0, 'Time Slice Report');
      if (!download) { //existing file and existing data
        return resolve(1);
      }

      if (download) {
        // workbook.xlsx.writeFile(tempFilePath).then(function () {

        //    });

        var wbout = XLSX.write(workbook, { type: "array", bookType: 'xlsx', cellStyles: true });

        // XLSX.utils.book_append_sheet(workbook, worksheet, 'Time Slice Report');
        // var wbout = XLSX.write(workbook, { type: "array", bookType: 'xlsx', cellStyles: true });
        const buf2 = Buffer.from(wbout);
        return resolve(buf2);
      }
    }
    // } catch (err) {
    //   return reject(0);
    // }
    // }



  } catch (error) {

  }
}
//Generate excel timeslice change added by Soham end

// change by Soham start
router.post('/uploadTimeSlice', authenticationHelpers.isClientAuth, function (req, res) {     //added

  var upload = multer({
    storage: TimeSliceStorage
  }).single('xlsx')

  upload(req, res, function (err) {



    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, 'reason': req.file.filename });
    res.end();
    return res;
  })


});

router.post('/getCommuncationSetting', authenticationHelpers.isClientAuth, function (req, res) {
  analytics.getCommunicationSettings(req.body.id, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "res": result });
    res.end();
    return res;
  });
});

router.post('/saveCommuncationSetting', authenticationHelpers.isClientAuth, function (req, res) {
  analytics.communicationSettings(req.body, function (err) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": 'Save' });
    res.end();
    return res;
  });
});

router.post('/downloadDefaultTimeSliceTemplate', authenticationHelpers.isClientAuth, function (req, res) {

  Promise.all([TimeSliceExcel(req.body.data, req.body.index, req.body, req.session.passport.user, 1, 1)]).then(function (results) {
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
// change by Soham end

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

//create by kaveri for scadda widgets

router.post('/getScaddaListForWidgets', authenticationHelpers.isClientAuth, function (req, res, next) {
  analytics.getScaddaListForWidgets(req.body.id, function (err, result) {
    // console.log(req.body,'req.body.id');
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    if (!result) {
      res.json({ "error": true, "reason": "No records found." });
      return res;
    }
    commonfunction.AllappList(req.session.passport.user, result, 'scada', function (err, data) {
      // if (err) {
      //   res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      //   return res;
      // }
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
    commonfunction.AllappList(req.session.passport.user, result, 'scada', function (err, data) {
      // if (err) {
      //   res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      //   return res;
      // }
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

router.post('/scadaEquationSettings', authenticationHelpers.isClientAuth, function (req, res) {
  analytics.submitEquationSettings(req.body, function (err) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Equation setting saved successfully." });
    res.end();
    return res;
  })
})

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


    commonfunction.AllappList(req.session.passport.user, result, 'excelReport', function (err, data) {

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
  var company_name = session['company_name'];
  return new Promise((resolve, reject) => {
    if ('undefined' == typeof excelReportData) {
      return reject(0);
    }
    try {
      var filename = data.id + excelReportIndex;
      filename = filename.replace(/-/g, "");
      filename = excelFilePath + filename + '.xlsx';
      var workbook = XLSX.utils.book_new();
      var worksheet = XLSX.utils.aoa_to_sheet([[company_name]]);
      XLSX.utils.sheet_set_range_style(worksheet, 'A1:Z1', { bold: true, sz: 15, name: "Cambria", alignment: { vertical: "center", horizontal: "center" } });

      if (newFile) {
        worksheet = writeExcelFile(worksheet, filename, excelReportData, excelReportIndex, data, session, download);

        if (!download) { // deafult download
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Excel Report');
          XLSX.writeFile(workbook, filename, { type: "array", bookType: 'xlsx', cellStyles: true });
          return resolve(1);
        }
        if (download) { // new app
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Excel Report');
          var wbout = XLSX.write(workbook, { type: "array", bookType: 'xlsx', cellStyles: true });
          const buf2 = Buffer.from(wbout);
          return resolve(buf2);
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
      // console.log(err)
      return reject(0);
    }
  });
}

function writeExcelFile(worksheet, filename, excelReportData, excelReportIndex, data, session, download) {
  var intervalWiseObj = {};
  var multipleIntervalAry = [];
  var rowAry = [];
  var nodeAry = [];
  var merges = worksheet['!merges'] = [];
  merges.push({ s: 'A1', e: 'Z1' });
  /**add fifteen interval by Mayur */
  if (excelReportData['interval'] == 'fifteen') {
    var fromtime = excelReportData['fromTime'];

    var yesterday = momentTimezone.tz(session['timezone']).subtract(1, 'd').format('YYYY-MM-DD');
    var time = momentTimezone(fromtime, 'HH:mm').format('HH:mm');
    for (var fifteenCount = 0; fifteenCount < 96; fifteenCount++) {
      var startTime = momentTimezone.tz(session['timezone']).startOf('month').add(fifteenCount * 15, 'minutes').format(time);
      var endTime = momentTimezone(startTime, 'HH:mm').add(15, 'minutes').format('HH:mm');
      endTime = endTime == '00:00' ? '23:59' : endTime;
      var dateString = yesterday + ' ' + startTime + ' - ' + endTime;
      var singleInterval = [];
      singleInterval.push(dateString);
      multipleIntervalAry.push(singleInterval);
      intervalWiseObj[fifteenCount] = dateString;

      if (endTime == '23:59') {
        yesterday = momentTimezone.tz(session['timezone']).format('DD-MM-YYYY');
      }
      time = endTime == '23:59' ? '00:00' : endTime;


    }
    // for (var fifteenCount = 0; fifteenCount < 96; fifteenCount++) {
    //     var startTime = momentTimezone.tz(session['timezone']).startOf('month').add(fifteenCount * 15, 'minutes').format('HH:mm');
    //     var endTime = momentTimezone(startTime, 'HH:mm').add(15, 'minutes').format('HH:mm');
    //     endTime = endTime == '00:00' ? '23:59' : endTime;
    //     var dateString = yesterday + ' ' + startTime + ' - ' + endTime;
    //     var singleInterval = [];
    //     singleInterval.push(dateString);
    //     multipleIntervalAry.push(singleInterval);
    //     intervalWiseObj[fifteenCount] = dateString;
    // }
  }
  if (excelReportData['interval'] == 'hourly') {
    var fromtime = excelReportData['fromTime'];

    //  var yesterday = momentTimezone.tz(session['timezone']).subtract(1, 'd').format('YYYY-MM-DD');
    var yesterday = momentTimezone.tz(session['timezone']).subtract(1, 'd').format('DD-MM-YYYY');

    // for (var hour = 0; hour < 24; hour++) {
    //     var startTime = momentTimezone.tz(session['timezone']).startOf('month').add(hour, 'hour').format('HH:mm');
    //     var endTime = momentTimezone(startTime, 'HH:mm').add(60, 'minutes').format('HH:mm');
    //     endTime = endTime == '00:00' ? '23:59' : endTime;
    //     var dateString = yesterday + ' ' + startTime + ' - ' + endTime;
    //     var singleInterval = [];
    //     singleInterval.push(dateString);
    //     multipleIntervalAry.push(singleInterval);

    //     intervalWiseObj[hour] = dateString;
    //     console.log(intervalWiseObj[hour] ,'intervalWiseObj[hour] ')
    // }
    var time = momentTimezone(fromtime, 'HH:mm').format('HH:mm');

    for (var hour = 0; hour < 24; hour++) {

      var startTime = momentTimezone.tz(session['timezone']).startOf('month').add(hour, 'hour').format(time);
      var endTime = momentTimezone(startTime, 'HH:mm').add(60, 'minutes').format('HH:mm');

      endTime = endTime == '00:00' ? '23:59' : endTime;
      var dateString = yesterday + ' ' + startTime + ' - ' + endTime;
      var singleInterval = [];
      singleInterval.push(dateString);
      multipleIntervalAry.push(singleInterval);

      intervalWiseObj[hour] = dateString;

      if (endTime == '23:59') {

        yesterday = momentTimezone.tz(session['timezone']).format('DD-MM-YYYY');
        //  var yesterday = momentTimezone.tz(session['timezone']).subtract(1, 'd').format('YYYY-MM-DD');
        //
      }
      time = endTime == '23:59' ? '00:00' : endTime;
    }


  }
  if (excelReportData['interval'] == 'daily') {
    var fromtime = excelReportData['fromTime'];
    var time = momentTimezone(fromtime, 'HH:mm').format('HH:mm');

    var daysInMonth = momentTimezone.tz(session['timezone']).daysInMonth();
    for (var dayCount = 0; dayCount < daysInMonth; dayCount++) {
      var monthDate = momentTimezone.tz(session['timezone']).startOf('month').add(dayCount, 'd').format('DD-MM-YYYY');
      var singleInterval = [];
      singleInterval.push(monthDate + ' ' + time + ' - ' + time);
      multipleIntervalAry.push(singleInterval);
      intervalWiseObj[dayCount] = monthDate + ' ' + time + ' - ' + time;
    }
  }
  if (excelReportData['interval'] == 'weekly') {
    var currentYear = momentTimezone().tz(session['timezone']).startOf('isoweek').format('YYYY');
    for (var weekNumber = 0; weekNumber < 53; weekNumber++) {
      var startDateOfWeek = momentTimezone(currentYear, 'YYYY').add(weekNumber, 'week').startOf('isoweek').format('DD-MM-YYYY');
      var endDateOfWeek = momentTimezone(currentYear, 'YYYY').add(weekNumber, 'week').endOf('isoweek').format('DD-MM-YYYY');
      var singleInterval = [];
      singleInterval.push(startDateOfWeek + ' - ' + endDateOfWeek);
      multipleIntervalAry.push(singleInterval);
      intervalWiseObj[weekNumber] = startDateOfWeek + ' - ' + endDateOfWeek;
    }
  }
  if (excelReportData['interval'] == 'monthly') {
    var startDate = momentTimezone().startOf('year').tz(session['timezone']).format('YYYY-MM-DD 00:00:00' + session['timezone_offset']);
    for (var monthCount = 0; monthCount < 12; monthCount++) {
      var singleInterval = [];
      var month = momentTimezone(startDate).tz(session['timezone']).add(monthCount, 'month').format('MMM YYYY');
      singleInterval.push(month);
      multipleIntervalAry.push(singleInterval);
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

  var intervalAry = Object.values(intervalWiseObj);
  var parameterAry = [];
  var valueAry = [];
  var dateStartCharInteger = 2, parameterCharInteger = 2, valuesCharInterger = 2, dateStartChar = '', valuesStartChar = '', dateMergeCellIndex = '';

  /** As per selection of transpose i.e. vertically */
  if (excelReportData['transpose'] == true) {
    XLSX.utils.sheet_add_aoa(worksheet, [['Node : Secondary Name']], { origin: "A3" });
    XLSX.utils.sheet_add_aoa(worksheet, [['Parameter']], { origin: "B3" });
    XLSX.utils.sheet_add_aoa(worksheet, [['Value']], { origin: "C3" });
    XLSX.utils.sheet_set_range_style(worksheet, "A3:C3", { bold: true, sz: 11, name: "Cambria", alignment: { vertical: "center", horizontal: "center" } });
    var parameterObj = {};
    var paramID = []
    for (var parameterValueIndex in parameterValueObj) {
      if (parameterValueObj[parameterValueIndex]['parameter']) {
        parameterValueObj[parameterValueIndex]['parameter'].forEach((parameterId, paramIndex) => {
          paramID.push(parameterId);
          parameterObj[session['parameters'][parameterId]['parameter_name']] = parameterValueObj[parameterValueIndex].values;
          parameterAry.push(session['parameters'][parameterId]['parameter_name']);
          parameterCharInteger = parameterCharInteger + parameterValueObj[parameterValueIndex]['valuesCnt'];
          parameterValueObj[parameterValueIndex]['values'].forEach((value, valuesIndex) => {
            valueAry.push(valuesObj[parameterValueIndex][value]);
            valuesStartChar = getCellCharacterCodeFromInteger(valuesCharInterger);
            valuesCharInterger++;
          });
        });
      }
    }
    var nodeUniqueId = [];
    excelReportData['node'].forEach((node, index) => {
      if ('undefined' != typeof nodesObj[node])
        nodeAry.push(([nodesObj[node]['nodeName'] + (nodesObj[node]['secondaryName'] ? ' : ' + nodesObj[node]['secondaryName'] : '')]));
      nodeUniqueId.push(nodesObj[node]['nodeUniqueId'])
    });
    var intCharacter = getCellCharacterCodeFromInteger(intervalAry.length + 3);
    XLSX.utils.sheet_add_aoa(worksheet, [intervalAry], { origin: 'D3' });
    XLSX.utils.sheet_set_range_style(worksheet, 'D3' + ':' + intCharacter + '3', { bold: true, sz: 11, name: "Cambria", alignment: { vertical: "center", horizontal: "center" } });

    /** row array for selected node in report */
    parameterAry1 = [];
    // var parameterCount = 2, intervalCount = 4, parameterCellNo = 4, valueCount = 3; valueCountChar = '', valueCountChar1 = '';
    var parameterCount = 2, valueCount = 3; valueCountChar = '', valueCountChar1 = '';
    var rowCellNo = 4, valueCellNo = 4, nodeCount = 1, nodeCellNo = 4, parameterCellCount1 = 4, testCount = 4;
    parameterAry1.push(parameterAry);
    for (i = 0; i < nodeAry.length; i++) {
      var nodeCharacter = getCellCharacterCodeFromInteger(nodeCount);
      for (var j = 0; j < parameterAry.length; j++) {
        parameterCountChar = getCellCharacterCodeFromInteger(parameterCount);
        var parameterCount1 = parameterObj[parameterAry[j]].length;
        var parameterCellCount1 = parameterCount1 + (rowCellNo - 1);
        merges.push({ s: parameterCountChar + rowCellNo, e: parameterCountChar + parameterCellCount1 });
        /* **for changed to show caption name in excel sheet start*/
        if (JSON.parse(session['nodeObj'][nodeUniqueId[i]])['caption'][paramID[j]] != undefined) {
          XLSX.utils.sheet_add_aoa(worksheet, [[JSON.parse(session['nodeObj'][nodeUniqueId[i]]).caption[paramID[j]]]], { origin: parameterCountChar + rowCellNo });
        } else {
          XLSX.utils.sheet_add_aoa(worksheet, [[parameterAry[j]]], { origin: parameterCountChar + rowCellNo });
        }
        /* **for changed to show caption name in excel sheet end*/
        // XLSX.utils.sheet_add_aoa(worksheet, [[parameterAry[j]]], { origin: parameterCountChar + rowCellNo });

        XLSX.utils.sheet_set_range_style(worksheet, parameterCountChar + rowCellNo + ':' + parameterCountChar + parameterCellCount1, { bold: true, sz: 11, name: "Cambria", alignment: { vertical: "center", horizontal: "center" } });
        var rowCellNo = rowCellNo + parameterCount1;
      }

      for (k = 0; k < valueAry.length; k++) {
        var valueCharacter = getCellCharacterCodeFromInteger(valueCount);
        XLSX.utils.sheet_add_aoa(worksheet, [[valueAry[k]]], { origin: valueCharacter + valueCellNo });
        XLSX.utils.sheet_set_range_style(worksheet, valueCharacter + valueCellNo, { bold: true, sz: 11, name: "Cambria", alignment: { vertical: "center", horizontal: "center" } });
        //XLSX.utils.sheet_set_range_style(worksheet, valueCharacter+valueCellNo+':'+intCharacter+valueCellNo, { sz:11, name: "Cambria", alignment:{vertical: "center",horizontal: "center"}});
        valueCellNo++;
      }
      var nodeCellCount1 = rowCellNo - 1;
      merges.push({ s: nodeCharacter + nodeCellNo, e: nodeCharacter + nodeCellCount1 });
      XLSX.utils.sheet_add_aoa(worksheet, [nodeAry[i]], { origin: nodeCharacter + nodeCellNo });
      XLSX.utils.sheet_set_range_style(worksheet, nodeCharacter + nodeCellNo + ':' + nodeCharacter + nodeCellCount1, { bold: true, sz: 11, name: "Cambria", alignment: { vertical: "center", horizontal: "center" } });
      nodeCellNo = rowCellNo;
    }
  }

  /** As per selection of transpose i.e. horizontally */
  if (excelReportData['transpose'] == false) {

    XLSX.utils.sheet_add_aoa(worksheet, [['Node : Secondary Name']], { origin: "A3" });
    XLSX.utils.sheet_set_range_style(worksheet, "A3:A5", { bold: true, name: "Cambria", sz: 11, alignment: { vertical: "center", horizontal: "center" } });
    merges.push({ s: 'A3', e: 'A5' });
    var parameterObj = {};
    for (var parameterValueIndex in parameterValueObj) {
      if (parameterValueObj[parameterValueIndex]['parameter']) {
        parameterValueObj[parameterValueIndex]['parameter'].forEach((parameterId, paramIndex) => {
          if (data.paramName) {
            parameterObj[data.paramName[parameterId].toString()] = parameterValueObj[parameterValueIndex].values;//captio param object
            parameterAry.push(data.paramName[parameterId].toString());//caption param ary
          } else {
            parameterObj[session['parameters'][parameterId]['parameter_name']] = parameterValueObj[parameterValueIndex].values;
            parameterAry.push(session['parameters'][parameterId]['parameter_name']);
          }
          parameterCharInteger = parameterCharInteger + parameterValueObj[parameterValueIndex]['valuesCnt'];
          parameterValueObj[parameterValueIndex]['values'].forEach((value, valuesIndex) => {
            valuesStartChar = getCellCharacterCodeFromInteger(valuesCharInterger);
            valuesCharInterger++;
          });
        });
      }

    }
    excelReportData['node'].forEach((node, index) => {
      if ('undefined' != typeof nodesObj[node])
        rowAry.push(([nodesObj[node]['nodeName'] + (nodesObj[node]['secondaryName'] ? ' : ' + nodesObj[node]['secondaryName'] : '')]));
    });

    var valueAry = [];
    var valueCount = 2, intervalCount = 2, rowCellNo = 6, valueCountChar = '', valueCountChar1 = '';

    /** multipleIntervalAry for interval ary i.e hourly, monthly, yearly, weekly */
    for (var i = 0; i < multipleIntervalAry.length; i++) {
      var mergeChar = getCellCharacterCodeFromInteger(intervalCount);
      for (var j = 0; j < parameterAry.length; j++) {
        valueAry.push(parameterObj[parameterAry[j]]);
        valueCountChar = getCellCharacterCodeFromInteger(valueCount);
        var valueCount1 = parameterObj[parameterAry[j]].length + valueCount;
        valueCountChar1 = getCellCharacterCodeFromInteger(valueCount1 - 1);
        merges.push({ s: valueCountChar + '4', e: valueCountChar1 + '4' });
        XLSX.utils.sheet_add_aoa(worksheet, [[parameterAry[j]]], { origin: valueCountChar + '4' });
        XLSX.utils.sheet_set_range_style(worksheet, valueCountChar + '4' + ':' + valueCountChar1 + '4', { bold: true, name: "Cambria", sz: 11, alignment: { vertical: "middle", horizontal: "center" } });
        valueCount = valueCount1;
      }
      var mergeChar1 = getCellCharacterCodeFromInteger(valueCount - 1);
      merges.push({ s: mergeChar + '3', e: mergeChar1 + '3' });
      XLSX.utils.sheet_add_aoa(worksheet, [[intervalAry[i]]], { origin: mergeChar + '3' });
      XLSX.utils.sheet_set_range_style(worksheet, mergeChar + '3' + ':' + mergeChar1 + '3', { bold: true, name: "Cambria", sz: 11, alignment: { vertical: "middle", horizontal: "center" } });
      intervalCount = valueCount;
    }

    /** this use for array of array to single array ex.([[],[]] = ['','']) */
    valueAry = [].concat.apply([], valueAry);
    var valueCharacter = getCellCharacterCodeFromInteger(valueAry.length + 1);
    XLSX.utils.sheet_add_aoa(worksheet, [valueAry], { origin: 'B5' });
    XLSX.utils.sheet_set_range_style(worksheet, 'B5' + ':' + valueCharacter + '5', { bold: true, name: "Cambria", sz: 11, alignment: { vertical: "middle", horizontal: "center" } });

    /** row array for selected node in report */
    for (k = 0; k < rowAry.length; k++) {
      XLSX.utils.sheet_add_aoa(worksheet, [rowAry[k]], { origin: "A'" + rowCellNo + "'" });
      XLSX.utils.sheet_set_range_style(worksheet, 'A' + rowCellNo, { sz: 11, name: "Cambria", alignment: { vertical: "middle", horizontal: "center" } });
      //XLSX.utils.sheet_set_range_style(worksheet,'A'+rowCellNo+':'+valueCharacter+rowCellNo, { sz:11, name: "Cambria", alignment:{vertical: "center",horizontal: "center"}});
      rowCellNo++;
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